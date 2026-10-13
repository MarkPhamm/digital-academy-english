"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { Course } from "@/data/courses";
import { AnimatedPlanetImage } from "./AnimatedPlanetImage";
import { CourseRibbon } from "./CourseRibbon";
import { STAGE_WIDTH } from "./DesignStage";
import { RivePlanet } from "./RivePlanet";

const TRANSITION_MS = 400;

// Vùng carousel bắt đầu ở y = 132 của khung 1440×900 (frame "Vùng chọn môn — quỹ đạo").
const AREA_TOP = 132;
const AREA_HEIGHT = 651 - AREA_TOP; // tới mép trên dải "Lịch lớp"

// Vị trí theo Figma (tâm hành tinh, toạ độ khung): giữa 420px @ (720,382); trái/phải 240px @ (301,403)/(1123,403).
const CENTER = { x: 720, y: 382, size: 420 };
const SIDE = { dxLeft: 720 - 301, dxRight: 1123 - 720, y: 403, size: 240, opacity: 0.6 };

// Các hành tinh chạy trên một cung elip: góc φ tỉ lệ với độ lệch so với khóa đang chọn.
// PHI chọn sao cho bán kính ngang ≈ 1000px, cùng độ cong với dải sáng quỹ đạo.
const PHI = 0.42;
const RX_LEFT = SIDE.dxLeft / Math.sin(PHI);
const RX_RIGHT = SIDE.dxRight / Math.sin(PHI);
const RY = (SIDE.y - CENTER.y) / (1 - Math.cos(PHI));

// Kéo chuột / vuốt cảm ứng: hành tinh bám theo tay, kéo 1 khoảng bằng từ tâm ra hành tinh bên cạnh = 1 hành tinh.
const DRAG_PX_PER_SLOT = (SIDE.dxLeft + SIDE.dxRight) / 2;
// Dịch chưa quá ngưỡng này (px trên khung 1440×900) thì vẫn là click, chưa phải kéo.
const DRAG_START_PX = 6;
// Thả tay khi đã kéo/vuốt ≥ 10% khoảng cách (~40px) thì sang hành tinh kế tiếp, chưa tới thì trở về.
const COMMIT_FRACTION = 0.1;
// Trackpad 2 ngón vuốt ngang: hành tinh bám theo ngón tay (300px cuộn = 1 hành tinh). Vuốt được WHEEL_COMMIT_FRACTION
// là chuyển hẳn sang hành tinh kế tiếp ngay, không chờ hết quán tính (có thể kéo dài cả giây); phần còn lại của cú vuốt
// bị bỏ qua. Cử chỉ kết thúc khi không còn sự kiện wheel trong WHEEL_IDLE_MS.
const WHEEL_PX_PER_SLOT = 300;
const WHEEL_COMMIT_FRACTION = 0.35;
const WHEEL_IDLE_MS = 120;
const WHEEL_LINE_PX = 16;
// Sau khi đã chuyển, lực vuốt (|deltaX|) giảm xuống dưới 30% đỉnh rồi tăng gấp 3 trở lại = người dùng vuốt tiếp lần nữa.
const WHEEL_REARM_DECAY = 0.3;
const WHEEL_REARM_RISE = 3;
const WHEEL_REARM_MIN_PX = 4;
// Hằng số thời gian (ms) làm mượt vị trí khi bám theo trackpad — lọc các bước nhảy không đều giữa các sự kiện wheel.
const FOLLOW_TAU_MS = 45;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
// Mốc thời gian của requestAnimationFrame là lúc bắt đầu khung hình — có thể sớm hơn performance.now() trong
// handler đã kích hoạt hoạt ảnh. Bắt đầu tính giờ từ khung hình đầu tiên (coi như đã qua 1 khung) để không bị âm.
const FRAME_MS = 1000 / 60;

