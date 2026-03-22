"use client";

type FloatingControlPanelProps = {
  isNight: boolean;
  onToggle: () => void;
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

export default function FloatingControlPanel({
  isNight,
  onToggle,
}: FloatingControlPanelProps) {
  return (
    <div className="pointer-events-auto">
      <div
        className={
          isNight
            ? "rounded-2xl border border-white/20 bg-slate-950/35 p-1 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.55)] ring-1 ring-white/10 backdrop-blur-xl"
            : "rounded-2xl border border-slate-300/60 bg-white/55 p-1 shadow-[0_8px_32px_-10px_rgba(15,23,42,0.18)] ring-1 ring-white/80 backdrop-blur-xl"
        }
      >
        <button
          type="button"
          role="switch"
          aria-checked={isNight}
          aria-label={isNight ? "Switch to day mode" : "Switch to night mode"}
          onClick={onToggle}
          className={
            isNight
              ? "flex w-full min-w-34 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80"
              : "flex w-full min-w-34 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-slate-700 transition-colors hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60"
          }
        >
          <span
            className={
              isNight
                ? "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-amber-200/95"
                : "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-100/90 text-amber-600"
            }
          >
            {isNight ? (
              <MoonIcon className="h-[1.15rem] w-[1.15rem]" />
            ) : (
              <SunIcon className="h-[1.15rem] w-[1.15rem]" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={
                isNight
                  ? "block text-[0.65rem] font-medium uppercase tracking-[0.14em] text-white/55"
                  : "block text-[0.65rem] font-medium uppercase tracking-[0.14em] text-slate-500"
              }
            >
              Ambience
            </span>
            <span
              className={
                isNight
                  ? "block text-sm font-medium tracking-tight text-white/95"
                  : "block text-sm font-medium tracking-tight text-slate-800"
              }
            >
              {isNight ? "Night" : "Day"}
            </span>
          </span>
          <span
            className={
              isNight
                ? "relative h-6 w-11 shrink-0 rounded-full bg-white/15 p-0.5 transition-colors"
                : "relative h-6 w-11 shrink-0 rounded-full bg-slate-300/80 p-0.5 transition-colors"
            }
          >
            <span
              className={
                isNight
                  ? "block h-5 w-5 translate-x-0 rounded-full bg-white/90 shadow-sm transition-transform duration-200 ease-out"
                  : "block h-5 w-5 translate-x-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out"
              }
            />
          </span>
        </button>
      </div>
    </div>
  );
}
