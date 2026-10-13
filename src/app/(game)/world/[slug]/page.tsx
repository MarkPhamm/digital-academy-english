import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GameLoading } from "@/components/game/GameShell";
import { PLAYABLE_WORLDS, isWorldSlug } from "@/lib/game/worlds";
import WorldClient from "./WorldClient";

export const metadata = { title: "Bản đồ thế giới · Vũ trụ Tri thức" };

// Trang chặn (await params ngoài Suspense) để slug lạ trả 404 thật trước khi stream; các slug hợp lệ đã prerender
// nên vẫn vào tức thì. Tắt kiểm tra "instant" của dev overlay cho segment này.
export const instant = false;

/** Các thế giới cố định (WORLD_META) → prerender sẵn; slug lạ trả 404 thật (trước khi stream) nhờ notFound() ở ngoài Suspense. */
export function generateStaticParams() {
  return PLAYABLE_WORLDS.map((w) => ({ slug: w.slug }));
}

export default async function WorldPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isWorldSlug(slug)) notFound();
  // Dữ liệu học sinh tải ở client nên phần đó vẫn nằm trong Suspense.
  return (
    <Suspense fallback={<GameLoading />}>
      <WorldClient params={params} />
    </Suspense>
  );
}
