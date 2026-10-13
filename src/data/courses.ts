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
  /** Thế giới trong game "Vũ trụ Tri thức" mở ra khi bấm hành tinh; chưa có thì báo "sắp mở". */
  worldSlug?: string;
};

// Dữ liệu mock. Thứ tự hành tinh theo 7 frame "Khóa học 1…7" trong Figma; tên khóa là tên giả.
// Hành tinh băng của file Rive "Tieng_Viet_1" trùng art với ảnh uranus.webp nên Tiếng Việt và Khoa học đổi ảnh cho nhau.
export const courses: Course[] = [
  {
    id: "english-3",
    name: "Tiếng Anh lớp 3",
    worldSlug: "tieng-anh",
    planetImage: "/home/planets/earth.webp", // Trái Đất
    planetRive: { src: "/home/planets/rive/english.riv", artboard: "English_New", center: { x: 960, y: 528 }, scale: 0.55 },
  },
  {
    id: "math",
    name: "Toán tư duy",
    worldSlug: "toan-ly-hoa",
    planetImage: "/home/planets/mars.webp", // Sao Hỏa
    planetRive: { src: "/home/planets/rive/math.riv", artboard: "Math_1", center: { x: 960, y: 540 }, scale: 0.6 },
  },
  {
    id: "vietnamese",
    name: "Tiếng Việt",
    planetImage: "/home/planets/uranus.webp", // Sao Thiên Vương
    planetRive: { src: "/home/planets/rive/vietnamese.riv", artboard: "Tieng_Viet_1", center: { x: 950, y: 555 }, scale: 0.74 },
  },
  { id: "it", name: "Tin học", planetImage: "/home/planets/mercury.webp", worldSlug: "ai-cong-nghe" }, // Sao Thủy
  { id: "science", name: "Khoa học tự nhiên", planetImage: "/home/planets/venus.webp" }, // Sao Kim
  { id: "art", name: "Mỹ thuật sáng tạo", planetImage: "/home/planets/neptune.webp" }, // Sao Hải Vương
  { id: "scratch", name: "Lập trình Scratch cho các bạn nhỏ", planetImage: "/home/planets/gj-504b.webp", worldSlug: "cyber-world" }, // GJ 504 b
];
