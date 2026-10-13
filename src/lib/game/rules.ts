/** Luật chơi — dùng chung cho Netlify Function và giao diện. Chỉ import tương đối (function không hiểu alias "@/"). */
import { levelCount } from "./worlds";

/** Mỗi lượt rút 10 câu từ chủ đề của level (scripts/build-questions.mjs bắt mỗi chủ đề có ít nhất chừng ấy câu). */
export const QUESTIONS_PER_LEVEL = 10;
export const PASS_RATIO = 0.7; // đúng ≥ 70% thì qua level và mở level sau

export function passMark(total: number): number {
  return Math.ceil(total * PASS_RATIO);
}

/** 10 câu: 7–8 đúng = 1 sao, 9 = 2 sao, 10 = 3 sao, dưới 7 = 0 sao (chưa qua). */
export function starsFor(correct: number, total: number): number {
  if (total <= 0 || correct < passMark(total)) return 0;
  if (correct >= total) return 3;
  if (correct >= total - 1) return 2;
  return 1;
}

/** Level cuối mỗi hành tinh là level boss (đánh boss thời gian thực thay cho bản đồ hỏi NPC). Ôn tập vẫn dùng màn thường. */
export function isBossLevel(worldSlug: string, number: number): boolean {
  return number === levelCount(worldSlug);
}

export const AVATAR_COLORS = ["#ef5a5a", "#3b82f6", "#2fbf71", "#f59e0b", "#a855f7", "#ec4899"];

/** Xu thưởng cho mỗi câu trả lời đúng — chỉ thưởng lần đầu mỗi câu được trả lời đúng. */
export const COINS_PER_CORRECT = 10;

/** Số lượt chơi đã nộp được giữ lại trong hồ sơ (để xem trang kết quả). */
export const ATTEMPT_HISTORY_LIMIT = 20;
/** Số lượt chơi đang mở tối đa; vượt quá thì bỏ lượt cũ nhất. */
export const MAX_OPEN_ATTEMPTS = 3;
