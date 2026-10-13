/**
 * Định dạng của generated/banks.json — do scripts/build-questions.mjs sinh từ content/english/<slug>.csv.
 * Đừng sửa JSON bằng tay: sửa CSV rồi chạy `npm run questions`.
 */
export type GeneratedQuestion =
  | { type: "MCQ"; prompt: string; options: [string, string, string, string]; correctIndex: 0 | 1 | 2 | 3; explanation: string }
  | { type: "TRUE_FALSE"; prompt: string; correct: boolean; explanation: string };

export interface LevelBank {
  title: string; // tên chủ đề trong cột "topic" của CSV
  questions: GeneratedQuestion[];
}

export interface WorldBank {
  slug: string;
  levels: LevelBank[];
}
