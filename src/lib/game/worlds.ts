/** Thông tin 4 thế giới (hành tinh) — an toàn để import ở client. Thứ tự = thứ tự hiển thị. */
export type WorldMeta = { slug: string; name: string; subtitle: string; color: string; order: number };

export const WORLD_META: WorldMeta[] = [
  { slug: "ai-cong-nghe", name: "AI Công nghệ", subtitle: "Hành tinh Trí tuệ", color: "#7c6cff", order: 0 },
  { slug: "toan-ly-hoa", name: "Toán Lý Hóa", subtitle: "Hành tinh Khám phá", color: "#ff9a3d", order: 1 },
  { slug: "tieng-anh", name: "Tiếng Anh", subtitle: "Hành tinh Ngôn ngữ", color: "#2fc4a0", order: 2 },
  { slug: "cyber-world", name: "Cyber World", subtitle: "Hành tinh Mã nguồn", color: "#22d3ee", order: 3 },
];

export function getWorldMeta(slug: string): WorldMeta | undefined {
  return WORLD_META.find((w) => w.slug === slug);
}
