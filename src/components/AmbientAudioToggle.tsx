"use client";

export type AmbientAudioToggleProps = {
  isNight: boolean;
  isEnabled: boolean;
  onToggle: () => void;
};

function MusicIcon({ className }: { className?: string }) {
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
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function MusicMuteSlash({ className }: { className?: string }) {
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
      <path d="M4 4 20 20" />
    </svg>
  );
}

export default function AmbientAudioToggle({
  isNight,
  isEnabled,
  onToggle,
}: AmbientAudioToggleProps) {
  const shell = isNight
    ? "rounded-xl border border-white/[0.09] bg-slate-950/[0.16] shadow-[0_8px_22px_-14px_rgba(0,0,0,0.48)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-slate-950/[0.1]"
    : "rounded-xl border border-slate-900/8 bg-white/40 shadow-[0_8px_22px_-14px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/8 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/28";
  const iconBtn = isNight
    ? "touch-manipulation select-none grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/[0.88] transition-[color,background-color,transform] duration-200 ease-out hover:bg-white/[0.09] active:scale-[0.97] active:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80"
    : "touch-manipulation select-none grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-950 transition-[color,background-color,transform] duration-200 ease-out hover:bg-white/90 active:scale-[0.97] active:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60";
  const iconOpacity = isEnabled ? "opacity-100" : "opacity-50";
  const strikeOpacity = isEnabled ? "opacity-0" : "opacity-70";

  return (
    <div className="pointer-events-auto w-max">
      <div className={`${shell} p-1`}>
        <button
          type="button"
          className={iconBtn}
          onClick={onToggle}
          aria-pressed={isEnabled}
          aria-label={
            isEnabled ? "Disable ambient audio" : "Enable ambient audio"
          }
        >
          <span className="relative grid h-4.5 w-4.5 place-items-center">
            <MusicIcon
              className={`h-4.5 w-4.5 transition-opacity duration-200 ${iconOpacity}`}
            />
            <MusicMuteSlash
              className={`pointer-events-none absolute h-4.5 w-4.5 transition-opacity duration-200 ${strikeOpacity}`}
              aria-hidden
            />
          </span>
        </button>
      </div>
    </div>
  );
}
