import { readFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import type { Config, Context } from "@netlify/functions";
import { CHAT_LIMITS, type ChatStreamEvent, type ChatTurn } from "../../../src/lib/chat";
import { consume } from "./rate-limit";

// Trợ lý AI trên Trang chủ học sinh: nhận lịch sử hội thoại (chỉ phần chữ), stream câu trả lời của Claude về
// dạng NDJSON — mỗi dòng một sự kiện ChatStreamEvent. API key chỉ đọc từ biến môi trường phía server.

export const config: Config = { path: "/api/chat", method: "POST" };

const MODEL = "claude-opus-5-5";
// Hỏi đáp ngắn cho học sinh: effort "low" cho phản hồi nhanh. Opus 5.5 luôn suy nghĩ trước khi trả lời và
// max_tokens tính cả phần suy nghĩ đó, nên system prompt yêu cầu câu trả lời ngắn để vừa giới hạn.
const EFFORT = "low";
const MAX_TOKENS = 400;

// File được đóng gói cùng function nhờ included_files trong netlify.toml.
const PROMPT_FILE = "netlify/functions/prompts/tutor.txt";

const MESSAGES = {
  invalid: "Tin nhắn không hợp lệ.",
  unavailable: "Trợ lý AI đang tạm nghỉ. Bạn thử lại sau nhé!",
  busy: "Nhiều bạn đang hỏi cùng lúc quá. Bạn đợi một chút rồi hỏi lại nhé!",
  failed: "Ôi, mình gặp chút trục trặc. Bạn hỏi lại giúp mình nhé!",
  refusal: "Câu này mình không trả lời được. Mình cùng nói về chuyện học nhé! 📚",
  limited: (minutes: number) =>
    `Bạn đã hỏi mình ${CHAT_LIMITS.messagesPerHour} câu trong một giờ rồi đó! 🌟 Mình nghỉ một chút nhé, khoảng ${minutes} phút nữa mình lại trò chuyện tiếp.`,
};

let client: Anthropic | null = null;
let systemPrompt: Promise<string> | null = null;

function getClient() {
  // Khởi tạo lúc có request đầu tiên, đọc ANTHROPIC_API_KEY từ môi trường.
  client ??= new Anthropic();
  return client;
}

function loadSystemPrompt() {
  // Khi chạy `netlify dev` thư mục làm việc là gốc project; khi deploy, file nằm cạnh bundle của function.
  const candidates = [path.resolve(PROMPT_FILE), new URL(`../../../${PROMPT_FILE}`, import.meta.url)];
  systemPrompt ??= (async () => {
    for (const file of candidates) {
      try {
        return (await readFile(file, "utf8")).trim();
      } catch {
        // Thử vị trí tiếp theo.
      }
    }
    throw new Error(`Không tìm thấy ${PROMPT_FILE}`);
  })().catch((error) => {
    systemPrompt = null;
    throw error;
  });
  return systemPrompt;
}

function parseHistory(body: unknown): ChatTurn[] | null {
  if (typeof body !== "object" || body === null || !("messages" in body) || !Array.isArray(body.messages)) return null;
  const turns: ChatTurn[] = [];
  // Chỉ giữ các tin gần nhất và cắt bớt tin quá dài để một yêu cầu không thể đẩy chi phí lên cao.
  for (const item of (body.messages as unknown[]).slice(-CHAT_LIMITS.maxHistoryMessages)) {
    if (typeof item !== "object" || item === null) return null;
    const { role, content } = item as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.trim().slice(0, CHAT_LIMITS.maxMessageChars);
    if (text) turns.push({ role, content: text });
  }
  // Hội thoại gửi lên API phải bắt đầu và kết thúc bằng lượt của học sinh.
  while (turns[0]?.role === "assistant") turns.shift();
  if (turns.at(-1)?.role !== "user") return null;
  return turns;
}

function errorMessage(error: unknown) {
  if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) return MESSAGES.busy;
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return MESSAGES.unavailable;
  }
  if (error instanceof Anthropic.AnthropicError && !(error instanceof Anthropic.APIError)) {
    // Lỗi phía client của SDK, vd. chưa cấu hình ANTHROPIC_API_KEY.
    return MESSAGES.unavailable;
  }
  return MESSAGES.failed;
}

export default async function handler(request: Request, context: Context) {
  let history: ChatTurn[] | null = null;
  try {
    history = parseHistory(await request.json());
  } catch {
    // JSON hỏng — trả 400 bên dưới.
  }
  if (!history) return Response.json({ error: MESSAGES.invalid }, { status: 400 });

  try {
    const limit = await consume(context.ip, CHAT_LIMITS.messagesPerHour);
    if (!limit.allowed && limit.reason === "contention") {
      return Response.json({ error: MESSAGES.busy }, { status: 429, headers: { "Retry-After": "5" } });
    }
    if (!limit.allowed) {
      return Response.json(
        { error: MESSAGES.limited(Math.max(1, Math.ceil(limit.retryAfterSeconds / 60))) },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }
  } catch (error) {
    // Kho Blobs lỗi: vẫn cho học sinh hỏi, chỉ ghi log.
    console.error("[chat] rate limit", error);
  }

  let system: string;
  try {
    system = await loadSystemPrompt();
  } catch (error) {
    console.error("[chat]", error);
    return Response.json({ error: MESSAGES.unavailable }, { status: 500 });
  }

  const turns = history;
  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController<Uint8Array>, event: ChatStreamEvent) =>
    controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
  let stream: ReturnType<Anthropic["beta"]["messages"]["stream"]> | null = null;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        stream = getClient().beta.messages.stream(
          {
            model: MODEL,
            max_tokens: MAX_TOKENS,
            output_config: { effort: EFFORT },
            // Nếu bộ lọc an toàn của model chính từ chối, API tự chạy lại trên model dự phòng phù hợp.
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            // System prompt giống hệt nhau ở mọi yêu cầu nên được cache, các lượt sau chỉ tốn ~1/10 giá đọc.
            system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
            messages: turns,
          },
          { signal: request.signal },
        );

        for await (const event of stream) {
          if (event.type === "content_block_start" && event.content_block.type === "fallback") {
            send(controller, { type: "reset" });
          } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send(controller, { type: "text", text: event.delta.text });
          }
        }

        const message = await stream.finalMessage();
        const { input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens } = message.usage;
        console.log("[chat] usage", { input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens });
        if (message.stop_reason === "refusal") {
          send(controller, { type: "reset" });
          send(controller, { type: "text", text: MESSAGES.refusal });
        } else if (message.stop_reason === "max_tokens") {
          send(controller, { type: "text", text: "…" });
        }
        send(controller, { type: "done", stopReason: message.stop_reason });
      } catch (error) {
        if (request.signal.aborted) return;
        console.error("[chat]", error);
        send(controller, { type: "error", message: errorMessage(error) });
      } finally {
        try {
          controller.close();
        } catch {
          // Stream đã bị huỷ phía client.
        }
      }
    },
    cancel() {
      stream?.abort();
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
