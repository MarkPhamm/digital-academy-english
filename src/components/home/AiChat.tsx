"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { CHAT_LIMITS, type ChatStreamEvent, type ChatTurn } from "@/lib/chat";

type ChatMessage = ChatTurn & {
  id: number;
  /** "streaming": đang nhận câu trả lời; "error": câu trả lời lỗi (không gửi lại trong lịch sử). */
  status?: "streaming" | "error";
  /** Lỗi do hỏi quá nhiều trong một giờ: hỏi lại ngay cũng không được nên ẩn nút "Thử lại". */
  limited?: boolean;
};

const GREETING = "Chào bạn! Mình là Trợ lý AI 🤖 Bạn cần mình giúp gì về bài học hôm nay?";
const NETWORK_ERROR = "Mất kết nối rồi. Bạn kiểm tra mạng và thử lại nhé!";
const SERVER_ERROR = "Ôi, mình gặp chút trục trặc. Bạn hỏi lại giúp mình nhé!";

// Vị trí theo khung 1440×900: mascot ở (1284,566) 110×124; khung chat nằm ngay phía trên, sát mép phải.
const PANEL = { left: 976, top: 128, width: 424, height: 424 };

let nextId = 0;

/** Mascot Trợ lý AI ở góc phải Trang chủ; bấm vào mở khung trò chuyện với Claude (Netlify Function /api/chat). */
export function AiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const busy = messages.some((m) => m.status === "streaming");

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    // Escape đóng khung chat dù focus đang ở đâu (vd. nút "Dừng" vừa biến mất), rồi trả focus về mascot.
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Cuộn xuống cuối khi có tin nhắn mới hoặc câu trả lời đang chạy chữ.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const updateMessage = (id: number, update: (message: ChatMessage) => ChatMessage) =>
    setMessages((list) => list.map((m) => (m.id === id ? update(m) : m)));

  const ask = async (history: ChatMessage[]) => {
    const replyId = nextId++;
    setMessages([...history, { id: replyId, role: "assistant", content: "", status: "streaming" }]);
    const controller = new AbortController();
    abortRef.current = controller;

    const finish = (status?: "error", content?: string, limited?: boolean) =>
      updateMessage(replyId, (m) => ({ ...m, status, limited, content: content ?? m.content }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Câu trả lời lỗi không gửi lại — hai lượt "user" liền nhau vẫn hợp lệ với API.
        body: JSON.stringify({
          messages: history
            .filter((m) => m.status !== "error" && m.content)
            .map(({ role, content }): ChatTurn => ({ role, content })),
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        finish("error", data?.error ?? SERVER_ERROR, response.status === 429);
        return;
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let failed = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ChatStreamEvent;
          if (event.type === "text") updateMessage(replyId, (m) => ({ ...m, content: m.content + event.text }));
          else if (event.type === "reset") updateMessage(replyId, (m) => ({ ...m, content: "" }));
          else if (event.type === "error") {
            failed = true;
            finish("error", event.message);
          }
        }
      }
      if (!failed) finish();
    } catch {
      if (!controller.signal.aborted) finish("error", NETWORK_ERROR);
      // Bấm "Dừng": giữ phần đã trả lời, bỏ bong bóng nếu chưa có chữ nào.
      else setMessages((list) => list.flatMap((m) => (m.id !== replyId ? [m] : m.content ? [{ ...m, status: undefined }] : [])));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    void ask([...messages, { id: nextId++, role: "user", content: text }]);
  };

  // Hỏi lại câu cuối cùng sau khi câu trả lời bị lỗi.
  const retry = () => {
    if (busy) return;
    void ask(messages.filter((m) => m.status !== "error"));
  };

  // Xoá hội thoại để bắt đầu chủ đề mới; dừng câu trả lời đang chạy nếu có.
  const restart = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    inputRef.current?.focus();
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) send(event);
  };

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        aria-label={open ? "Đóng Trợ lý AI" : "Mở Trợ lý AI"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="group absolute left-[1284px] top-[566px] h-[124px] w-[110px] cursor-pointer outline-none"
      >
        <img
          src="/home/scene/ai-mascot.webp"
          alt=""
          draggable={false}
          className="size-full -scale-x-100 object-cover transition-[transform,filter] duration-200 ease-out group-hover:-translate-y-[3px] group-hover:brightness-110 group-focus-visible:-translate-y-[3px] group-focus-visible:brightness-110 group-active:translate-y-0"
        />
      </button>

      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-label="Trợ lý AI"
          className="absolute z-[300] flex flex-col overflow-hidden rounded-[24px] border border-[rgba(143,220,255,0.7)] bg-[rgba(8,22,92,0.92)] shadow-[0px_10px_24px_0px_rgba(3,18,60,0.5),0px_6px_26px_0px_rgba(57,180,255,0.45)] backdrop-blur-md"
          style={PANEL}
        >
          <header className="flex h-[56px] shrink-0 items-center justify-between bg-gradient-to-b from-[rgba(42,99,222,0.92)] to-[rgba(19,50,127,0.62)] px-[20px]">
            <h2 className="text-[20px] font-bold leading-none">Trợ lý AI</h2>
            <div className="flex items-center gap-[6px]">
              <button
                type="button"
                onClick={restart}
                disabled={messages.length === 0}
                className="h-[32px] cursor-pointer rounded-full bg-white/15 px-[12px] text-[14px] font-bold outline-none transition-colors hover:bg-white/25 focus-visible:bg-white/25 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white/15"
              >
                ↺ Bắt đầu lại
              </button>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setOpen(false)}
                className="flex size-[32px] cursor-pointer items-center justify-center rounded-full text-[22px] leading-none text-white/80 outline-none transition-colors hover:bg-white/15 hover:text-white focus-visible:bg-white/15"
              >
                ×
              </button>
            </div>
          </header>

          <div
            ref={listRef}
            aria-live="polite"
            className="flex flex-1 flex-col gap-[10px] overflow-y-auto overscroll-contain px-[16px] py-[14px]"
          >
            <Bubble role="assistant">{GREETING}</Bubble>
            {messages.map((message) => (
              <Bubble key={message.id} role={message.role} error={message.status === "error"}>
                {message.status === "streaming" && !message.content ? <TypingDots /> : message.content}
                {message.status === "error" && !message.limited && (
                  <button
                    type="button"
                    onClick={retry}
                    className="ml-[8px] cursor-pointer font-bold text-[#ffd159] underline underline-offset-2 outline-none hover:brightness-110 focus-visible:brightness-110"
                  >
                    Thử lại
                  </button>
                )}
              </Bubble>
            ))}
          </div>

          <form onSubmit={send} className="flex shrink-0 items-end gap-[8px] border-t border-[rgba(107,184,255,0.24)] p-[12px]">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={CHAT_LIMITS.maxMessageChars}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Hỏi mình bất cứ điều gì…"
              aria-label="Tin nhắn cho Trợ lý AI"
              className="max-h-[96px] min-h-[44px] flex-1 resize-none rounded-[14px] bg-white/10 px-[14px] py-[10px] text-[16px] leading-[24px] text-white outline-none [field-sizing:content] placeholder:text-white/50 focus:bg-white/15"
            />
            {busy ? (
              <button
                type="button"
                onClick={() => {
                  abortRef.current?.abort();
                  inputRef.current?.focus();
                }}
                className="h-[44px] shrink-0 cursor-pointer rounded-[14px] bg-white/15 px-[16px] text-[16px] font-bold outline-none hover:bg-white/25 focus-visible:bg-white/25"
              >
                Dừng
              </button>
            ) : (
              <button
                type="submit"
                disabled={!draft.trim()}
                className="h-[44px] shrink-0 cursor-pointer rounded-[14px] bg-[#0054d3] px-[18px] text-[16px] font-bold outline-none transition-[filter] hover:brightness-115 focus-visible:brightness-115 disabled:cursor-default disabled:opacity-50 disabled:hover:brightness-100"
              >
                Gửi
              </button>
            )}
          </form>
        </section>
      )}
    </>
  );
}

function Bubble({ role, error, children }: { role: ChatTurn["role"]; error?: boolean; children: ReactNode }) {
  const mine = role === "user";
  return (
    <div
      className={`max-w-[85%] whitespace-pre-wrap break-words rounded-[18px] px-[14px] py-[9px] text-[16px] leading-[24px] ${
        mine
          ? "self-end rounded-br-[6px] bg-[#0054d3]"
          : error
            ? "self-start rounded-bl-[6px] bg-[rgba(220,38,38,0.28)]"
            : "self-start rounded-bl-[6px] bg-white/12"
      }`}
    >
      {children}
    </div>
  );
}

function TypingDots() {
  return (
    <span aria-label="Trợ lý AI đang trả lời" className="inline-flex h-[24px] items-center gap-[5px]">
      {[0, 160, 320].map((delay) => (
        <span
          key={delay}
          className="size-[7px] rounded-full bg-white/70 motion-safe:animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
