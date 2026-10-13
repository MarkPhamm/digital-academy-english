"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, use } from "react";
import { GameErrorCard, GameLoading } from "@/components/game/GameShell";
import GameTopbar from "@/components/game/GameTopbar";
import Planet from "@/components/game/Planet";
import WorldMap from "@/components/game/WorldMap";
import { useGameProfile } from "@/lib/game/profile-store";
import { AVATAR_COLORS, QUESTIONS_PER_LEVEL, passMark } from "@/lib/game/rules";

export default function WorldClient({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { bfcacheId } = useRouter();
  return (
    <Fragment key={bfcacheId}>
      <WorldView slug={slug} />
    </Fragment>
  );
}

function WorldView({ slug }: { slug: string }) {
  const { profile, error } = useGameProfile();
  if (error && !profile) return <GameErrorCard title="Chưa tải được thế giới" message={error} />;
  if (!profile) return <GameLoading />;
  const world = profile.worlds.find((w) => w.slug === slug);
  if (!world) return <GameErrorCard title="Không tìm thấy thế giới" />;

  const levels = world.levels;
  const passedCount = levels.filter((l) => l.passed).length;
  const worldStars = levels.reduce((s, l) => s + l.bestStars, 0);
  // Đổi key khi tiến độ đổi (vd. vừa qua level rồi quay lại) để bản đồ vẽ lại nhà đã mở.
  const mapKey = levels.map((l) => `${l.unlocked ? 1 : 0}${l.passed ? 1 : 0}${l.bestStars}`).join("") + profile.skins.equipped;

  return (
    <main className="space-bg" style={{ ["--wc" as string]: world.color }}>
      <GameTopbar back={{ href: "/", label: "Chọn thế giới" }} />
      <div className="page world-page">
        <div className="levels-wrap">
          <aside className="world-side">
            <Planet slug={world.slug} color={world.color} size={180} />
            <h1 className="title-kid">{world.name}</h1>
            <p className="muted-light" style={{ margin: "4px 0 16px" }}>{world.subtitle}</p>
            <div className="bar"><i style={{ width: `${(passedCount / Math.max(1, levels.length)) * 100}%` }} /></div>
            <div className="world-meta">
              <span>Đã qua {passedCount}/{levels.length}</span>
              <span>⭐ {worldStars}/{levels.length * 3}</span>
            </div>
            <p className="muted-light" style={{ fontSize: 14, marginTop: 18, lineHeight: 1.5 }}>
              Điều khiển nhân vật đi tới từng ngôi nhà level. Mỗi level có {QUESTIONS_PER_LEVEL} câu hỏi rải trên bản đồ. Đúng từ {passMark(QUESTIONS_PER_LEVEL)} câu trở lên là qua level và mở level tiếp theo.
            </p>
            {world.wrongCount > 0 && (
              <Link href={`/review/${world.slug}`} className="btn btn-light btn-lg" style={{ marginTop: 16 }}>
                🛠️ Ôn lại {world.wrongCount} câu sai ▶
              </Link>
            )}
          </aside>
          <section className="levels">
            <WorldMap
              key={mapKey}
              slug={world.slug}
              avatarColor={AVATAR_COLORS[0]}
              skin={profile.skins.equipped}
              questionsPerLevel={QUESTIONS_PER_LEVEL}
              levels={levels.map((l) => ({ id: l.id, number: l.number, title: l.title, unlocked: l.unlocked, passed: l.passed, stars: l.bestStars, current: l.current, plays: l.plays, bestCorrect: l.bestCorrect }))}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
