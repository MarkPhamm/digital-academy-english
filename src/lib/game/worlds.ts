import catalog from "../../data/game/questions/generated/catalog.json";

/** Giao diện dùng lại cho hành tinh — mỗi kiểu có bản đồ, cảnh vật và hình hành tinh riêng (xem THEMES ở mapgen.ts). */
export type WorldLook = "tieng-anh" | "toan-ly-hoa" | "cyber-world" | "ai-cong-nghe";

/**
 * Thông tin các thế giới (hành tinh) — mỗi hành tinh là một trình độ tiếng Anh. An toàn để import ở client.
 * Câu hỏi lấy từ content/english/<slug>.csv; thêm hành tinh mới = thêm một dòng ở đây + một file CSV cùng slug.
 *  - look: kiểu giao diện dùng lại; bản đồ vẫn khác nhau vì sinh theo slug.
 *  - lang: ngôn ngữ đề bài ("vi" → nút Đúng/Sai, "en" → True/False).
 */
export type WorldMeta = { slug: string; name: string; subtitle: string; color: string; order: number; look: WorldLook; lang: "vi" | "en" };

export const WORLD_META: WorldMeta[] = [
  { slug: "lop-5", name: "Tiếng Anh lớp 5", subtitle: "Hành tinh Khởi đầu", color: "#2fc4a0", order: 0, look: "tieng-anh", lang: "vi" },
  { slug: "lop-6", name: "Tiếng Anh lớp 6", subtitle: "Hành tinh Đồng xanh", color: "#ff9a3d", order: 1, look: "toan-ly-hoa", lang: "vi" },
  { slug: "lop-7", name: "Tiếng Anh lớp 7", subtitle: "Hành tinh Dòng sông", color: "#22d3ee", order: 2, look: "cyber-world", lang: "vi" },
  { slug: "lop-8", name: "Tiếng Anh lớp 8", subtitle: "Hành tinh Tương lai", color: "#7c6cff", order: 3, look: "ai-cong-nghe", lang: "vi" },
  { slug: "b1", name: "B1 Intermediate", subtitle: "Planet Explorer", color: "#4ade80", order: 4, look: "tieng-anh", lang: "en" },
  { slug: "b2", name: "B2 Upper-Intermediate", subtitle: "Planet Voyager", color: "#f472b6", order: 5, look: "toan-ly-hoa", lang: "en" },
  { slug: "c1", name: "C1 Advanced", subtitle: "Planet Navigator", color: "#38bdf8", order: 6, look: "cyber-world", lang: "en" },
  { slug: "c2", name: "C2 Proficiency", subtitle: "Planet Master", color: "#facc15", order: 7, look: "ai-cong-nghe", lang: "en" },
];

export function getWorldMeta(slug: string): WorldMeta | undefined {
  return WORLD_META.find((w) => w.slug === slug);
}

/** Tên các level (chủ đề) của mỗi hành tinh, theo thứ tự trong file CSV — sinh bởi scripts/build-questions.mjs. */
const LEVEL_TITLES: Record<string, string[]> = catalog;

/** Số level của một hành tinh (= số chủ đề trong CSV). */
export function levelCount(slug: string): number {
  return LEVEL_TITLES[slug]?.length ?? 0;
}

/** id level = `${slug}-L${n}` (n = 1..levelCount(slug)) — khớp với ngân hàng câu hỏi. */
export const levelId = (slug: string, n: number) => `${slug}-L${n}`;

/** Toàn bộ id level của mọi thế giới, theo thứ tự hiển thị. */
export const ALL_LEVEL_IDS: string[] = WORLD_META.flatMap((w) => Array.from({ length: levelCount(w.slug) }, (_, i) => levelId(w.slug, i + 1)));

/** Hành tinh chơi được = có trong WORLD_META và đã có câu hỏi (file CSV). */
export function isWorldSlug(slug: string): boolean {
  return WORLD_META.some((w) => w.slug === slug) && levelCount(slug) > 0;
}

/** Các hành tinh đã có câu hỏi, theo thứ tự hiển thị. */
export const PLAYABLE_WORLDS: WorldMeta[] = WORLD_META.filter((w) => isWorldSlug(w.slug));

export function isLevelId(id: string): boolean {
  return ALL_LEVEL_IDS.includes(id);
}
