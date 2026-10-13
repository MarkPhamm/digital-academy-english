import type { ReactNode } from "react";

/** Ô số tiền (Xu / Kim cương) trong thẻ hồ sơ của header. */
export function CurrencyPill({ className, textClassName, value, label }: { className: string; textClassName: string; value: ReactNode; label: string }) {
  return (
    <div
      className={`absolute top-1/2 h-[28px] w-[92px] -translate-y-1/2 overflow-clip rounded-[8px] bg-[#0054d3] shadow-[0px_1px_2px_0px_rgba(13,255,255,0.35)] ${className}`}
    >
      <p className={`absolute top-[calc(50%-14px)] whitespace-nowrap text-[18px] font-bold leading-[28px] text-white ${textClassName}`}>
        <span className="sr-only">{label}: </span>
        {value}
      </p>
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_1px_4px_0px_#00039c]" />
    </div>
  );
}
