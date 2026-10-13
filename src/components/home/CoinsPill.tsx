"use client";
import { useGameProfile } from "@/lib/game/profile-store";
import { CurrencyPill } from "./CurrencyPill";

/** Số xu thật của học sinh (từ game "Vũ trụ Tri thức"). Lần gọi đầu cũng là lúc server cấp cookie định danh. */
export function CoinsPill() {
  const { profile } = useGameProfile();
  return <CurrencyPill className="left-[16px]" textClassName="left-[24px]" label="Xu" value={profile ? profile.coins.toLocaleString("vi-VN") : "…"} />;
}
