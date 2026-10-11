import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";

// Giới hạn số tin mỗi IP theo cửa sổ cố định, lưu trong Netlify Blobs. Rate limit có sẵn của Netlify chỉ hỗ trợ
// cửa sổ tối đa 180 giây nên không dùng được cho giới hạn theo giờ.

const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 6;

type Window = { start: number; count: number };

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "limit"; retryAfterSeconds: number }
  /** Quá nhiều yêu cầu cùng IP gửi đồng thời. */
  | { allowed: false; reason: "contention" };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Ghi nhận một tin của `clientId` và cho biết còn được gửi không. */
export async function consume(clientId: string, limit: number, now = Date.now()): Promise<RateLimitResult> {
  const store = getStore({ name: "chat-rate-limit", consistency: "strong" });
  // Không lưu IP thô của học sinh, chỉ lưu mã băm.
  const key = createHash("sha256").update(clientId).digest("hex").slice(0, 32);

  // Ghi có điều kiện theo etag: nếu hai yêu cầu cùng IP chen nhau thì yêu cầu ghi sau đọc lại và thử tiếp.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(Math.random() * 50 * attempt);
    const entry = await store.getWithMetadata(key, { type: "json" });
    const current = entry?.data as Window | undefined;
    const window: Window =
      current && now - current.start < WINDOW_MS ? { ...current } : { start: now, count: 0 };

    if (window.count >= limit) {
      return { allowed: false, reason: "limit", retryAfterSeconds: Math.ceil((window.start + WINDOW_MS - now) / 1000) };
    }
    window.count += 1;

    const { modified } = entry
      ? await store.setJSON(key, window, { onlyIfMatch: entry.etag })
      : await store.setJSON(key, window, { onlyIfNew: true });
    if (modified) return { allowed: true };
  }
  // Khung chat chỉ gửi một tin mỗi lần, nên tranh chấp kéo dài nghĩa là có ai đó gửi dồn dập: chặn lại,
  // nếu cho qua thì giới hạn bị vượt.
  return { allowed: false, reason: "contention" };
}
