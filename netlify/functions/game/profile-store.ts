import { getStore } from "@netlify/blobs";
import { getLevel, getQuestion } from "../../../src/data/game/questions";
import type { ApiErrorCode, AttemptMode } from "../../../src/lib/game/api-types";
import { DEFAULT_SKIN, isSkinId } from "../../../src/lib/game/skins";

// Hồ sơ game của mỗi học sinh là MỘT document JSON trong Netlify Blobs. Mọi thao tác (bắt đầu lượt, chấm câu,
// nộp bài, mua skin) là một lần đọc-sửa-ghi có điều kiện theo etag, nên không bao giờ ghi "nửa chừng".

const STORE_NAME = "game-profiles";
const KEY_PREFIX = "v1/";
const MAX_ATTEMPTS = 6;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: ApiErrorCode,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export type StoredLevelProgress = {
  bestCorrect: number;
  bestStars: number;
  passed: boolean;
  plays: number;
  updatedAt: number;
};

export type StoredAnswer = { chosenIndex: number; correct: boolean; coins: number; at: number };

export type StoredAttempt = {
  id: string;
  mode: AttemptMode;
  levelId: string;
  worldSlug: string;
  questionIds: string[];
  answers: Record<string, StoredAnswer>;
  startedAt: number;
  finishedAt: number | null;
  correct: number | null;
  stars: number | null;
  unlockedLevelId: string | null;
};

export type StoredProfile = {
  v: 1;
  createdAt: number;
  updatedAt: number;
  coins: number;
  ownedSkins: string[];
  equippedSkin: string;
  /** questionId → thời điểm được thưởng xu lần đầu */
  rewarded: Record<string, number>;
  levels: Record<string, StoredLevelProgress>;
  /** câu trả lời gần nhất cho từng câu (cả lượt thường lẫn ôn tập) — để tìm câu còn sai */
  lastAnswer: Record<string, { correct: boolean; at: number }>;
  /** cũ → mới, đã cắt bớt */
  attempts: StoredAttempt[];
};

