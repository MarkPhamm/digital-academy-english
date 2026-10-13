import type { Config, Context } from "@netlify/functions";
import type { ApiErrorBody } from "../../../src/lib/game/api-types";
import { answer, buySkin, equipSkin, finish, getProfile, getResult, startAttempt } from "./handlers";
import { resolveIdentity } from "./identity";
import { ApiError } from "./profile-store";
import { isAttemptId, parseAnswerBody, parseBuyBody, parseEquipBody, parseStartBody, readJson } from "./validate";

// Trò chơi "Vũ trụ Tri thức": một function phục vụ mọi đường dẫn /api/game/*. Học sinh được nhận diện bằng
// cookie thiết bị ẩn danh (identity.ts); hồ sơ (xu, trang phục, tiến độ, lượt chơi) nằm trong Netlify Blobs.
// Đáp án đúng chỉ ở phía server: trình duyệt chỉ nhận đáp án sau khi đã trả lời câu đó.

export const config: Config = {
  path: [
    "/api/game/profile",
    "/api/game/attempts",
    "/api/game/attempts/:id",
    "/api/game/attempts/:id/answer",
    "/api/game/attempts/:id/finish",
    "/api/game/skins/buy",
    "/api/game/skins/equip",
  ],
  method: ["GET", "POST"],
};

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    const body: ApiErrorBody = { error: error.message, code: error.code, ...error.extra };
    const headers: Record<string, string> = error.status === 503 ? { "Retry-After": "1" } : {};
    return json(body, error.status, headers);
  }
  console.error("[game]", error);
  return json({ error: "Ôi, có lỗi rồi. Em thử lại nhé!" } satisfies ApiErrorBody, 500);
}

async function route(request: Request, context: Context, userKey: string): Promise<Response> {
  const { pathname } = new URL(request.url);
  // Netlify thử lại các biến thể "đường dẫn đẹp" (.html, /index.html) khi function trả 403/404 → bỏ đuôi đó đi.
  const path = pathname.replace(/\/+$/, "").replace(/\/index\.html?$/, "").replace(/\.html?$/, "");
  const method = request.method;
  // Lấy id từ đường dẫn đã chuẩn hoá (context.params.id có thể dính đuôi .html khi Netlify thử lại).
  const m = /^\/api\/game\/attempts\/([^/]+)(?:\/(answer|finish))?$/.exec(path);
  const id = m?.[1] ?? context.params?.id;

  if (path === "/api/game/profile") {
    if (method !== "GET") throw new ApiError(405, "Sai phương thức.", "METHOD_NOT_ALLOWED");
    return json(await getProfile(userKey));
  }
  if (path === "/api/game/attempts") {
    if (method !== "POST") throw new ApiError(405, "Sai phương thức.", "METHOD_NOT_ALLOWED");
    return json(await startAttempt(userKey, parseStartBody(await readJson(request))));
  }
  if (path === "/api/game/skins/buy") {
    if (method !== "POST") throw new ApiError(405, "Sai phương thức.", "METHOD_NOT_ALLOWED");
    return json(await buySkin(userKey, parseBuyBody(await readJson(request))));
  }
  if (path === "/api/game/skins/equip") {
    if (method !== "POST") throw new ApiError(405, "Sai phương thức.", "METHOD_NOT_ALLOWED");
    return json(await equipSkin(userKey, parseEquipBody(await readJson(request))));
  }
  if (isAttemptId(id)) {
    if (path === `/api/game/attempts/${id}`) {
      if (method !== "GET") throw new ApiError(405, "Sai phương thức.", "METHOD_NOT_ALLOWED");
      return json(await getResult(userKey, id));
    }
    if (path === `/api/game/attempts/${id}/answer`) {
      if (method !== "POST") throw new ApiError(405, "Sai phương thức.", "METHOD_NOT_ALLOWED");
      return json(await answer(userKey, id, parseAnswerBody(await readJson(request))));
    }
    if (path === `/api/game/attempts/${id}/finish`) {
      if (method !== "POST") throw new ApiError(405, "Sai phương thức.", "METHOD_NOT_ALLOWED");
      return json(await finish(userKey, id));
    }
  }
  throw new ApiError(404, "Không tìm thấy.", "NOT_FOUND");
}

export default async function handler(request: Request, context: Context) {
  const identity = resolveIdentity(request);
  let response: Response;
  try {
    response = await route(request, context, identity.userKey);
  } catch (error) {
    response = errorResponse(error);
  }
  // Gắn cookie cả khi lỗi, để lần gọi sau vẫn dùng đúng một hồ sơ.
  if (identity.setCookie) response.headers.append("Set-Cookie", identity.setCookie);
  return response;
}
