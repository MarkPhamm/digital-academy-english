/** Kiểu dữ liệu trao đổi giữa trình duyệt và Netlify Function `/api/game/*`. Dùng chung hai phía. */

export const GAME_API_BASE = "/api/game";

export type QuestionType = "MCQ" | "TRUE_FALSE";
export type AttemptMode = "LEVEL" | "REVIEW";

/** Câu hỏi gửi xuống trình duyệt: KHÔNG có đáp án đúng. */
export type PublicQuestion = { id: string; type: QuestionType; prompt: string; options: string[] };
export type LevelRef = { id: string; number: number; title: string };
export type WorldRef = { slug: string; name: string; color: string };

// ---- GET /profile ----
export type LevelView = LevelRef & {
  unlocked: boolean;
  passed: boolean;
  bestStars: number;
  bestCorrect: number;
  plays: number;
  boss: boolean;
  /** level đầu tiên đã mở nhưng chưa qua */
  current: boolean;
};
export type WorldView = WorldRef & {
  subtitle: string;
  levelCount: number;
  passed: number;
  stars: number;
  wrongCount: number;
  levels: LevelView[];
};
export type ProfileResponse = {
  coins: number;
  totalStars: number;
  skins: { equipped: string; owned: string[] };
  worlds: WorldView[];
};

// ---- POST /attempts ----
export type StartAttemptBody = { levelId: string } | { mode: "REVIEW"; worldSlug: string };
export type StartAttemptResponse = {
  attemptId: string;
  mode: AttemptMode;
  level: LevelRef;
  world: WorldRef;
  questions: PublicQuestion[];
};

// ---- POST /attempts/:id/answer ----
export type AnswerBody = { questionId: string; chosenIndex: number };
export type AnswerResponse = {
  correct: boolean;
  chosenIndex: number;
  correctIndex: number;
  explanation: string;
  /** xu vừa được thưởng (0 nếu câu này đã từng được thưởng) */
  coinsAwarded: number;
  /** tổng xu sau khi thưởng */
  coins: number;
  /** true khi gửi lại câu đã trả lời: trả về câu trả lời đầu tiên */
  alreadyAnswered: boolean;
};

// ---- POST /attempts/:id/finish ----
export type FinishResponse = {
  correct: number;
  total: number;
  stars: number;
  passed: boolean;
  coins: number;
  /** level vừa được mở lần đầu nhờ lượt này */
  unlockedLevel: LevelRef | null;
};

// ---- GET /attempts/:id ----
export type ResultQuestion = PublicQuestion & {
  correctIndex: number;
  explanation: string;
  chosenIndex: number | null;
  correct: boolean | null;
};
export type AttemptResultResponse = {
  attemptId: string;
  mode: AttemptMode;
  boss: boolean;
  level: LevelRef;
  world: WorldRef;
  correct: number;
  total: number;
  stars: number;
  passed: boolean;
  passMark: number;
  coinsEarned: number;
  unlockedLevel: LevelRef | null;
  nextLevel: LevelRef | null;
  questions: ResultQuestion[];
};

// ---- POST /skins/buy, /skins/equip ----
export type BuySkinBody = { skinId: string; equip?: boolean };
export type EquipSkinBody = { skinId: string };
export type SkinsResponse = { coins: number; equipped: string; owned: string[] };

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "LOCKED"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "FINISHED"
  | "NOT_FINISHED"
  | "NO_REVIEW"
  | "ALREADY_OWNED"
  | "NOT_OWNED"
  | "NOT_ENOUGH_COINS"
  | "CONTENTION"
  | "STORAGE";

export type ApiErrorBody = { error: string; code?: ApiErrorCode; levelId?: string; mode?: AttemptMode };
