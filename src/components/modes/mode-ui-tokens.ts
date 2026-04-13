/**
 * Shared Tailwind fragments for mode HUD controls so they align with the
 * aquarium controls (PlayModeControls / ModeToggle) without heavy panels.
 */
export function modeHudMicroPill(isNight: boolean): string {
  return isNight
    ? "rounded-full border border-white/[0.1] bg-slate-950/25 px-2.5 py-1 text-xs font-medium text-white/85 shadow-none backdrop-blur-md supports-[backdrop-filter]:bg-slate-950/20"
    : "rounded-full border border-slate-900/10 bg-white/55 px-2.5 py-1 text-xs font-medium text-slate-900 shadow-none backdrop-blur-md supports-[backdrop-filter]:bg-white/45";
}

export function modeHudPresetBtn(isNight: boolean, selected: boolean): string {
  const base =
    "min-w-[2.25rem] rounded-full px-2 py-1 text-center text-xs font-semibold tabular-nums transition-[color,background-color,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2";
  const focusRing = isNight
    ? "focus-visible:outline-sky-300/80"
    : "focus-visible:outline-sky-500/60";
  if (selected) {
    return isNight
      ? `${base} ${focusRing} bg-white/[0.16] text-white`
      : `${base} ${focusRing} bg-slate-950/12 text-slate-950 ring-1 ring-slate-900/12`;
  }
  return isNight
    ? `${base} ${focusRing} text-white/72 hover:bg-white/[0.08]`
    : `${base} ${focusRing} text-slate-800 hover:bg-white/80`;
}

export function modeHudActionBtn(isNight: boolean): string {
  return isNight
    ? "rounded-full border border-white/[0.1] bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/90 transition-[background-color,color] duration-200 hover:bg-white/[0.11] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80 disabled:pointer-events-none disabled:opacity-35"
    : "rounded-full border border-slate-900/12 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-[background-color,color] duration-200 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60 disabled:pointer-events-none disabled:opacity-35";
}

/** Tiny icon control beside the focus duration label (low visual weight). */
export function modeHudIconBtn(isNight: boolean): string {
  return isNight
    ? "inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/70 transition-[background-color,color] duration-200 hover:border-white/[0.12] hover:bg-white/[0.08] hover:text-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80 disabled:pointer-events-none disabled:opacity-35"
    : "inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-slate-900/10 bg-white/40 text-slate-700 transition-[background-color,color] duration-200 hover:border-slate-900/20 hover:bg-white/75 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60 disabled:pointer-events-none disabled:opacity-35";
}

export function modeHudMutedText(isNight: boolean): string {
  return isNight ? "text-white/45" : "text-slate-600";
}