export function newProfile(now: number): StoredProfile {
  return {
    v: 1,
    createdAt: now,
    updatedAt: now,
    coins: 0,
    ownedSkins: [DEFAULT_SKIN],
    equippedSkin: DEFAULT_SKIN,
    rewarded: {},
    levels: {},
    lastAnswer: {},
    attempts: [],
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);

/** Điền giá trị mặc định cho document thiếu trường, bỏ các id không còn trong ngân hàng câu hỏi. */
export function normalizeProfile(raw: unknown, now: number): StoredProfile {
  const p = newProfile(now);
  if (!isObj(raw)) return p;
  p.createdAt = num(raw.createdAt, now);
  p.updatedAt = num(raw.updatedAt, now);
  p.coins = Math.max(0, Math.floor(num(raw.coins)));

  const owned = Array.isArray(raw.ownedSkins) ? raw.ownedSkins.filter((s): s is string => typeof s === "string" && isSkinId(s)) : [];
  p.ownedSkins = Array.from(new Set([DEFAULT_SKIN, ...owned]));
  p.equippedSkin = typeof raw.equippedSkin === "string" && p.ownedSkins.includes(raw.equippedSkin) ? raw.equippedSkin : DEFAULT_SKIN;

  if (isObj(raw.rewarded)) {
    for (const [qid, at] of Object.entries(raw.rewarded)) if (getQuestion(qid)) p.rewarded[qid] = num(at, now);
  }
  if (isObj(raw.levels)) {
    for (const [lid, v] of Object.entries(raw.levels)) {
      if (!getLevel(lid) || !isObj(v)) continue;
      p.levels[lid] = {
        bestCorrect: Math.max(0, Math.floor(num(v.bestCorrect))),
        bestStars: Math.min(3, Math.max(0, Math.floor(num(v.bestStars)))),
        passed: v.passed === true,
        plays: Math.max(0, Math.floor(num(v.plays))),
        updatedAt: num(v.updatedAt, now),
      };
    }
  }
  if (isObj(raw.lastAnswer)) {
    for (const [qid, v] of Object.entries(raw.lastAnswer)) {
      if (!getQuestion(qid) || !isObj(v)) continue;
      p.lastAnswer[qid] = { correct: v.correct === true, at: num(v.at, now) };
    }
  }
  if (Array.isArray(raw.attempts)) {
    for (const a of raw.attempts) {
      if (!isObj(a) || typeof a.id !== "string" || typeof a.levelId !== "string" || !Array.isArray(a.questionIds)) continue;
      const answers: Record<string, StoredAnswer> = {};
      if (isObj(a.answers)) {
        for (const [qid, v] of Object.entries(a.answers)) {
          if (!isObj(v)) continue;
          answers[qid] = { chosenIndex: Math.floor(num(v.chosenIndex)), correct: v.correct === true, coins: Math.max(0, Math.floor(num(v.coins))), at: num(v.at, now) };
        }
      }
      p.attempts.push({
        id: a.id,
        mode: a.mode === "REVIEW" ? "REVIEW" : "LEVEL",
        levelId: a.levelId,
        worldSlug: typeof a.worldSlug === "string" ? a.worldSlug : (getLevel(a.levelId)?.worldSlug ?? ""),
        questionIds: a.questionIds.filter((q): q is string => typeof q === "string"),
        answers,
        startedAt: num(a.startedAt, now),
        finishedAt: typeof a.finishedAt === "number" ? a.finishedAt : null,
        correct: typeof a.correct === "number" ? a.correct : null,
        stars: typeof a.stars === "number" ? a.stars : null,
        unlockedLevelId: typeof a.unlockedLevelId === "string" ? a.unlockedLevelId : null,
      });
    }
  }
  return p;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function store() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

function storageError(error: unknown): ApiError {
  console.error("[game] blobs", error);
  return new ApiError(503, "Kho dữ liệu đang bận, em thử lại sau một chút nhé.", "STORAGE");
}

/** Đọc hồ sơ; chưa có thì trả hồ sơ mới (không ghi). */
export async function readProfile(userKey: string, now = Date.now()): Promise<StoredProfile> {
  try {
    const entry = await store().getWithMetadata(KEY_PREFIX + userKey, { type: "json" });
    return normalizeProfile(entry?.data, now);
  } catch (error) {
    throw storageError(error);
  }
}

export type MutateResult<T> = { result: T; changed?: boolean };

/**
 * Đọc-sửa-ghi có điều kiện theo etag. `mutate` phải thuần (sẽ được chạy lại khi có tranh chấp) và có thể ném
 * ApiError để huỷ mà không ghi. Trả `changed: false` để bỏ qua bước ghi (vd. gửi lại câu đã chấm).
 */
export async function mutateProfile<T>(
  userKey: string,
  mutate: (profile: StoredProfile, now: number) => MutateResult<T>,
  now = Date.now(),
): Promise<{ profile: StoredProfile; result: T }> {
  const key = KEY_PREFIX + userKey;
  const s = store();
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(Math.random() * 50 * attempt);
    let entry: Awaited<ReturnType<typeof s.getWithMetadata>>;
    try {
      entry = await s.getWithMetadata(key, { type: "json" });
    } catch (error) {
      throw storageError(error);
    }
    const profile = normalizeProfile(entry?.data, now);
    const { result, changed = true } = mutate(profile, now);
    if (!changed) return { profile, result };
    profile.updatedAt = now;
    let modified: boolean;
    try {
      ({ modified } = entry
        ? await s.setJSON(key, profile, { onlyIfMatch: entry.etag })
        : await s.setJSON(key, profile, { onlyIfNew: true }));
    } catch (error) {
      throw storageError(error);
    }
    if (modified) return { profile, result };
  }
  throw new ApiError(503, "Nhiều yêu cầu cùng lúc quá, em thử lại nhé.", "CONTENTION");
}
