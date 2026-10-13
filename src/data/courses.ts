import { WORLD_META, isWorldSlug } from "@/lib/game/worlds";

export type CoursePlanetRive = {
  src: string;
  artboard: string;
  /** Tâm hành tinh (node "Planet_Root") trong artboard 1920×1080. */
  center: { x: number; y: number };
  /** Số px trên khung hành tinh 420×420 ứng với 1 đơn vị artboard — để hành tinh Rive to bằng ảnh tĩnh. */
  scale: number;
};

export type Course = {
  id: string;
  name: string;
  /** Ảnh tĩnh: hiển thị khi chưa tải xong Rive, khi bật "giảm chuyển động", và cho các khóa chưa có Rive. */
  planetImage: string;
  planetRive?: CoursePlanetRive;
  /** Xoay màu ảnh tĩnh (độ) — để hai hành tinh dùng chung ảnh vẫn khác nhau. */
  planetHue?: number;
  /** Thế giới trong game "Vũ trụ Tri thức" mở ra khi bấm hành tinh; chưa có thì báo "sắp mở". */
  worldSlug?: string;
};

// Mỗi hành tinh là một trình độ tiếng Anh, theo thứ tự WORLD_META; tên lấy từ WORLD_META.
// Có 7 ảnh hành tinh cho 8 trình độ nên C2 dùng lại ảnh Sao Kim, xoay màu cho khác B1.
// Hành tinh băng của file Rive "Tieng_Viet_1" trùng art với ảnh uranus.webp.
const PLANET_ART: Record<string, Omit<Course, "id" | "name" | "worldSlug">> = {
  "lop-5": {
    planetImage: "/home/planets/earth.webp", // Trái Đất
    planetRive: { src: "/home/planets/rive/english.riv", artboard: "English_New", center: { x: 960, y: 528 }, scale: 0.55 },
  },
  "lop-6": {
    planetImage: "/home/planets/mars.webp", // Sao Hỏa
    planetRive: { src: "/home/planets/rive/math.riv", artboard: "Math_1", center: { x: 960, y: 540 }, scale: 0.6 },
  },
  "lop-7": {
    planetImage: "/home/planets/uranus.webp", // Sao Thiên Vương
    planetRive: { src: "/home/planets/rive/vietnamese.riv", artboard: "Tieng_Viet_1", center: { x: 950, y: 555 }, scale: 0.74 },
  },
  "lop-8": { planetImage: "/home/planets/mercury.webp" }, // Sao Thủy
  b1: { planetImage: "/home/planets/venus.webp" }, // Sao Kim
  b2: { planetImage: "/home/planets/neptune.webp" }, // Sao Hải Vương
  c1: { planetImage: "/home/planets/gj-504b.webp" }, // GJ 504 b
  c2: { planetImage: "/home/planets/venus.webp", planetHue: 200 }, // Sao Kim đổi màu
};

export const courses: Course[] = WORLD_META.map((w) => ({
  id: w.slug,
  name: w.name,
  // Chưa có file CSV thì không gắn game → bấm vào báo "sắp mở".
  worldSlug: isWorldSlug(w.slug) ? w.slug : undefined,
  ...(PLANET_ART[w.slug] ?? { planetImage: "/home/planets/earth.webp" }),
}));
