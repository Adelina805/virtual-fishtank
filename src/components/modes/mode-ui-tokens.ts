/**
 * Shared Tailwind fragments for mode HUD controls so they align with the
 * aquarium controls (PlayModeControls / ModeToggle) without heavy panels.
 */

/**
 * Compact duration chips aligned with ModeToggle segment shapes —
 * rounded-lg, soft fill, low border contrast.
 */
export function modeHudPresetChip(isNight: boolean, selected: boolean): string {
  const focusRing = isNight
    ? "focus-visible:outline-sky-300/80"
    : "focus-visible:outline-sky-500/60";
  const base = `min-w-[2rem] rounded-lg px-2 py-1 text-center text-[0.7rem] font-semibold tabular-nums transition-[color,background-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 ${focusRing}`;
  if (selected) {
    return isNight
      ? `${base} bg-white/[0.14] text-white/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]`
      : `${base} bg-slate-950/10 text-slate-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65)] ring-1 ring-slate-900/10`;
  }
  return isNight
    ? `${base} text-white/68 hover:bg-white/[0.08] hover:text-white/88`
    : `${base} text-slate-800/90 hover:bg-white/75`;
}

/** Minimal transport controls (play / pause) — secondary to the readout. */
export function modeHudTransportIconBtn(isNight: boolean): string {
  return isNight
    ? "inline-flex size-5 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-white/55 transition-[background-color,color,border-color] duration-200 hover:border-white/[0.1] hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80 disabled:pointer-events-none disabled:opacity-30"
    : "inline-flex size-5 shrink-0 items-center justify-center rounded-lg border border-slate-900/10 bg-white/35 text-slate-600/90 transition-[background-color,color,border-color] duration-200 hover:border-slate-900/15 hover:bg-white/65 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60 disabled:pointer-events-none disabled:opacity-30";
}
