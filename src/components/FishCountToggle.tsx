"use client";

type FishCountToggleProps = {
  isNight: boolean;
  fishCount: number;
};

export default function FishCountToggle({ isNight, fishCount }: FishCountToggleProps) {
  const shell = isNight
    ? "rounded-xl border border-white/[0.09] bg-slate-950/[0.14] shadow-[0_8px_22px_-14px_rgba(0,0,0,0.42)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-slate-950/[0.09]"
    : "rounded-xl border border-slate-900/8 bg-white/34 shadow-[0_8px_22px_-14px_rgba(15,23,42,0.16)] ring-1 ring-slate-900/8 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/24";
  const buttonTone = isNight ? "text-white/78" : "text-slate-900/82";

  return (
    <div className="pointer-events-auto w-max">
      <div className={`${shell} p-1`}>
        <button
          type="button"
          className={`grid h-8 w-8 place-items-center rounded-lg ${buttonTone}`}
          aria-label={`Fish in aquarium: ${fishCount}`}
          title={`${fishCount} fish`}
        >
          <span className="text-[0.68rem] font-medium tabular-nums tracking-tight">
            {fishCount}
          </span>
        </button>
      </div>
    </div>
  );
}
