"use client";

type FloatingControlPanelProps = {
  isNight: boolean;
  onToggleDayNight: () => void;
  isFeedMode: boolean;
  onToggleFeedMode: () => void;
  fishCount: number;
  defaultFishCount: number;
  maxFishCount: number;
  onAddFish: () => void;
  onResetFish: () => void;
};

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
    </svg>
  );
}

function FishIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 16s9-15 20-4C11 23 2 8 2 8" />
    </svg>
  );
}

function FishFoodIcon({ className }: { className?: string }) {
  // Placeholder icon (replace with your final SVG later).
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 15c2-1 3-2 3-4 0-2-1-3-3-4" />
      <path d="M18 15c-2-1-3-2-3-4 0-2 1-3 3-4" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="9.5" cy="17.2" r="1" />
      <circle cx="14.5" cy="17.2" r="1" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function RotateCcwIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export default function FloatingControlPanel({
  isNight,
  onToggleDayNight,
  isFeedMode,
  onToggleFeedMode,
  fishCount,
  defaultFishCount,
  maxFishCount,
  onAddFish,
  onResetFish,
}: FloatingControlPanelProps) {
  const atMax = fishCount >= maxFishCount;
  const noExtras = fishCount <= defaultFishCount;

  const shell = isNight
    ? "rounded-xl border border-white/[0.13] bg-slate-950/[0.34] shadow-[0_12px_36px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-slate-950/[0.28]"
    : "rounded-xl border border-slate-900/10 bg-white/70 shadow-[0_12px_36px_-12px_rgba(15,23,42,0.14),inset_0_1px_0_0_rgba(255,255,255,0.75)] ring-1 ring-slate-900/10 backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/58";

  const subtle = isNight ? "text-white/50" : "text-slate-700";

  const toolbarIconBtn = isNight
    ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/[0.88] transition-[color,background-color,transform] duration-200 ease-out hover:bg-white/[0.09] active:scale-[0.97] active:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80"
    : "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-950 transition-[color,background-color,transform] duration-200 ease-out hover:bg-white/90 active:scale-[0.97] active:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60";

  const feedBtn = isFeedMode
    ? isNight
      ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.12] text-white transition-[background-color,color,transform] duration-200 ease-out hover:bg-white/[0.16] active:scale-[0.97] active:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80"
      : "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-950/12 text-slate-950 transition-[background-color,color,transform] duration-200 ease-out hover:bg-slate-950/16 active:scale-[0.97] active:bg-slate-950/18 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60"
    : toolbarIconBtn;

  const addBtn = atMax
    ? isNight
      ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/28"
      : "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500"
    : isNight
      ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.11] text-white transition-[background-color,color,transform] duration-200 ease-out hover:bg-white/[0.16] active:scale-[0.97] active:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80"
      : "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-950/10 text-neutral-950 transition-[background-color,color,transform] duration-200 ease-out hover:bg-slate-950/14 active:scale-[0.97] active:bg-slate-950/18 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60";

  const resetIconBtn = noExtras
    ? isNight
      ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/28"
      : "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500"
    : isNight
      ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/[0.88] transition-[color,background-color,transform] duration-200 ease-out hover:bg-white/[0.09] active:scale-[0.97] active:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80"
      : "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-950 transition-[color,background-color,transform] duration-200 ease-out hover:bg-white/90 active:scale-[0.97] active:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60";

  return (
    <div className="pointer-events-auto w-max">
      <div className={`${shell} overflow-hidden p-1`}>
        <div className="flex items-center gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1">
            <FishIcon className={`h-4 w-4 shrink-0 ${subtle}`} />
            <div className="min-w-0 leading-none">
              <p
                className={
                  isNight
                    ? "text-[0.5625rem] font-semibold uppercase tracking-[0.2em] text-white/48"
                    : "text-[0.5625rem] font-semibold uppercase tracking-[0.2em] text-slate-700"
                }
              >
                Fish
              </p>
              <p
                className={
                  isNight
                    ? "mt-0.5 text-base font-semibold tabular-nums tracking-tight text-white/96"
                    : "mt-0.5 text-base font-semibold tabular-nums tracking-tight text-neutral-950"
                }
                aria-live="polite"
              >
                {fishCount}
              </p>
            </div>
            <button
              type="button"
              className={addBtn}
              disabled={atMax}
              onClick={onAddFish}
              aria-label={`Add one fish (${fishCount} of ${maxFishCount})`}
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>

          <div
            className={
              isNight
                ? "mx-0.5 h-7 w-px shrink-0 self-center bg-linear-to-b from-transparent via-white/18 to-transparent"
                : "mx-0.5 h-7 w-px shrink-0 self-center bg-linear-to-b from-transparent via-slate-600/70 to-transparent"
            }
            aria-hidden
          />

          <button
            type="button"
            className={resetIconBtn}
            disabled={noExtras}
            onClick={onResetFish}
            aria-label={
              noExtras
                ? `Already at default (${defaultFishCount} fish)`
                : `Reset to ${defaultFishCount} fish`
            }
            title={noExtras ? undefined : `Reset to ${defaultFishCount} fish`}
          >
            <RotateCcwIcon className="h-4 w-4" />
          </button>

          <div
            className={
              isNight
                ? "mx-0.5 h-7 w-px shrink-0 self-center bg-linear-to-b from-transparent via-white/18 to-transparent"
                : "mx-0.5 h-7 w-px shrink-0 self-center bg-linear-to-b from-transparent via-slate-600/70 to-transparent"
            }
            aria-hidden
          />

          <button
            type="button"
            className={feedBtn}
            onClick={onToggleFeedMode}
            aria-pressed={isFeedMode}
            aria-label={isFeedMode ? "Exit feed mode" : "Enter feed mode"}
            title={isFeedMode ? "Feed mode: on" : "Feed mode: off"}
          >
            <FishFoodIcon className="h-4.5 w-4.5" />
          </button>

          <button
            type="button"
            className={toolbarIconBtn}
            onClick={onToggleDayNight}
            aria-label={isNight ? "Switch to day" : "Switch to night"}
          >
            {isNight ? (
              <MoonIcon className="h-4.5 w-4.5" />
            ) : (
              <SunIcon className="h-4.5 w-4.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
