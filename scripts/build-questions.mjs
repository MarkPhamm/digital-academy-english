#!/usr/bin/env node
/**
 * Đọc ngân hàng câu hỏi từ content/english/<slug>.csv → sinh 2 file JSON trong src/data/game/questions/generated/:
 *  - banks.json   : đầy đủ, CÓ đáp án — chỉ Netlify Function được import.
 *  - catalog.json : slug → tên các level, KHÔNG có đáp án — an toàn cho trình duyệt.
 * Chạy: `npm run questions` (tự chạy trước `npm run dev` và `npm run build`). Định dạng CSV: xem content/english/README.md.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "content", "english");
const OUT_DIR = join(ROOT, "src", "data", "game", "questions", "generated");
/** Phải khớp QUESTIONS_PER_LEVEL trong src/lib/game/rules.ts: mỗi lượt chơi rút 10 câu từ một chủ đề. */
const MIN_QUESTIONS_PER_TOPIC = 10;
const COLUMNS = ["topic", "type", "question", "option_a", "option_b", "option_c", "option_d", "answer", "explanation"];

/** Tách CSV theo RFC 4180: hỗ trợ ô có dấu phẩy, xuống dòng và "" bên trong dấu ngoặc kép; bỏ BOM của Excel. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const TRUE_WORDS = ["true", "t", "đúng", "dung", "yes"];
const FALSE_WORDS = ["false", "f", "sai", "no"];

function readBank(file) {
  const slug = basename(file, ".csv");
  const errors = [];
  const rows = parseCsv(readFileSync(file, "utf8"));
  const header = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  const col = Object.fromEntries(COLUMNS.map((c) => [c, header.indexOf(c)]));
  const missing = COLUMNS.filter((c) => col[c] < 0);
  if (missing.length) return { slug, errors: [`${slug}.csv: thiếu cột ${missing.join(", ")}`] };

  const levels = [];
  rows.forEach((cells, i) => {
    const line = i + 2; // dòng 1 là tiêu đề
    const get = (c) => (cells[col[c]] ?? "").trim();
    if (cells.every((c) => c.trim() === "")) return;
    const err = (msg) => errors.push(`${slug}.csv dòng ${line}: ${msg}`);
    const topic = get("topic");
    const type = get("type").toLowerCase();
    const prompt = get("question");
    const explanation = get("explanation");
    const answer = get("answer");
    if (!topic) return err("thiếu topic");
    if (!prompt) return err("thiếu question");
    if (!explanation) return err("thiếu explanation");

    let q;
    if (type === "mcq") {
      const options = ["option_a", "option_b", "option_c", "option_d"].map(get);
      if (options.some((o) => !o)) return err("câu mcq cần đủ 4 đáp án option_a..option_d");
      if (new Set(options.map((o) => o.toLowerCase())).size !== 4) return err("4 đáp án phải khác nhau");
      const correctIndex = "ABCD".indexOf(answer.toUpperCase());
      if (answer.length !== 1 || correctIndex < 0) return err(`answer của câu mcq phải là A, B, C hoặc D (đang là "${answer}")`);
      q = { type: "MCQ", prompt, options, correctIndex, explanation };
    } else if (type === "tf") {
      const a = answer.toLowerCase();
      if (!TRUE_WORDS.includes(a) && !FALSE_WORDS.includes(a)) return err(`answer của câu tf phải là true hoặc false (đang là "${answer}")`);
      q = { type: "TRUE_FALSE", prompt, correct: TRUE_WORDS.includes(a), explanation };
    } else return err(`type phải là mcq hoặc tf (đang là "${get("type")}")`);

    let level = levels.find((l) => l.title === topic);
    if (!level) levels.push((level = { title: topic, questions: [] }));
    level.questions.push(q);
  });

  if (levels.length === 0) errors.push(`${slug}.csv: chưa có câu hỏi nào`);
  for (const l of levels)
    if (l.questions.length < MIN_QUESTIONS_PER_TOPIC)
      errors.push(`${slug}.csv: chủ đề "${l.title}" mới có ${l.questions.length} câu, cần ít nhất ${MIN_QUESTIONS_PER_TOPIC}`);
  return { slug, levels, errors };
}

const files = readdirSync(CONTENT_DIR)
  .filter((f) => f.endsWith(".csv"))
  .sort()
  .map((f) => join(CONTENT_DIR, f));
const banks = files.map(readBank);
const errors = banks.flatMap((b) => b.errors);
if (errors.length) {
  console.error(`✗ Ngân hàng câu hỏi có ${errors.length} lỗi:\n  ` + errors.join("\n  "));
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const write = (name, data) => writeFileSync(join(OUT_DIR, name), JSON.stringify(data, null, 1) + "\n");
write("banks.json", banks.map(({ slug, levels }) => ({ slug, levels })));
write("catalog.json", Object.fromEntries(banks.map(({ slug, levels }) => [slug, levels.map((l) => l.title)])));
const total = banks.reduce((s, b) => s + b.levels.reduce((t, l) => t + l.questions.length, 0), 0);
console.log(`✓ ${banks.length} hành tinh, ${banks.reduce((s, b) => s + b.levels.length, 0)} level, ${total} câu hỏi → src/data/game/questions/generated/`);
