import { randomBytes } from "node:crypto";
import { type BankQuestion, getLevel, getQuestion, getWorld, nextLevel } from "../../../src/data/game/questions";
import type {
  AnswerBody,
  AnswerResponse,
  AttemptResultResponse,
  BuySkinBody,
  EquipSkinBody,
  FinishResponse,
  ProfileResponse,
  PublicQuestion,
  SkinsResponse,
  StartAttemptBody,
  StartAttemptResponse,
  WorldRef,
} from "../../../src/lib/game/api-types";
import { ATTEMPT_HISTORY_LIMIT, COINS_PER_CORRECT, MAX_OPEN_ATTEMPTS, QUESTIONS_PER_LEVEL, isBossLevel, passMark, starsFor } from "../../../src/lib/game/rules";
import { findSkin } from "../../../src/lib/game/skins";
import { ApiError, type StoredAttempt, type StoredProfile, mutateProfile, readProfile } from "./profile-store";
import { buildProfileResponse, isLevelUnlocked, levelRef, wrongQuestionIds } from "./views";

// Logic từng endpoint — port từ src/app/api/attempts/** của repo gốc, chạy trên một document hồ sơ.

const publicQuestion = (q: BankQuestion): PublicQuestion => ({ id: q.id, type: q.type, prompt: q.prompt, options: q.options });
const worldRef = (slug: string): WorldRef => {
  const w = getWorld(slug);
  return w ? { slug: w.slug, name: w.name, color: w.color } : { slug, name: slug, color: "#7c6cff" };
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const notFoundAttempt = () => new ApiError(404, "Không tìm thấy lượt chơi.", "NOT_FOUND");

function findAttempt(profile: StoredProfile, id: string): StoredAttempt {
  const a = profile.attempts.find((x) => x.id === id);
  if (!a) throw notFoundAttempt();
  return a;
}

// ---------- GET /profile ----------
export async function getProfile(userKey: string): Promise<ProfileResponse> {
  return buildProfileResponse(await readProfile(userKey));
}

// ---------- POST /attempts ----------
export async function startAttempt(userKey: string, body: StartAttemptBody): Promise<StartAttemptResponse> {
  // Sinh id ngoài vòng CAS để khi phải chạy lại mutate vẫn dùng cùng một id.
  const attemptId = randomBytes(12).toString("base64url");

  const { result } = await mutateProfile(userKey, (profile, now) => {
    let mode: "LEVEL" | "REVIEW";
    let levelIdOfAttempt: string;
    let worldSlug: string;
    let pool: BankQuestion[];
    let level: StartAttemptResponse["level"];

    if ("mode" in body) {
      const world = getWorld(body.worldSlug);
      if (!world) throw new ApiError(404, "Không tìm thấy thế giới.", "NOT_FOUND");
      const wrong = wrongQuestionIds(profile, world.slug).map((id) => getQuestion(id)!);
      if (wrong.length === 0) throw new ApiError(409, "Em chưa có câu nào cần ôn ở thế giới này. Giỏi quá!", "NO_REVIEW");
      mode = "REVIEW";
      worldSlug = world.slug;
      pool = wrong;
      levelIdOfAttempt = wrong[0].levelId;
      level = { id: levelIdOfAttempt, number: 0, title: "Ôn tập" };
    } else {
      const lv = getLevel(body.levelId);
      if (!lv) throw new ApiError(404, "Không tìm thấy level.", "NOT_FOUND");
      const world = getWorld(lv.worldSlug)!;
      if (!isLevelUnlocked(profile, world, lv.id)) throw new ApiError(403, "Level này còn khoá.", "LOCKED");
      if (lv.questions.length === 0) throw new ApiError(409, "Level này chưa có câu hỏi.", "NOT_FOUND");
      mode = "LEVEL";
      worldSlug = world.slug;
      pool = lv.questions;
      levelIdOfAttempt = lv.id;
      level = levelRef(lv);
    }

    const questions = shuffle(pool).slice(0, QUESTIONS_PER_LEVEL);

    // Giới hạn số lượt đang mở: bỏ lượt cũ nhất (câu đã chấm trong đó vẫn đã được ghi vào xu/lastAnswer).
    const open = profile.attempts.filter((a) => a.finishedAt === null);
    while (open.length >= MAX_OPEN_ATTEMPTS) {
      const oldest = open.shift()!;
      profile.attempts = profile.attempts.filter((a) => a.id !== oldest.id);
    }

    profile.attempts.push({
      id: attemptId,
      mode,
      levelId: levelIdOfAttempt,
      worldSlug,
      questionIds: questions.map((q) => q.id),
      answers: {},
      startedAt: now,
      finishedAt: null,
      correct: null,
      stars: null,
      unlockedLevelId: null,
    });

    const res: StartAttemptResponse = { attemptId, mode, level, world: worldRef(worldSlug), questions: questions.map(publicQuestion) };
    return { result: res };
  });
  return result;
}

// ---------- POST /attempts/:id/answer ----------
export async function answer(userKey: string, attemptId: string, body: AnswerBody): Promise<AnswerResponse> {
  const { result } = await mutateProfile(userKey, (profile, now) => {
    const attempt = findAttempt(profile, attemptId);
    if (attempt.finishedAt !== null) throw new ApiError(409, "Lượt chơi đã kết thúc.", "FINISHED");
    if (!attempt.questionIds.includes(body.questionId)) throw new ApiError(400, "Câu hỏi không thuộc lượt chơi này.", "BAD_REQUEST");
    const q = getQuestion(body.questionId);
    if (!q) throw new ApiError(404, "Không tìm thấy câu hỏi.", "NOT_FOUND");
    if (body.chosenIndex >= q.options.length) throw new ApiError(400, "Lựa chọn không hợp lệ.", "BAD_REQUEST");

    const prev = attempt.answers[q.id];
    if (prev) {
      // Câu trả lời đầu tiên là cuối cùng: gửi lại chỉ nhận lại kết quả cũ, không ghi.
      const res: AnswerResponse = {
        correct: prev.correct,
        chosenIndex: prev.chosenIndex,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        coinsAwarded: 0,
        coins: profile.coins,
        alreadyAnswered: true,
      };
      return { result: res, changed: false };
    }

    const correct = body.chosenIndex === q.correctIndex;
    const coins = correct && !(q.id in profile.rewarded) ? COINS_PER_CORRECT : 0;
    attempt.answers[q.id] = { chosenIndex: body.chosenIndex, correct, coins, at: now };
    profile.lastAnswer[q.id] = { correct, at: now };
    if (coins > 0) {
      profile.rewarded[q.id] = now;
      profile.coins += coins;
    }

    const res: AnswerResponse = {
      correct,
      chosenIndex: body.chosenIndex,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      coinsAwarded: coins,
      coins: profile.coins,
      alreadyAnswered: false,
    };
    return { result: res };
  });
  return result;
}

// ---------- POST /attempts/:id/finish ----------
export async function finish(userKey: string, attemptId: string): Promise<FinishResponse> {
  const { result } = await mutateProfile(userKey, (profile, now) => {
    const attempt = findAttempt(profile, attemptId);
    const total = attempt.questionIds.length;

    if (attempt.finishedAt !== null) {
      const unlocked = attempt.unlockedLevelId ? getLevel(attempt.unlockedLevelId) : undefined;
      const res: FinishResponse = {
        correct: attempt.correct ?? 0,
        total,
        stars: attempt.stars ?? 0,
        passed: (attempt.stars ?? 0) > 0,
        coins: profile.coins,
        unlockedLevel: unlocked ? levelRef(unlocked) : null,
      };
      return { result: res, changed: false };
    }

    const correct = Object.values(attempt.answers).filter((a) => a.correct).length; // câu chưa trả lời tính sai
    const stars = attempt.mode === "REVIEW" ? 0 : starsFor(correct, total);
    let unlockedLevelId: string | null = null;

    if (attempt.mode === "LEVEL") {
      const prev = profile.levels[attempt.levelId];
      if (!prev?.passed && stars > 0) unlockedLevelId = nextLevel(attempt.levelId)?.id ?? null;
      profile.levels[attempt.levelId] = prev
        ? {
            bestCorrect: Math.max(prev.bestCorrect, correct),
            bestStars: Math.max(prev.bestStars, stars),
            passed: prev.passed || stars > 0,
            plays: prev.plays + 1,
            updatedAt: now,
          }
        : { bestCorrect: correct, bestStars: stars, passed: stars > 0, plays: 1, updatedAt: now };
    }

    attempt.finishedAt = now;
    attempt.correct = correct;
    attempt.stars = stars;
    attempt.unlockedLevelId = unlockedLevelId;

    // Giữ lại một số lượt đã nộp gần nhất để xem trang kết quả.
    const finished = profile.attempts.filter((a) => a.finishedAt !== null);
    if (finished.length > ATTEMPT_HISTORY_LIMIT) {
      const drop = new Set(finished.slice(0, finished.length - ATTEMPT_HISTORY_LIMIT).map((a) => a.id));
      profile.attempts = profile.attempts.filter((a) => !drop.has(a.id));
    }

    const unlocked = unlockedLevelId ? getLevel(unlockedLevelId) : undefined;
    const res: FinishResponse = { correct, total, stars, passed: stars > 0, coins: profile.coins, unlockedLevel: unlocked ? levelRef(unlocked) : null };
    return { result: res };
  });
  return result;
}

// ---------- GET /attempts/:id ----------
export async function getResult(userKey: string, attemptId: string): Promise<AttemptResultResponse> {
  const profile = await readProfile(userKey);
  const attempt = findAttempt(profile, attemptId);
  if (attempt.finishedAt === null) {
    throw new ApiError(409, "Lượt chơi chưa nộp bài.", "NOT_FINISHED", { levelId: attempt.levelId, mode: attempt.mode });
  }
  const lv = getLevel(attempt.levelId);
  const level = attempt.mode === "REVIEW" ? { id: attempt.levelId, number: 0, title: "Ôn tập" } : lv ? levelRef(lv) : { id: attempt.levelId, number: 0, title: "" };
  const total = attempt.questionIds.length;
  const unlocked = attempt.unlockedLevelId ? getLevel(attempt.unlockedLevelId) : undefined;
  const next = attempt.mode === "LEVEL" ? nextLevel(attempt.levelId) : undefined;

  return {
    attemptId: attempt.id,
    mode: attempt.mode,
    boss: attempt.mode === "LEVEL" && !!lv && isBossLevel(attempt.worldSlug, lv.number),
    level,
    world: worldRef(attempt.worldSlug),
    correct: attempt.correct ?? 0,
    total,
    stars: attempt.stars ?? 0,
    passed: (attempt.stars ?? 0) > 0,
    passMark: passMark(total),
    coinsEarned: Object.values(attempt.answers).reduce((s, a) => s + a.coins, 0),
    unlockedLevel: unlocked ? levelRef(unlocked) : null,
    nextLevel: next ? levelRef(next) : null,
    questions: attempt.questionIds.flatMap((qid) => {
      const q = getQuestion(qid);
      if (!q) return [];
      const a = attempt.answers[qid];
      return [{ ...publicQuestion(q), correctIndex: q.correctIndex, explanation: q.explanation, chosenIndex: a?.chosenIndex ?? null, correct: a?.correct ?? null }];
    }),
  };
}

// ---------- POST /skins/buy ----------
export async function buySkin(userKey: string, body: BuySkinBody): Promise<SkinsResponse> {
  const { result } = await mutateProfile(userKey, (profile) => {
    const skin = findSkin(body.skinId);
    if (!skin) throw new ApiError(404, "Không có trang phục này.", "NOT_FOUND");
    if (profile.ownedSkins.includes(skin.id)) throw new ApiError(409, "Em đã có trang phục này rồi.", "ALREADY_OWNED");
    if (profile.coins < skin.price) {
      throw new ApiError(409, `Em cần thêm ${skin.price - profile.coins} xu nữa. Trả lời đúng mỗi câu được ${COINS_PER_CORRECT} xu!`, "NOT_ENOUGH_COINS");
    }
    profile.coins -= skin.price;
    profile.ownedSkins.push(skin.id);
    if (body.equip) profile.equippedSkin = skin.id;
    const res: SkinsResponse = { coins: profile.coins, equipped: profile.equippedSkin, owned: [...profile.ownedSkins] };
    return { result: res };
  });
  return result;
}

// ---------- POST /skins/equip ----------
export async function equipSkin(userKey: string, body: EquipSkinBody): Promise<SkinsResponse> {
  const { result } = await mutateProfile(userKey, (profile) => {
    const skin = findSkin(body.skinId);
    if (!skin) throw new ApiError(404, "Không có trang phục này.", "NOT_FOUND");
    if (!profile.ownedSkins.includes(skin.id)) throw new ApiError(409, "Em chưa mua trang phục này.", "NOT_OWNED");
    const changed = profile.equippedSkin !== skin.id;
    profile.equippedSkin = skin.id;
    const res: SkinsResponse = { coins: profile.coins, equipped: profile.equippedSkin, owned: [...profile.ownedSkins] };
    return { result: res, changed };
  });
  return result;
}
