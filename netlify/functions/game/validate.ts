import type { AnswerBody, BuySkinBody, EquipSkinBody, StartAttemptBody } from "../../../src/lib/game/api-types";
import { ApiError } from "./profile-store";

// Kiểm tra body thủ công (giống parseHistory của function chat), không dùng thư viện schema.

const bad = (msg = "Dữ liệu gửi lên không hợp lệ.") => new ApiError(400, msg, "BAD_REQUEST");

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 80): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw bad();
  }
}

export function parseStartBody(raw: unknown): StartAttemptBody {
  if (!isObj(raw)) throw bad();
  if (raw.mode === "REVIEW") {
    if (!str(raw.worldSlug)) throw bad();
    return { mode: "REVIEW", worldSlug: raw.worldSlug };
  }
  if (!str(raw.levelId)) throw bad();
  return { levelId: raw.levelId };
}

export function parseAnswerBody(raw: unknown): AnswerBody {
  if (!isObj(raw) || !str(raw.questionId)) throw bad();
  const idx = raw.chosenIndex;
  if (typeof idx !== "number" || !Number.isInteger(idx) || idx < 0 || idx > 3) throw bad();
  return { questionId: raw.questionId, chosenIndex: idx };
}

export function parseBuyBody(raw: unknown): BuySkinBody {
  if (!isObj(raw) || !str(raw.skinId, 40)) throw bad();
  return { skinId: raw.skinId, equip: raw.equip === true };
}

export function parseEquipBody(raw: unknown): EquipSkinBody {
  if (!isObj(raw) || !str(raw.skinId, 40)) throw bad();
  return { skinId: raw.skinId };
}

const ATTEMPT_ID_RE = /^[A-Za-z0-9_-]{8,32}$/;
export function isAttemptId(id: string | undefined): id is string {
  return typeof id === "string" && ATTEMPT_ID_RE.test(id);
}
