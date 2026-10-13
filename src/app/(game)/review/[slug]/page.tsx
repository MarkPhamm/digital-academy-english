import { Suspense } from "react";
import { GameLoading } from "@/components/game/GameShell";
import ReviewClient from "./ReviewClient";

export const metadata = { title: "Ôn tập · Vũ trụ Tri thức" };

export default function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<GameLoading text="Đang tải bản đồ…" />}>
      <ReviewClient params={params} />
    </Suspense>
  );
}
