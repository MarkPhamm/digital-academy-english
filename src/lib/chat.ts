// Giao thức giữa khung chat Trợ lý AI và route /api/chat.

/** Một lượt hội thoại gửi lên server (chỉ phần chữ). */
export type ChatTurn = { role: "user" | "assistant"; content: string };

/** Server stream về NDJSON: mỗi dòng là một sự kiện. */
export type ChatStreamEvent =
  | { type: "text"; text: string }
  /** Model chính từ chối giữa chừng và model dự phòng trả lời lại từ đầu: bỏ phần chữ đã nhận. */
  | { type: "reset" }
  | { type: "done"; stopReason: string | null }
  | { type: "error"; message: string };

export const CHAT_LIMITS = { maxHistoryMessages: 20, maxMessageChars: 2000 };
