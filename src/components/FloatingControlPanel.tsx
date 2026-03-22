"use client";

import { useEffect, useId, useState } from "react";

type FloatingControlPanelProps = {
  isNight: boolean;
  onToggleDayNight: () => void;
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
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
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
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 6.5 6.5 0 1 0 21 14.5z" />
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
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6.5 12c2.5-4 6.5-5 10-3.5 1.2.5 2 1.2 2.5 2L22 12l-3 1.5c-.5.8-1.3 1.5-2.5 2-3.5 1.5-7.5.5-10-3.5z" />
      <path d="M2 12h2.5M9 10v.01" />
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
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function FloatingControlPanel({
  isNight,
  onToggleDayNight,
  fishCount,
  defaultFishCount,
  maxFishCount,
  onAddFish,
  onResetFish,
}: FloatingControlPanelProps) {
  const panelId = useId();
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [hoverInside, setHoverInside] = useState(false);
  const [hoverUiOk, setHoverUiOk] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setHoverUiOk(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const expanded = pinnedOpen || (hoverUiOk && hoverInside);
  const atMax = fishCount >= maxFishCount;
  const noExtras = fishCount <= defaultFishCount;

  const shell = isNight
    ? "rounded-2xl border border-white/20 bg-slate-950/35 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.55)] ring-1 ring-white/10 backdrop-blur-xl"
    : "rounded-2xl border border-slate-300/60 bg-white/55 shadow-[0_8px_32px_-10px_rgba(15,23,42,0.18)] ring-1 ring-white/80 backdrop-blur-xl";

  const subtle = isNight ? "text-white/45" : "text-slate-500";

  const skyIcon = isNight ? "text-amber-200/90" : "text-amber-600";

  const toolbarIconBtn = isNight
    ? "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white/85 transition-colors hover:bg-white/10 active:bg-white/[0.14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80"
    : "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-700 transition-colors hover:bg-white/75 active:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60";

  /** Simple text toggle when hover-to-expand is unavailable (typical mobile / touch). */
  const menuToggleBtn = isNight
    ? "flex h-11 shrink-0 items-center justify-center rounded-xl px-3.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 active:bg-white/[0.14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80"
    : "flex h-11 shrink-0 items-center justify-center rounded-xl px-3.5 text-sm font-medium text-slate-800 transition-colors hover:bg-white/75 active:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60";

  const addBtn = atMax
    ? isNight
      ? "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white/30"
      : "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-300"
    : isNight
      ? "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/12 text-white transition-colors hover:bg-white/18 active:bg-white/22 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80"
      : "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-900/[0.08] text-slate-800 transition-colors hover:bg-slate-900/12 active:bg-slate-900/16 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60";

  const resetBtn = noExtras
    ? isNight
      ? "w-full rounded-xl px-3 py-2.5 text-left text-sm text-white/35"
      : "w-full rounded-xl px-3 py-2.5 text-left text-sm text-slate-400"
    : isNight
      ? "w-full rounded-xl px-3 py-2.5 text-left text-sm text-white/90 transition-colors hover:bg-white/10 active:bg-white/[0.14]"
      : "w-full rounded-xl px-3 py-2.5 text-left text-sm text-slate-800 transition-colors hover:bg-white/70 active:bg-white/85";

  return (
    <div className="pointer-events-auto">
      <div
        className={`${shell} overflow-hidden p-1`}
        onMouseEnter={() => setHoverInside(true)}
        onMouseLeave={() => setHoverInside(false)}
      >
        {/* Collapsed toolbar: fish + count + add (grouped), day/night icon, more */}
        <div className="flex items-center gap-0.5">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1">
            <FishIcon className={`h-5 w-5 shrink-0 ${subtle}`} />
            <div className="min-w-0 leading-none">
              <p
                className={
                  isNight
                    ? "text-[0.65rem] font-medium uppercase tracking-widest text-white/40"
                    : "text-[0.65rem] font-medium uppercase tracking-widest text-slate-500"
                }
              >
                Fish
              </p>
              <p
                className={
                  isNight
                    ? "mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-white"
                    : "mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-slate-900"
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
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>

          <div
            className={
              isNight ? "mx-0.5 h-8 w-px bg-white/10" : "mx-0.5 h-8 w-px bg-slate-300/60"
            }
            aria-hidden
          />

          <button
            type="button"
            className={toolbarIconBtn}
            onClick={onToggleDayNight}
            aria-label={isNight ? "Switch to day" : "Switch to night"}
          >
            {isNight ? (
              <MoonIcon className={`h-[1.35rem] w-[1.35rem] ${skyIcon}`} />
            ) : (
              <SunIcon className={`h-[1.35rem] w-[1.35rem] ${skyIcon}`} />
            )}
          </button>

          {!hoverUiOk ? (
            <button
              type="button"
              className={menuToggleBtn}
              aria-expanded={expanded}
              aria-controls={panelId}
              aria-label={expanded ? "Close menu" : "Open menu"}
              onClick={() => setPinnedOpen((v) => !v)}
            >
              {expanded ? "Close" : "Menu"}
            </button>
          ) : null}
        </div>

        <div
          id={panelId}
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className={
                isNight
                  ? "border-t border-white/10 px-1 pb-1 pt-1.5"
                  : "border-t border-slate-300/50 px-1 pb-1 pt-1.5"
              }
            >
              <button
                type="button"
                className={resetBtn}
                disabled={noExtras}
                onClick={onResetFish}
              >
                <span className="block font-medium">Reset to default</span>
                <span className={`mt-0.5 block text-xs font-normal ${subtle}`}>
                  Remove extra fish ({defaultFishCount} fish)
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
