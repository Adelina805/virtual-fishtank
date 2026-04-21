"use client";

export type PlayModeControlsProps = {
  isNight: boolean;
  isFeedMode: boolean;
  onToggleFeedMode: () => void;
  /** Base school size (Play actions mutate this). */
  fishCount: number;
  /** Shown in the readout; defaults to `fishCount`. Use for live tank total (e.g. focus growth). */
  displayFishCount?: number;
  /** When false, fish/feed controls are inactive (e.g. Relax / Focus). */
  actionsEnabled?: boolean;
  defaultFishCount: number;
  maxFishCount: number;
  onAddFish: () => void;
  onResetFish: () => void;
};

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
      <path d="M18 11h-4a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h4" />
      <path d="M6 7v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
      <rect width="16" height="5" x="4" y="2" rx="1" />
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

export default function PlayModeControls({
  isNight,
  isFeedMode,
  onToggleFeedMode,
  fishCount,
  displayFishCount,
  actionsEnabled = true,
  defaultFishCount,
  maxFishCount,
  onAddFish,
  onResetFish,
}: PlayModeControlsProps) {
  const shownCount = displayFishCount ?? fishCount;
  const atMax = shownCount >= maxFishCount;
  const canInteract = actionsEnabled;

  const shell = isNight
    ? "rounded-xl border border-white/[0.13] bg-slate-950/[0.34] shadow-[0_12px_36px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-slate-950/[0.28]"
    : "rounded-xl border border-slate-900/10 bg-white/70 shadow-[0_12px_36px_-12px_rgba(15,23,42,0.14),inset_0_1px_0_0_rgba(255,255,255,0.75)] ring-1 ring-slate-900/10 backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/58";

  const subtle = isNight ? "text-white/50" : "text-slate-700";
  const toolbarIconBtn = isNight
    ? "touch-manipulation select-none grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/[0.88] transition-[color,background-color,transform] duration-200 ease-out hover:bg-white/[0.09] active:scale-[0.97] active:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80"
    : "touch-manipulation select-none grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-950 transition-[color,background-color,transform] duration-200 ease-out hover:bg-white/90 active:scale-[0.97] active:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60";

  const feedBtn = !canInteract
    ? isNight
      ? "touch-manipulation select-none grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/28"
      : "touch-manipulation select-none grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500"
    : isFeedMode
      ? isNight
        ? "touch-manipulation select-none grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.12] text-white transition-[background-color,color,transform] duration-200 ease-out hover:bg-white/[0.16] active:scale-[0.97] active:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80"
        : "touch-manipulation select-none grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-950/12 text-slate-950 transition-[background-color,color,transform] duration-200 ease-out hover:bg-slate-950/16 active:scale-[0.97] active:bg-slate-950/18 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60"
      : toolbarIconBtn;

  const addBtn = !canInteract || atMax
    ? isNight
      ? "touch-manipulation select-none grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/28"
      : "touch-manipulation select-none grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500"
    : isNight
      ? "touch-manipulation select-none grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.11] text-white transition-[background-color,color,transform] duration-200 ease-out hover:bg-white/[0.16] active:scale-[0.97] active:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80"
      : "touch-manipulation select-none grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-950/10 text-neutral-950 transition-[background-color,color,transform] duration-200 ease-out hover:bg-slate-950/14 active:scale-[0.97] active:bg-slate-950/18 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60";

  const resetIconBtn = canInteract
    ? toolbarIconBtn
    : isNight
      ? "touch-manipulation select-none grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/28"
      : "touch-manipulation select-none grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500";

  return (
    <div
      className={`${canInteract ? "pointer-events-auto" : "pointer-events-none"} w-max max-w-[calc(100vw-2rem)]`}
    >
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
                {shownCount}
              </p>
            </div>
            <button
              type="button"
              className={addBtn}
              disabled={!canInteract || atMax}
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
            disabled={!canInteract}
            onClick={onResetFish}
            aria-label={`Reset to ${defaultFishCount} fish`}
            title={`Reset to ${defaultFishCount} fish`}
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
            disabled={!canInteract}
            onClick={onToggleFeedMode}
            aria-pressed={isFeedMode}
            aria-label={isFeedMode ? "Exit feed mode" : "Enter feed mode"}
            title={isFeedMode ? "Feed mode: on" : "Feed mode: off"}
          >
            <FishFoodIcon className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
