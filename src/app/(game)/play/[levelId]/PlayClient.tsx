"use client";
import { useRouter } from "next/navigation";
import { Fragment, use } from "react";
import Game from "@/components/game/Game";
import { GameErrorCard } from "@/components/game/GameShell";
import BossGame from "@/components/game/boss/BossGame";
import { useGameProfile } from "@/lib/game/profile-store";
import { AVATAR_COLORS } from "@/lib/game/rules";

export default function PlayClient({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = use(params);
  const { bfcacheId } = useRouter();
  return (
    <Fragment key={bfcacheId}>
      <PlayView levelId={levelId} />
    </Fragment>
  );
}

function PlayView({ levelId }: { levelId: string }) {
  const { profile, error } = useGameProfile();
  if (error && !profile) return <GameErrorCard title="Chưa vào được level" message={error} />;
  if (!profile) {
    // Cùng hình với màn "Đang tải bản đồ…" của Game để không bị nháy.
    return (
      <div className="game-root">
        <div className="overlay" style={{ background: "#151a3d" }}>
          <p className="title-kid" style={{ color: "#fff", fontSize: 28 }}>Đang tải bản đồ…</p>
        </div>
      </div>
    );
  }
  const world = profile.worlds.find((w) => w.levels.some((l) => l.id === levelId));
  const level = world?.levels.find((l) => l.id === levelId);
  if (!world || !level) return <GameErrorCard title="Chưa vào được level" message="Không tìm thấy level này." />;
  if (!level.unlocked) {
    return <GameErrorCard title="Chưa vào được level" message="Level này còn khoá. Qua level trước để mở nhé!" href={`/world/${world.slug}`} label="Về danh sách level" />;
  }
  const skin = profile.skins.equipped;
  if (level.boss) return <BossGame key={levelId} levelId={levelId} worldSlug={world.slug} avatarColor={AVATAR_COLORS[0]} skin={skin} />;
  return <Game key={levelId} levelId={levelId} worldSlug={world.slug} avatarColor={AVATAR_COLORS[0]} skin={skin} />;
}
