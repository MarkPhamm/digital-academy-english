"use client";
import { useRouter } from "next/navigation";
import { Fragment, use } from "react";
import Game from "@/components/game/Game";
import { GameErrorCard } from "@/components/game/GameShell";
import { useGameProfile } from "@/lib/game/profile-store";
import { AVATAR_COLORS } from "@/lib/game/rules";

export default function ReviewClient({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { bfcacheId } = useRouter();
  return (
    <Fragment key={bfcacheId}>
      <ReviewView slug={slug} />
    </Fragment>
  );
}

function ReviewView({ slug }: { slug: string }) {
  const { profile, error } = useGameProfile();
  if (error && !profile) return <GameErrorCard title="Chưa vào được ôn tập" message={error} />;
  if (!profile) {
    return (
      <div className="game-root">
        <div className="overlay" style={{ background: "#151a3d" }}>
          <p className="title-kid" style={{ color: "#fff", fontSize: 28 }}>Đang tải bản đồ…</p>
        </div>
      </div>
    );
  }
  // Không còn câu sai → server trả 409 và Game hiện thẻ lỗi với nút "Về các thế giới".
  return <Game key={slug} review worldSlug={slug} avatarColor={AVATAR_COLORS[0]} skin={profile.skins.equipped} />;
}
