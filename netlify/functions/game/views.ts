import { type BankLevel, type BankWorld, WORLDS, getQuestion } from "../../../src/data/game/questions";
import type { LevelRef, LevelView, ProfileResponse, WorldView } from "../../../src/lib/game/api-types";
import { isBossLevel } from "../../../src/lib/game/rules";
import type { StoredProfile } from "./profile-store";

// Các hàm "nhìn" vào hồ sơ — thuần, không ghi. Port từ src/lib/progress.ts của repo gốc (bỏ database).

export const levelRef = (l: BankLevel): LevelRef => ({ id: l.id, number: l.number, title: l.title });

/** Level 1 luôn mở; level n mở khi level n-1 đã qua. */
export function levelsWithProgress(profile: StoredProfile, world: BankWorld): LevelView[] {
  let prevPassed = true;
  const out: LevelView[] = [];
  for (const l of world.levels) {
    const p = profile.levels[l.id];
    const unlocked = prevPassed;
    const passed = p?.passed ?? false;
    out.push({
      ...levelRef(l),
      unlocked,
      passed,
      bestStars: p?.bestStars ?? 0,
      bestCorrect: p?.bestCorrect ?? 0,
      plays: p?.plays ?? 0,
      boss: isBossLevel(world.slug, l.number),
      current: false,
    });
    prevPassed = passed;
  }
  const cur = out.find((l) => l.unlocked && !l.passed);
  if (cur) cur.current = true;
  return out;
}

export function isLevelUnlocked(profile: StoredProfile, world: BankWorld, levelId: string): boolean {
  return levelsWithProgress(profile, world).find((l) => l.id === levelId)?.unlocked ?? false;
}

/** Câu còn sai = câu mà lần trả lời gần nhất là sai (ở lượt thường hoặc ôn tập). */
export function wrongQuestionIds(profile: StoredProfile, worldSlug?: string): string[] {
  const out: string[] = [];
  for (const [qid, a] of Object.entries(profile.lastAnswer)) {
    if (a.correct) continue;
    const q = getQuestion(qid);
    if (!q) continue;
    if (worldSlug && q.worldSlug !== worldSlug) continue;
    out.push(qid);
  }
  return out;
}

export function totalStars(profile: StoredProfile): number {
  return Object.values(profile.levels).reduce((s, l) => s + l.bestStars, 0);
}

export function worldView(profile: StoredProfile, world: BankWorld): WorldView {
  const levels = levelsWithProgress(profile, world);
  return {
    slug: world.slug,
    name: world.name,
    color: world.color,
    subtitle: world.subtitle,
    levelCount: levels.length,
    passed: levels.filter((l) => l.passed).length,
    stars: levels.reduce((s, l) => s + l.bestStars, 0),
    wrongCount: wrongQuestionIds(profile, world.slug).length,
    levels,
  };
}

export function buildProfileResponse(profile: StoredProfile): ProfileResponse {
  return {
    coins: profile.coins,
    totalStars: totalStars(profile),
    skins: { equipped: profile.equippedSkin, owned: [...profile.ownedSkins] },
    worlds: WORLDS.map((w) => worldView(profile, w)),
  };
}
