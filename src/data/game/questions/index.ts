/**
 * Ngân hàng câu hỏi đã đánh chỉ mục, id tất định (không cần database).
 *  - levelId    = `${slug}-L${n}`        (n = 1..5)
 *  - questionId = `${slug}-L${n}-Q${i}`  (i = 1..15)
 * CHỈ Netlify Function được import file này: nó chứa đáp án đúng.
 */
import { WORLD_META } from "../../../lib/game/worlds";
import ai from "./ai-cong-nghe";
import cyber from "./cyber-world";
import english from "./tieng-anh";
import math from "./toan-ly-hoa";
import type { QuestionRow, WorldBank } from "./types";

export type QuestionType = "MCQ" | "TRUE_FALSE";

export type BankQuestion = {
  id: string;
  levelId: string;
  worldSlug: string;
  levelNumber: number;
  index: number;
  type: QuestionType;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type BankLevel = { id: string; worldSlug: string; number: number; title: string; questions: BankQuestion[] };

export type BankWorld = {
  slug: string;
  name: string;
  subtitle: string;
  color: string;
  order: number;
  levels: BankLevel[];
};

export const levelId = (slug: string, n: number) => `${slug}-L${n}`;
export const questionId = (slug: string, n: number, i: number) => `${slug}-L${n}-Q${i}`;

const BANKS: WorldBank[] = [ai, math, english, cyber];

function rowToQuestion(row: QuestionRow, slug: string, n: number, i: number): BankQuestion {
  const base = { id: questionId(slug, n, i), levelId: levelId(slug, n), worldSlug: slug, levelNumber: n, index: i };
  if (row[0] === "m") {
    return { ...base, type: "MCQ", prompt: row[1], options: [...row[2]], correctIndex: row[3], explanation: row[4] };
  }
  return { ...base, type: "TRUE_FALSE", prompt: row[1], options: ["Đúng", "Sai"], correctIndex: row[2] ? 0 : 1, explanation: row[3] };
}

function buildWorlds(): BankWorld[] {
  return WORLD_META.map((meta) => {
    const bank = BANKS.find((b) => b.slug === meta.slug);
    if (!bank) throw new Error(`Thiếu ngân hàng câu hỏi cho thế giới ${meta.slug}`);
    const levels: BankLevel[] = bank.levels.map((lv, li) => {
      const n = li + 1;
      return {
        id: levelId(meta.slug, n),
        worldSlug: meta.slug,
        number: n,
        title: lv.title,
        questions: lv.questions.map((row, qi) => rowToQuestion(row, meta.slug, n, qi + 1)),
      };
    });
    return { ...meta, levels };
  });
}

export const WORLDS: BankWorld[] = buildWorlds();

const worldBySlug = new Map(WORLDS.map((w) => [w.slug, w]));
const levelById = new Map<string, BankLevel>();
const questionById = new Map<string, BankQuestion>();
for (const w of WORLDS) {
  for (const l of w.levels) {
    levelById.set(l.id, l);
    for (const q of l.questions) questionById.set(q.id, q);
  }
}

export function getWorld(slug: string): BankWorld | undefined {
  return worldBySlug.get(slug);
}
export function getLevel(id: string): BankLevel | undefined {
  return levelById.get(id);
}
export function getQuestion(id: string): BankQuestion | undefined {
  return questionById.get(id);
}
/** Level kế tiếp trong cùng thế giới, không có thì undefined. */
export function nextLevel(id: string): BankLevel | undefined {
  const l = levelById.get(id);
  if (!l) return undefined;
  return worldBySlug.get(l.worldSlug)?.levels.find((x) => x.number === l.number + 1);
}