/** Hình học của một hành tinh ở độ lệch `offset` (0 = giữa, ±1 = hai bên, ±2 = ngoài khung, mờ hẳn). */
function orbitSlot(offset: number) {
  const a = Math.abs(offset);
  const phi = a * PHI;
  const rx = offset < 0 ? RX_LEFT : RX_RIGHT;
  const x = CENTER.x + Math.sign(offset) * rx * Math.sin(phi);
  const y = CENTER.y + RY * (1 - Math.cos(phi));
  const size = a <= 1 ? CENTER.size - (CENTER.size - SIDE.size) * a : Math.max(0, SIDE.size - 100 * (a - 1));
  const opacity = a <= 1 ? 1 - (1 - SIDE.opacity) * a : Math.max(0, SIDE.opacity * (2 - a));
  return { x, y, size, opacity, z: Math.round(100 - a * 10) };
}

/** Độ lệch vòng tròn của phần tử `index` so với vị trí `position`, trong khoảng [-n/2, n/2). */
function circularOffset(index: number, position: number, n: number) {
  const raw = (((index - position) % n) + n) % n;
  return raw >= n / 2 ? raw - n : raw;
}

const mod = (value: number, n: number) => ((value % n) + n) % n;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function PlanetCarousel({ courses }: { courses: Course[] }) {
  const n = courses.length;
  // `target` là chỉ số không quấn vòng (…, -1, 0, 1, …) để hoạt ảnh luôn đi đúng chiều khi quay vòng ở 2 đầu.
  // `position` là vị trí đang hiển thị: số lẻ khi đang trượt hoặc đang kéo.
  const [target, setTarget] = useState(0);
  const [position, setPosition] = useState(0);
  const [dragging, setDragging] = useState(false);
  const targetRef = useRef(0);
  const positionRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  // Đích mà vị trí đang đuổi theo (khi bám theo trackpad); null khi không bám.
  const followGoalRef = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startPosition: number;
    startTarget: number;
    /** Tỉ lệ px màn hình / px khung 1440×900 (khung được scale theo viewport). */
    scale: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const activeIndex = mod(target, n);
  const activeCourse = courses[activeIndex];

  // Bấm hành tinh giữa (hoặc ruy-băng tên khóa) → vào game "Vũ trụ Tri thức"; khóa chưa có game thì báo nhẹ.
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const openCourse = useCallback(
    (course: Course) => {
      if (course.worldSlug) router.push(`/world/${course.worldSlug}`);
      else setToast("Hành tinh này sắp mở, em quay lại sau nhé! 🚀");
    },
    [router],
  );
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (activeCourse.worldSlug) router.prefetch(`/world/${activeCourse.worldSlug}`);
  }, [activeCourse.worldSlug, router]);

  const stopAnimation = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    followGoalRef.current = null;
  }, []);

  /** Đặt vị trí ngay lập tức (khi đang kéo / vuốt). */
  const moveTo = useCallback(
    (next: number) => {
      stopAnimation();
      positionRef.current = next;
      setPosition(next);
    },
    [stopAnimation],
  );

  /** Cho vị trí đuổi theo `goal` mỗi khung hình (giảm dần theo hàm mũ) thay vì nhảy theo từng sự kiện. */
  const followTo = useCallback(
    (goal: number) => {
      if (followGoalRef.current !== null) {
        followGoalRef.current = goal;
        return;
      }
      if (prefersReducedMotion()) {
        moveTo(goal);
        return;
      }
      stopAnimation();
      followGoalRef.current = goal;
      let last: number | null = null;
      const tick = (now: number) => {
        const current = followGoalRef.current;
        if (current === null) return;
        const elapsed = last === null ? FRAME_MS : Math.max(0, now - last);
        const alpha = 1 - Math.exp(-elapsed / FOLLOW_TAU_MS);
        last = now;
        const from = positionRef.current;
        const next = Math.abs(current - from) < 0.001 ? current : from + (current - from) * alpha;
        positionRef.current = next;
        setPosition(next);
        if (next === current) {
          frameRef.current = null;
          followGoalRef.current = null;
        } else {
          frameRef.current = requestAnimationFrame(tick);
        }
      };
      frameRef.current = requestAnimationFrame(tick);
    },
    [stopAnimation, moveTo],
  );

  /** Chọn khóa `to` và trượt từ vị trí hiện tại về đó theo quỹ đạo. */
  const settle = useCallback(
    (to: number) => {
      stopAnimation();
      targetRef.current = to;
      setTarget(to);
      const from = positionRef.current;
      if (from === to) return;
      if (prefersReducedMotion()) {
        moveTo(to);
        return;
      }
      let start: number | null = null;
      const tick = (now: number) => {
        start ??= now - FRAME_MS;
        const t = Math.min(1, (now - start) / TRANSITION_MS);
        const next = from + (to - from) * easeOutCubic(t);
        positionRef.current = next;
        setPosition(next);
        frameRef.current = t < 1 ? requestAnimationFrame(tick) : null;
      };
      frameRef.current = requestAnimationFrame(tick);
    },
    [stopAnimation, moveTo],
  );

  /** Kết thúc kéo / vuốt bắt đầu từ khóa `from`: dừng ở hành tinh gần nhất, quá ngưỡng thì ít nhất sang hành tinh kế. */
  const release = useCallback(
    (from: number) => {
      const moved = positionRef.current - from;
      let steps = Math.round(moved);
      if (steps === 0 && Math.abs(moved) >= COMMIT_FRACTION) steps = Math.sign(moved);
      settle(from + steps);
    },
    [settle],
  );

  const go = useCallback((step: number) => settle(targetRef.current + step), [settle]);

  useEffect(() => stopAnimation, [stopAnimation]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const el = event.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go]);

  // Trackpad 2 ngón vuốt ngang. Gắn listener thủ công vì cần passive: false để chặn cử chỉ Back/Forward của trình duyệt.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    type WheelGesture = {
      startPosition: number;
      startTarget: number;
      delta: number;
      /** Đã chuyển sang hành tinh kế tiếp; phần còn lại của cú vuốt chỉ dùng để nhận ra cú vuốt mới. */
      committed: boolean;
      peak: number;
      low: number;
    };
    let gesture: WheelGesture | null = null;
    let idleTimer: number | undefined;

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      if (dragRef.current?.moved) return;
      const dx = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaX * WHEEL_LINE_PX : event.deltaX;
      const strength = Math.abs(dx);

      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        const finished = gesture;
        gesture = null;
        if (finished && !finished.committed) release(finished.startTarget);
      }, WHEEL_IDLE_MS);

      if (gesture?.committed) {
        if (strength >= gesture.peak) {
          gesture.peak = strength;
          gesture.low = strength;
        } else {
          gesture.low = Math.min(gesture.low, strength);
        }
        const rearmed =
          gesture.low < gesture.peak * WHEEL_REARM_DECAY &&
          strength >= gesture.low * WHEEL_REARM_RISE &&
          strength >= WHEEL_REARM_MIN_PX;
        if (!rearmed) return;
        gesture = null;
      }

      gesture ??= {
        startPosition: positionRef.current,
        startTarget: targetRef.current,
        delta: 0,
        committed: false,
        peak: 0,
        low: 0,
      };
      gesture.delta += dx;
      const next = gesture.startPosition + gesture.delta / WHEEL_PX_PER_SLOT;
      const moved = next - gesture.startTarget;
      if (Math.abs(moved) >= WHEEL_COMMIT_FRACTION) {
        gesture.committed = true;
        gesture.peak = strength;
        gesture.low = strength;
        settle(gesture.startTarget + Math.sign(moved));
      } else {
        followTo(next);
      }
    };

    section.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      section.removeEventListener("wheel", onWheel);
      window.clearTimeout(idleTimer);
    };
  }, [followTo, settle, release]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    suppressClickRef.current = false;
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    if ((event.target as HTMLElement).closest("button")) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startPosition: positionRef.current,
      startTarget: targetRef.current,
      scale: event.currentTarget.getBoundingClientRect().width / STAGE_WIDTH,
      moved: false,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = (event.clientX - drag.startX) / drag.scale;
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_START_PX) return;
      drag.moved = true;
      setDragging(true);
      // Giữ pointer cho carousel để kéo ra ngoài vẫn theo, và hành tinh không nhận hover trong lúc kéo.
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    moveTo(drag.startPosition - dx / DRAG_PX_PER_SLOT);
  };

  const onPointerEnd = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    if (!drag.moved) return;
    setDragging(false);
    // Thả chuột sau khi kéo vẫn sinh click — không để click đó chuyển khóa thêm lần nữa.
    suppressClickRef.current = true;
    release(drag.startTarget);
  };

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label="Chọn khóa học"
      className={`absolute left-0 w-[1440px] touch-pan-y select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ top: AREA_TOP, height: AREA_HEIGHT }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        suppressClickRef.current = false;
        event.stopPropagation();
      }}
    >
      <OrbitArrow direction="prev" onClick={() => go(-1)} />
      <OrbitArrow direction="next" onClick={() => go(1)} />

      {courses.map((course, index) => {
        const offset = circularOffset(index, position, n);
        const slot = orbitSlot(offset);
        const visible = Math.abs(offset) < 2;
        const isCenter = Math.abs(offset) < 0.001;
        const isSide = Math.abs(Math.abs(offset) - 1) < 0.001;
        return (
          <div
            key={course.id}
            aria-hidden={index !== activeIndex}
            className={`absolute left-0 top-0 size-[420px] will-change-transform ${isSide || isCenter ? "cursor-pointer" : ""}`}
            style={{
              transform: `translate(${slot.x - 210}px, ${slot.y - AREA_TOP - 210}px) scale(${slot.size / CENTER.size})`,
              opacity: slot.opacity,
              zIndex: slot.z,
              visibility: visible ? "visible" : "hidden",
            }}
            onClick={isSide ? () => go(Math.sign(offset)) : isCenter ? () => openCourse(course) : undefined}
          >
            {course.planetRive ? (
              <RivePlanet
                config={course.planetRive}
                image={course.planetImage}
                alt={index === activeIndex ? course.name : ""}
                interactive={isCenter || isSide}
                playing={visible}
              />
            ) : (
              <AnimatedPlanetImage
                image={course.planetImage}
                alt={index === activeIndex ? course.name : ""}
                interactive={isCenter || isSide}
                playing={visible}
                phase={index * 0.7}
              />
            )}
          </div>
        );
      })}

      {/* Ruy-băng gắn với vị trí giữa: khung hành tinh giữa nằm ở (510,172) */}
      <div className="absolute z-[200]" style={{ left: 510, top: 172 - AREA_TOP }}>
        <CourseRibbon name={activeCourse.name} onClick={() => openCourse(activeCourse)} />
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-1/2 top-[470px] z-[300] -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1c2358]/90 px-5 py-2 text-[16px] font-bold text-white shadow-lg"
        >
          {toast}
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {`Khóa học ${activeIndex + 1}/${n}: ${activeCourse.name}`}
      </p>
    </section>
  );
}

function OrbitArrow({ direction, onClick }: { direction: "prev" | "next"; onClick: () => void }) {
  const isNext = direction === "next";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isNext ? "Khóa học sau" : "Khóa học trước"}
      className={`group absolute top-[180px] z-[150] h-[90px] w-[80px] cursor-pointer outline-none ${isNext ? "left-[1320px] -scale-x-100" : "left-[40px]"}`}
    >
      <span className="absolute left-[-6px] top-[-9px] flex h-[99.455px] w-[85.111px] items-center justify-center transition-[transform,filter] duration-200 ease-out group-hover:scale-110 group-hover:brightness-115 group-focus-visible:scale-110 group-focus-visible:brightness-115 group-active:scale-95">
        <span className="relative block h-[84px] w-[60px] flex-none rotate-20">
          <span className="absolute left-[-2.83px] top-[-1.99px] flex h-[87.321px] w-[65.667px] items-center justify-center">
            <span className="relative block h-[83.338px] w-[60px] flex-none rotate-4 overflow-hidden">
              <img
                src="/home/scene/arrow.webp"
                alt=""
                draggable={false}
                className="absolute left-[-45.43%] top-[-13.17%] h-[125.29%] w-[190.42%] max-w-none"
              />
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}
