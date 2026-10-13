import type { Config, Context } from "@netlify/functions";
import { handleGameRequest } from "./router";

// Trò chơi "Vũ trụ Tri thức": một function phục vụ mọi đường dẫn /api/game/*. Học sinh được nhận diện bằng
// cookie thiết bị ẩn danh (identity.ts); hồ sơ (xu, trang phục, tiến độ, lượt chơi) nằm trong Netlify Blobs.
// Đáp án đúng chỉ ở phía server: trình duyệt chỉ nhận đáp án sau khi đã trả lời câu đó.
// Logic định tuyến ở router.ts, dùng chung với route handler của Next cho `next dev`.

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

export default async function handler(request: Request, context: Context) {
  return handleGameRequest(request, context.params);
}
