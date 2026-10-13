import type { Metadata } from "next";
import pkg from "../../../package.json";
import "./game.css";

export const metadata: Metadata = {
  title: "Vũ trụ Tri thức · Digital Academy",
  description: "Game học tập: chọn hành tinh, vượt level, trả lời câu hỏi trên bản đồ mở.",
};

/** Layout chung cho các trang game (/world, /play, /result, /review, /skins): bọc `.vt` để CSS game chỉ áp dụng ở đây. */
export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="vt">
      {children}
      <span className="version-tag">v{pkg.version}</span>
    </div>
  );
}
