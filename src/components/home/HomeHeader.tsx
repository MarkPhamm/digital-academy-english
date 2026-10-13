import Link from "next/link";
import { CoinsPill } from "./CoinsPill";
import { CurrencyIcon } from "./CurrencyIcon";
import { CurrencyPill } from "./CurrencyPill";

type Tab = {
  id: string;
  label: string;
  icon: string;
  /** Khung icon trong Figma (px) */
  box: { w: number; h: number };
  /** Vùng crop của ảnh nguồn so với khung icon (%), như Figma xuất ra */
  crop?: { w: number; h: number; left: number; top: number };
};

const TABS: Tab[] = [
  { id: "home", label: "Trang chủ", icon: "home.webp", box: { w: 54.4, h: 54.4 } },
  { id: "schedule", label: "Lịch học", icon: "schedule.webp", box: { w: 55.652, h: 55.652 }, crop: { w: 259.75, h: 388.14, left: -10.2, top: -53.34 } },
  { id: "materials", label: "Học liệu", icon: "materials.webp", box: { w: 54.4, h: 52.725 }, crop: { w: 133.12, h: 137.35, left: -17.09, top: -16.32 } },
  { id: "help", label: "Trợ giúp", icon: "help.webp", box: { w: 55.652, h: 55.652 }, crop: { w: 261.82, h: 392.73, left: -143.6, top: -180.42 } },
  { id: "ranking", label: "Xếp hạng", icon: "rank.webp", box: { w: 54.4, h: 46.203 }, crop: { w: 206.3, h: 121.45, left: -99.55, top: -13.14 } },
  { id: "notifications", label: "Thông báo", icon: "notify.webp", box: { w: 43.029, h: 48 }, crop: { w: 193.49, h: 128.45, left: -40.24, top: -13.33 } },
];

const ACTIVE_TAB = "home";

function ProfileCard() {
  return (
    <div className="relative h-[125px] w-[370px] shrink-0 overflow-clip">
      {/* Khung hồ sơ */}
      <div className="absolute left-0 top-0 h-[96.936px] w-[370px] overflow-hidden">
        <img
          src="/home/header/profile-frame.webp"
          alt=""
          className="absolute left-[-1.62%] top-[-5.97%] h-[133.72%] w-[103.38%] max-w-none"
        />
      </div>

      {/* Avatar — bấm để mở shop trang phục của game */}
      <Link
        href="/skins"
        aria-label="Trang phục nhân vật"
        className="absolute left-[135px] top-[20px] block h-[98px] w-[100px] overflow-clip transition-[filter] duration-200 hover:brightness-110 focus-visible:brightness-110"
      >
        <img src="/home/header/avatar-ring.svg" alt="" className="absolute left-0 top-0 size-[100px]" />
        <img
          src="/home/header/avatar.webp"
          alt="Ảnh đại diện"
          className="absolute left-1/2 top-[calc(50%+1px)] size-[88px] -translate-x-1/2 -translate-y-1/2 rounded-full object-cover"
        />
      </Link>

      {/* Bảng tên */}
      <div className="absolute left-[calc(50%+0.29px)] top-[80px] h-[38.476px] w-[160.586px] -translate-x-1/2">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="/home/header/nameplate.webp"
            alt=""
            className="absolute left-[-7.58%] top-[-26.73%] h-[162.58%] w-[114.94%] max-w-none"
          />
        </div>
        <p className="absolute left-1/2 top-[calc(50%-14.24px)] -translate-x-1/2 whitespace-nowrap text-center text-[18px] font-bold leading-[28px] text-[#7c2d12]">
          Kim Oanh
        </p>
      </div>

      {/* Xu */}
      <div className="absolute left-[15px] top-[44px] h-[32px] w-[108px]">
        <CoinsPill />
        <CurrencyIcon kind="coin" className="left-0 top-0" />
      </div>

      {/* Kim cương */}
      <div className="absolute left-[247px] top-[44px] h-[32px] w-[92px]">
        <CurrencyPill className="left-0" textClassName="left-[13px]" value="32.880" label="Kim cương" />
        <CurrencyIcon kind="gem" className="left-[74px] top-0" />
      </div>
    </div>
  );
}

function TabButton({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      className="group relative h-[100px] w-[92px] shrink-0 cursor-pointer outline-none transition-[transform,filter] duration-200 ease-out hover:-translate-y-[3px] hover:brightness-110 focus-visible:-translate-y-[3px] focus-visible:brightness-110 active:translate-y-0 active:brightness-95"
    >
      <div className="absolute left-0 right-0 top-[11.48px] h-[83.914px]">
        {active ? (
          <div className="absolute inset-[-10.45%_-14.26%_-15.63%_-14.26%]">
            <img src="/home/tabs/frame-active.svg" alt="" className="block size-full max-w-none" />
          </div>
        ) : (
          <div className="absolute inset-[5.18%_0_-5.13%_0] transition-[filter] duration-200 group-hover:drop-shadow-[0_0_8px_rgba(127,212,255,0.65)]">
            <img src="/home/tabs/frame.svg" alt="" className="block size-full max-w-none" />
          </div>
        )}
      </div>

      <span className="absolute left-[6.05px] right-[5.43px] top-[73.98px] -translate-y-1/2 text-center text-[14px] font-bold leading-[20px] text-[#f9fafb]">
        {tab.label}
      </span>

      <div
        className={`absolute left-1/2 flex size-[64px] -translate-x-1/2 flex-col items-center transition-transform duration-200 ease-out group-hover:scale-[1.06] ${active ? "top-[0.5px]" : "top-[0.79px]"}`}
      >
        <div className="relative shrink-0 overflow-hidden" style={{ width: tab.box.w, height: tab.box.h }}>
          <img
            src={`/home/tabs/${tab.icon}`}
            alt=""
            className={tab.crop ? "absolute max-w-none" : "absolute inset-0 size-full max-w-none object-cover"}
            style={
              tab.crop
                ? { width: `${tab.crop.w}%`, height: `${tab.crop.h}%`, left: `${tab.crop.left}%`, top: `${tab.crop.top}%` }
                : undefined
            }
          />
        </div>
        {!active && <img src="/home/tabs/icon-shadow.svg" alt="" className="h-[3.478px] w-[55.652px] shrink-0" />}
      </div>
    </button>
  );
}

export function HomeHeader() {
  return (
    <header className="absolute left-0 top-0 flex h-[145px] w-[1440px] items-center justify-between px-[60px] pt-[20px]">
      <ProfileCard />
      <nav aria-label="Điều hướng chính" className="flex shrink-0 items-start gap-[60px]">
        {TABS.map((tab) => (
          <TabButton key={tab.id} tab={tab} active={tab.id === ACTIVE_TAB} />
        ))}
      </nav>
    </header>
  );
}
