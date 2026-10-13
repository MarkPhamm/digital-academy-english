import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GameLoading } from "@/components/game/GameShell";
import { WORLD_META, isWorldSlug } from "@/lib/game/worlds";
import ReviewClient from "./ReviewClient";

export const metadata = { title: "Ôn tập · Vũ trụ Tri thức" };

// Trang chặn (await params ngoài Suspense) để slug lạ trả 404 thật trước khi stream; các slug hợp lệ đã prerender
// nên vẫn vào tức thì. Tắt kiểm tra "instant" của dev overlay cho segment này.
export const instant = false;

export function generateStaticParams() {
  return WORLD_META.map((w) => ({ slug: w.slug }));
}

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isWorldSlug(slug)) notFound();
  return (
    <Suspense fallback={<GameLoading text="Đang tải bản đồ…" />}>
      <ReviewClient params={params} />
    </Suspense>
  );
}
