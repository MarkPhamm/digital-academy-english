import { handleGameRequest } from "../../../../../netlify/functions/game/router";

// Để game chạy được với `npm run dev` trần (không qua `netlify dev`): cùng bộ định tuyến với Netlify Function
// netlify/functions/game/game.mts. Trên Netlify, function với config.path phục vụ /api/game/* trước route này.
// Không có môi trường Blobs thì hồ sơ lưu tạm ở .netlify/blobs-dev/ (xem store.ts).

export async function GET(request: Request) {
  return handleGameRequest(request);
}

export async function POST(request: Request) {
  return handleGameRequest(request);
}
