import GameTopbar from "@/components/game/GameTopbar";
import SkinPicker from "./SkinPicker";

export const metadata = { title: "Trang phục · Vũ trụ Tri thức" };

export default function SkinsPage() {
  return (
    <main className="space-bg">
      <GameTopbar back={{ href: "/", label: "Trang chủ" }} />
      <div className="page">
        <div className="page-head">
          <h1 className="title-kid">Chọn trang phục chiến binh</h1>
          <p className="muted-light">Nhân vật của em sẽ mặc bộ này trên mọi bản đồ. Trả lời đúng để kiếm xu mua bộ mới!</p>
        </div>
        <SkinPicker />
      </div>
    </main>
  );
}
