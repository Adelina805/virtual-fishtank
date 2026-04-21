"use client";

export type ThemeToggleProps = {
  isNight: boolean;
  onToggleDayNight: () => void;
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

export default function ThemeToggle({
  isNight,
  onToggleDayNight,
}: ThemeToggleProps) {
  const shell = isNight
    ? "rounded-xl border border-white/[0.09] bg-slate-950/[0.16] shadow-[0_8px_22px_-14px_rgba(0,0,0,0.48)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-slate-950/[0.1]"
    : "rounded-xl border border-slate-900/8 bg-white/40 shadow-[0_8px_22px_-14px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/8 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/28";

  const iconBtn = isNight
    ? "touch-manipulation select-none grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/[0.88] transition-[color,background-color,transform] duration-200 ease-out hover:bg-white/[0.09] active:scale-[0.97] active:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80"
    : "touch-manipulation select-none grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-950 transition-[color,background-color,transform] duration-200 ease-out hover:bg-white/90 active:scale-[0.97] active:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60";

  return (
    <div className="pointer-events-auto w-max">
      <div className={`${shell} p-1`}>
        <button
          type="button"
          className={iconBtn}
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
  );
}
