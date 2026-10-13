import { createHash, randomUUID } from "node:crypto";

// Định danh ẩn danh theo thiết bị: cookie httpOnly chứa UUID, hồ sơ lưu theo mã băm của UUID.
// Đây là nơi DUY NHẤT biết về cookie — sau này có đăng nhập thật thì chỉ cần thay hàm resolveIdentity.

export const DEVICE_COOKIE = "da_device";
const MAX_AGE = 365 * 24 * 60 * 60; // 1 năm
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type Identity = {
  /** khoá hồ sơ trong Blobs */
  userKey: string;
  /** header Set-Cookie cần gắn vào response khi vừa cấp id mới, không thì null */
  setCookie: string | null;
};

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export function resolveIdentity(request: Request): Identity {
  let id = readCookie(request.headers.get("cookie"), DEVICE_COOKIE);
  let setCookie: string | null = null;
  if (!id || !UUID_RE.test(id)) {
    id = randomUUID();
    const secure = new URL(request.url).protocol === "https:";
    setCookie = `${DEVICE_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure ? "; Secure" : ""}`;
  }
  const userKey = createHash("sha256").update(id).digest("hex").slice(0, 32);
  return { userKey, setCookie };
}
