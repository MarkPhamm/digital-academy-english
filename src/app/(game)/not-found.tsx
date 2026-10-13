import { GameErrorCard } from "@/components/game/GameShell";

export const metadata = { title: "Không tìm thấy · Vũ trụ Tri thức" };

/** 404 cho /world, /play, /review với slug hoặc level không tồn tại. */
export default function GameNotFound() {
  return <GameErrorCard title="Không tìm thấy trang này" message="Hành tinh hoặc level em tìm không có trong Vũ trụ Tri thức." />;
}
