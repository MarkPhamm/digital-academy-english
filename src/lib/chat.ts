// Giao thức giữa khung chat Trợ lý AI và Netlify Function /api/chat (netlify/functions/chat).

/** Một lượt hội thoại gửi lên server (chỉ phần chữ). */
export type ChatTurn = { role: "user" | "assistant"; content: string };

/** Server stream về NDJSON: mỗi dòng là một sự kiện. */
export type ChatStreamEvent =
  | { type: "text"; text: string }
  /** Model chính từ chối giữa chừng và model dự phòng trả lời lại từ đầu: bỏ phần chữ đã nhận. */
  | { type: "reset" }
  | { type: "done"; stopReason: string | null }
  | { type: "error"; message: string };

export const CHAT_LIMITS = {
  /** Server chỉ giữ chừng này tin gần nhất trong lịch sử. */
  maxHistoryMessages: 16,
  /** Mỗi tin dài quá mức này bị cắt bớt. */
  maxMessageChars: 500,
  /** Số tin học sinh được gửi mỗi giờ, tính theo địa chỉ IP. */
  messagesPerHour: 30,
};
