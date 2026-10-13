import { Suspense } from "react";
import { GameLoading } from "@/components/game/GameShell";
import PlayClient from "./PlayClient";

export const metadata = { title: "Đang chơi · Vũ trụ Tri thức" };

export default function PlayPage({ params }: { params: Promise<{ levelId: string }> }) {
  return (
    <Suspense fallback={<GameLoading text="Đang tải bản đồ…" />}>
      <PlayClient params={params} />
    </Suspense>
  );
}
