import Anthropic from "@anthropic-ai/sdk";
import { CHAT_LIMITS, type ChatStreamEvent, type ChatTurn } from "@/lib/chat";

// Trợ lý AI trên Trang chủ học sinh: nhận lịch sử hội thoại (chỉ phần chữ), stream câu trả lời của Claude về
// dạng NDJSON — mỗi dòng một sự kiện ChatStreamEvent.

const MODEL = "claude-opus-5-5";
// Hỏi đáp ngắn cho học sinh: effort "low" cho phản hồi nhanh. max_tokens tính cả phần suy nghĩ của model.
const EFFORT = "low";
const MAX_TOKENS = 8192;

const SYSTEM_PROMPT = `Bạn là "Trợ lý AI" của Digital Academy — một người bạn đồng hành học tập của học sinh tiểu học và trung học cơ sở Việt Nam (khoảng 6–15 tuổi). Các em đang học các khóa như Tiếng Anh, Toán tư duy, Tiếng Việt, Tin học, Khoa học tự nhiên, Mỹ thuật và lập trình Scratch.

Cách trò chuyện:
- Trả lời bằng tiếng Việt, xưng "mình" và gọi học sinh là "bạn". Nếu học sinh viết bằng tiếng Anh hoặc đang luyện tiếng Anh, có thể trả lời bằng tiếng Anh đơn giản kèm giải thích tiếng Việt.
- Câu trả lời ngắn gọn, dễ hiểu với trẻ em, giọng vui vẻ và khích lệ. Ưu tiên ví dụ gần gũi trong đời sống.
- Khi học sinh hỏi bài tập, hãy gợi ý từng bước để các em tự nghĩ ra đáp án thay vì đưa ngay lời giải; nếu các em vẫn bí sau khi được gợi ý thì giải thích đầy đủ.
- Khung chat chỉ hiển thị chữ thường: không dùng Markdown (không dùng **, #, bảng). Có thể xuống dòng, dùng gạch đầu dòng "-" và một vài emoji.

An toàn:
- Chỉ nói về nội dung phù hợp với trẻ em. Với chủ đề không phù hợp, nhẹ nhàng từ chối và gợi ý quay lại chuyện học.
- Không hỏi hay khuyến khích chia sẻ thông tin cá nhân (họ tên đầy đủ, địa chỉ, số điện thoại, trường lớp, mật khẩu, ảnh).
- Nếu học sinh nói mình đang buồn, sợ hãi, bị bắt nạt hay gặp nguy hiểm, hãy đồng cảm và khuyên các em nói ngay với bố mẹ, thầy cô hoặc người lớn mà các em tin tưởng.`;

const MESSAGES = {
  invalid: "Tin nhắn không hợp lệ.",
  unavailable: "Trợ lý AI đang tạm nghỉ. Bạn thử lại sau nhé!",
  busy: "Nhiều bạn đang hỏi cùng lúc quá. Bạn đợi một chút rồi hỏi lại nhé!",
  failed: "Ôi, mình gặp chút trục trặc. Bạn hỏi lại giúp mình nhé!",
  refusal: "Câu này mình không trả lời được. Mình cùng nói về chuyện học nhé! 📚",
};

let client: Anthropic | null = null;

function getClient() {
  // Khởi tạo lúc có request đầu tiên (không phải lúc build), đọc ANTHROPIC_API_KEY từ môi trường.
  client ??= new Anthropic();
  return client;
}

function parseHistory(body: unknown): ChatTurn[] | null {
  if (typeof body !== "object" || body === null || !("messages" in body) || !Array.isArray(body.messages)) return null;
  const turns: ChatTurn[] = [];
  for (const item of body.messages as unknown[]) {
    if (typeof item !== "object" || item === null) return null;
    const { role, content } = item as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.trim();
    if (!text || text.length > CHAT_LIMITS.maxMessageChars) return null;
    turns.push({ role, content: text });
  }
  // Giới hạn đầu vào để một yêu cầu không thể đẩy chi phí lên quá cao: chỉ giữ các lượt gần nhất.
  const recent = turns.slice(-CHAT_LIMITS.maxHistoryMessages);
  // Hội thoại gửi lên API phải bắt đầu và kết thúc bằng lượt của học sinh.
  while (recent[0]?.role === "assistant") recent.shift();
  if (recent.at(-1)?.role !== "user") return null;
  return recent;
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

export async function POST(request: Request) {
  let history: ChatTurn[] | null = null;
  try {
    history = parseHistory(await request.json());
  } catch {
    // JSON hỏng — trả 400 bên dưới.
  }
  if (!history) return Response.json({ error: MESSAGES.invalid }, { status: 400 });

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
            system: SYSTEM_PROMPT,
            messages: history,
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
        if (message.stop_reason === "refusal") {
          send(controller, { type: "reset" });
          send(controller, { type: "text", text: MESSAGES.refusal });
        }
        send(controller, { type: "done", stopReason: message.stop_reason });
      } catch (error) {
        if (request.signal.aborted) return;
        console.error("[api/chat]", error);
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
