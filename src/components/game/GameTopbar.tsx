"use client";
import Link from "next/link";
import { useGameProfile } from "@/lib/game/profile-store";

/** Thanh trên của các trang game: thay StudentTopbar của repo gốc (chưa có đăng nhập nên không có tên/avatar/thoát). */
export default function GameTopbar({ back }: { back?: { href: string; label: string } }) {
  const { profile } = useGameProfile();
  return (
    <header className="topbar">
      <div className="topbar-left">
        {back ? (
          <Link href={back.href} className="btn btn-ghost btn-sm">← {back.label}</Link>
        ) : (
          <Link href="/" className="brand">🪐 Vũ trụ Tri thức</Link>
        )}
      </div>
      <div className="topbar-right">
        <Link href="/skins" className="chip">🛡️ Trang phục</Link>
        <span className="chip" aria-label="Xu">🪙 {profile ? profile.coins.toLocaleString("vi-VN") : "…"}</span>
        <span className="chip" aria-label="Sao">⭐ {profile?.totalStars ?? 0}</span>
        <Link href="/" className="btn btn-ghost btn-sm">Về trang chủ</Link>
      </div>
    </header>
  );
}
