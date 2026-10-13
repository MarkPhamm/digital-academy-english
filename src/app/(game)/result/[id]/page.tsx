import { Suspense } from "react";
import { GameLoading } from "@/components/game/GameShell";
import ResultClient from "./ResultClient";

export const metadata = { title: "Kết quả · Vũ trụ Tri thức" };

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<GameLoading text="Đang tính sao…" />}>
      <ResultClient params={params} />
    </Suspense>
  );
}
