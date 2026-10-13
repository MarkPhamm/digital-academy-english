import { Suspense } from "react";
import { GameLoading } from "@/components/game/GameShell";
import WorldClient from "./WorldClient";

export const metadata = { title: "Bản đồ thế giới · Vũ trụ Tri thức" };

// params là dữ liệu lúc chạy (cacheComponents) nên phải nằm trong Suspense; phần dữ liệu học sinh tải ở client.
export default function WorldPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<GameLoading />}>
      <WorldClient params={params} />
    </Suspense>
  );
}
