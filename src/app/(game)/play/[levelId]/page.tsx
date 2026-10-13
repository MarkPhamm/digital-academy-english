import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GameLoading } from "@/components/game/GameShell";
import { ALL_LEVEL_IDS, isLevelId } from "@/lib/game/worlds";
import PlayClient from "./PlayClient";

export const metadata = { title: "Đang chơi · Vũ trụ Tri thức" };

// Trang chặn (await params ngoài Suspense) để slug lạ trả 404 thật trước khi stream; các slug hợp lệ đã prerender
// nên vẫn vào tức thì. Tắt kiểm tra "instant" của dev overlay cho segment này.
export const instant = false;

/** 20 level cố định → prerender sẵn; id lạ trả 404 thật. Level còn khoá vẫn do client báo (cần hồ sơ). */
export function generateStaticParams() {
  return ALL_LEVEL_IDS.map((levelId) => ({ levelId }));
}

export default async function PlayPage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await params;
  if (!isLevelId(levelId)) notFound();
  return (
    <Suspense fallback={<GameLoading text="Đang tải bản đồ…" />}>
      <PlayClient params={params} />
    </Suspense>
  );
}
