/**
 * Ngân hàng câu hỏi đã đánh chỉ mục, id tất định (không cần database).
 * Nguồn: content/english/<slug>.csv → generated/banks.json (scripts/build-questions.mjs). Mỗi chủ đề trong CSV là một level.
 *  - levelId    = `${slug}-L${n}`        (n = 1..số chủ đề)
 *  - questionId = `${slug}-L${n}-Q${i}`  (i = 1..số câu của chủ đề)
 * CHỈ Netlify Function được import file này: nó chứa đáp án đúng.
 */
import { QUESTIONS_PER_LEVEL } from "../../../lib/game/rules";
import { WORLD_META, levelId } from "../../../lib/game/worlds";
import banks from "./generated/banks.json";
import type { GeneratedQuestion, WorldBank } from "./types";

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

export { levelId };
export const questionId = (slug: string, n: number, i: number) => `${slug}-L${n}-Q${i}`;

const BANKS = banks as WorldBank[];

const TRUE_FALSE_LABELS = { vi: ["Đúng", "Sai"], en: ["True", "False"] };

function toQuestion(q: GeneratedQuestion, slug: string, lang: "vi" | "en", n: number, i: number): BankQuestion {
  const base = { id: questionId(slug, n, i), levelId: levelId(slug, n), worldSlug: slug, levelNumber: n, index: i };
  if (q.type === "MCQ") {
    return { ...base, type: "MCQ", prompt: q.prompt, options: [...q.options], correctIndex: q.correctIndex, explanation: q.explanation };
  }
  return { ...base, type: "TRUE_FALSE", prompt: q.prompt, options: [...TRUE_FALSE_LABELS[lang]], correctIndex: q.correct ? 0 : 1, explanation: q.explanation };
}

/** Hành tinh chưa có file CSV thì bỏ qua (Trang chủ báo "sắp mở") thay vì làm hỏng cả game. */
function buildWorlds(): BankWorld[] {
  return WORLD_META.flatMap((meta) => {
    const bank = BANKS.find((b) => b.slug === meta.slug);
    if (!bank) {
      console.warn(`[game] Chưa có content/english/${meta.slug}.csv — hành tinh ${meta.slug} tạm ẩn.`);
      return [];
    }
    const thin = bank.levels.find((lv) => lv.questions.length < QUESTIONS_PER_LEVEL);
    if (thin) throw new Error(`Chủ đề "${thin.title}" của ${meta.slug} cần ít nhất ${QUESTIONS_PER_LEVEL} câu`);
    const levels: BankLevel[] = bank.levels.map((lv, li) => {
      const n = li + 1;
      return {
        id: levelId(meta.slug, n),
        worldSlug: meta.slug,
        number: n,
        title: lv.title,
        questions: lv.questions.map((q, qi) => toQuestion(q, meta.slug, meta.lang, n, qi + 1)),
      };
    });
    const { slug, name, subtitle, color, order } = meta;
    return { slug, name, subtitle, color, order, levels };
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
