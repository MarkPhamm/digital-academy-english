"use client";

import { useLayoutEffect, useRef } from "react";

const BASE_FONT_SIZE = 30;
const MIN_FONT_SIZE = 16;
// Bề rộng mặt trước của ruy-băng (phần nền xanh phẳng) trừ lề — đo trên ảnh "image 920".
const MAX_TEXT_WIDTH = 264;

/** Ruy-băng tên khóa học: luôn 1 dòng, tự co cỡ chữ khi tên dài (tối thiểu 16px, sau đó cắt "…"). */
export function CourseRibbon({ name, onClick }: { name: string; onClick?: () => void }) {
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    let cancelled = false;
    const fit = () => {
      if (cancelled) return;
      el.style.fontSize = `${BASE_FONT_SIZE}px`;
      const natural = el.scrollWidth;
      if (natural > MAX_TEXT_WIDTH) {
        const fitted = Math.max(MIN_FONT_SIZE, Math.floor((BASE_FONT_SIZE * MAX_TEXT_WIDTH) / natural));
        el.style.fontSize = `${fitted}px`;
      }
    };
    fit();
    // Đo lại khi web font tải xong (độ rộng chữ thay đổi so với font dự phòng).
    document.fonts?.ready.then(fit);
    return () => {
      cancelled = true;
    };
  }, [name]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group absolute left-[35px] top-[340px] h-[130px] w-[351px] cursor-pointer outline-none transition-[filter,transform] duration-200 ease-out hover:-translate-y-[2px] hover:brightness-110 focus-visible:brightness-110 active:translate-y-0"
    >
      <img src="/home/planets/ribbon.webp" alt="" className="pointer-events-none absolute inset-0 size-full object-cover" />
      <span
        key={name}
        ref={textRef}
        className="animate-ribbon-text absolute left-1/2 top-[53px] block -translate-x-1/2 -translate-y-1/2 overflow-hidden text-ellipsis whitespace-nowrap font-bold leading-[36px] text-white"
        style={{ fontSize: BASE_FONT_SIZE, maxWidth: MAX_TEXT_WIDTH }}
      >
        {name}
      </span>
    </button>
  );
}
