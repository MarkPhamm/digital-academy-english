"use client";
import { useEffect, useRef, useState } from "react";
import { buildCharacter } from "@/components/game/sprites";
import { GameApiError, buySkin, equipSkin } from "@/lib/game/client";
import { patchProfile, useGameProfile } from "@/lib/game/profile-store";
import { COINS_PER_CORRECT } from "@/lib/game/rules";
import { SKINS, type Skin, getSkin } from "@/lib/game/skins";

/** Ảnh nhân vật (đứng yên, nhìn thẳng) vẽ từ cùng bộ sprite với trong game. */
function Preview({ skinId, size }: { skinId: string; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(buildCharacter({ shirt: "#3b82f6", hair: "#2b1d16", skin: skinId }).down[0], 0, 0, c.width, c.height);
  }, [skinId]);
  return <canvas ref={ref} width={16 * 8} height={16 * 8} style={{ width: size, height: size, imageRendering: "pixelated" }} />;
}

const fmt = (n: number) => n.toLocaleString("vi-VN");

/** Shop trang phục: bấm thẻ để xem, mua bằng xu (Spartan miễn phí), chỉ mặc được bộ đã sở hữu. */
export default function SkinPicker() {
  const { profile, error: loadError } = useGameProfile();
  const [selected, setSelected] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Skin | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const equipped = profile?.skins.equipped ?? SKINS[0].id;
  const owned = profile?.skins.owned ?? [SKINS[0].id];
  const coins = profile?.coins ?? 0;
  const skin = getSkin(selected ?? equipped);
  const isOwned = owned.includes(skin.id);
  const isEquipped = skin.id === equipped;

  const equip = async (id: string) => {
    if (!profile || pending) return;
    const prev = profile.skins;
    setPending(true);
    setError(null);
    patchProfile({ skins: { ...prev, equipped: id } });
    try {
      const r = await equipSkin({ skinId: id });
      patchProfile({ coins: r.coins, skins: { equipped: r.equipped, owned: r.owned } });
    } catch (e) {
      patchProfile({ skins: prev });
      setError(e instanceof Error ? e.message : "Chưa lưu được trang phục, em thử lại nhé.");
    } finally {
      setPending(false);
    }
  };

  const buy = async (s: Skin) => {
    if (!profile || pending) return;
    const prevCoins = profile.coins;
    const prevSkins = profile.skins;
    setConfirm(null);
    setPending(true);
    setError(null);
    // Cập nhật ngay cho mượt; server mới là nơi quyết định.
    patchProfile({ coins: prevCoins - s.price, skins: { equipped: s.id, owned: [...prevSkins.owned, s.id] } });
    try {
      const r = await buySkin({ skinId: s.id, equip: true });
      patchProfile({ coins: r.coins, skins: { equipped: r.equipped, owned: r.owned } });
    } catch (e) {
      patchProfile({ coins: prevCoins, skins: prevSkins });
      if (e instanceof GameApiError && e.code === "NOT_ENOUGH_COINS") setError("Chưa đủ xu rồi, em chơi thêm để kiếm xu nhé!");
      else if (e instanceof GameApiError && e.code === "ALREADY_OWNED") setError("Em đã có bộ này rồi, bấm Dùng để mặc nhé.");
      else setError(e instanceof Error ? e.message : "Chưa mua được trang phục, em thử lại nhé.");
    } finally {
      setPending(false);
    }
  };

  const shownError = error ?? (loadError && !profile ? loadError : null);

  return (
    <div className="skins-wrap">
      <aside className="skin-hero" style={{ ["--sk" as string]: skin.pal.a }}>
        <Preview skinId={skin.id} size={192} />
        <h2 className="title-kid">{skin.emoji} {skin.name}</h2>
        <p className="muted-light">{skin.tagline}</p>
        <p className="skin-coins">Em đang có 🪙 {fmt(coins)} xu</p>
        <div className="skin-buy">
          {isEquipped ? (
            <span className="btn btn-light" aria-disabled="true">✓ Đang dùng</span>
          ) : isOwned ? (
            <button className="btn btn-primary btn-lg" onClick={() => equip(skin.id)} disabled={pending || !profile}>Dùng bộ này</button>
          ) : coins >= skin.price ? (
            <button className="btn btn-primary btn-lg" onClick={() => setConfirm(skin)} disabled={pending || !profile}>Mua · {fmt(skin.price)} xu</button>
          ) : (
            <>
              <button className="btn btn-primary btn-lg" disabled>🔒 Thiếu xu · {fmt(skin.price)} xu</button>
              <p className="muted-light" style={{ margin: 0, fontSize: 14 }}>Em cần thêm {fmt(skin.price - coins)} xu. Trả lời đúng mỗi câu được {COINS_PER_CORRECT} xu!</p>
            </>
          )}
        </div>
        {shownError && <p role="alert" style={{ color: "#ff9a9a" }}>{shownError}</p>}
      </aside>
      <div className="skin-grid" role="radiogroup" aria-label="Trang phục">
        {SKINS.map((s) => {
          const own = owned.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={s.id === skin.id}
              className={`skin-card ${s.id === skin.id ? "on" : ""} ${own ? "" : "locked"}`}
              style={{ ["--sk" as string]: s.pal.a }}
              onClick={() => setSelected(s.id)}
            >
              <Preview skinId={s.id} size={80} />
              <span>{s.name}</span>
              {own ? (
                s.id === equipped && <i className="skin-tick">✓</i>
              ) : (
                <>
                  <i className="skin-lock" aria-label="Chưa mua">🔒</i>
                  <span className="skin-price">🪙 {fmt(s.price)}</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {confirm && (
        <div className="overlay" style={{ position: "fixed" }} onClick={(e) => e.target === e.currentTarget && setConfirm(null)}>
          <div className="result-card" role="dialog" aria-modal="true" aria-label={`Mua ${confirm.name}`}>
            <h1 className="title-kid" style={{ fontSize: 30 }}>Mua {confirm.emoji} {confirm.name}?</h1>
            <p className="muted">Bộ này giá <b>{fmt(confirm.price)} xu</b>. Em đang có {fmt(coins)} xu, mua xong còn {fmt(coins - confirm.price)} xu.</p>
            <div className="result-actions">
              <button className="btn btn-light btn-lg" onClick={() => setConfirm(null)}>Để sau</button>
              <button className="btn btn-primary btn-lg" onClick={() => buy(confirm)} autoFocus>Mua ngay 🪙</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
