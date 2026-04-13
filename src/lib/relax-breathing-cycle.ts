/**
 * Pure timing + easing for the Relax-mode ambient breath cycle.
 * Inhale → hold → exhale repeats with no gaps; scale is continuous at phase joins.
 */

export const RELAX_BREATH_INHALE_MS = 4000;
/** Hold between inhale and exhale (within 2–4s guidance). */
export const RELAX_BREATH_HOLD_MS = 3000;
export const RELAX_BREATH_EXHALE_MS = 6000;

export const RELAX_BREATH_CYCLE_MS =
  RELAX_BREATH_INHALE_MS + RELAX_BREATH_HOLD_MS + RELAX_BREATH_EXHALE_MS;

export type RelaxBreathPhase = "inhale" | "hold" | "exhale";

export type RelaxBreathTimingConfig = {
  inhaleMs: number;
  holdMs: number;
  exhaleMs: number;
};

export const DEFAULT_RELAX_BREATH_TIMING: RelaxBreathTimingConfig = {
  inhaleMs: RELAX_BREATH_INHALE_MS,
  holdMs: RELAX_BREATH_HOLD_MS,
  exhaleMs: RELAX_BREATH_EXHALE_MS,
};

export type RelaxBreathAmbientState = {
  /** False when Relax HUD is inactive or unmounted — canvas should ignore modifiers. */
  active: boolean;
  /** 0 = empty / small visual, 1 = full / large visual. */
  scale01: number;
  /** Multiplier applied only to fish integration `dt` in Relax mode. */
  fishDtScale: number;
  /** Subtle full-screen light wash alpha (applied in canvas). */
  lightOverlayAlpha: number;
};

export const RELAX_BREATH_AMBIENT_IDLE: RelaxBreathAmbientState = {
  active: false,
  scale01: 0,
  fishDtScale: 1,
  lightOverlayAlpha: 0,
};

export type RelaxBreathFrame = {
  phase: RelaxBreathPhase;
  /** Eased breath fullness 0…1 (drives radial ring scale / opacity). */
  scale01: number;
  fishDtScale: number;
  lightOverlayAlpha: number;
  /** Linear 0…1 position in the full cycle (for debugging / future use). */
  cyclePosition01: number;
};

/** Center label copy — single word per phase, no numerals. */
export const RELAX_BREATH_PHASE_LABEL: Record<RelaxBreathPhase, string> = {
  inhale: "inhale",
  hold: "hold",
  exhale: "exhale",
};

function clamp01(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t;
}

/** Smooth Hermite 0…1 — soft joins at phase boundaries when composed. */
export function relaxBreathSmoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Smoother than smoothstep; avoids a mechanical feel on long eases.
 */
export function relaxBreathSmootherstep(t: number): number {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/** Ease-out cubic — expansion settles gently (inhale). */
export function relaxBreathEaseOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) ** 3;
}

/** Ease-in cubic — contraction eases in softly (exhale). */
export function relaxBreathEaseInCubic(t: number): number {
  const x = clamp01(t);
  return x * x * x;
}

/**
 * Given elapsed time since cycle start (any non-negative ms), returns the current frame.
 */
export function computeRelaxBreathFrame(
  elapsedMs: number,
  timing: RelaxBreathTimingConfig = DEFAULT_RELAX_BREATH_TIMING,
): RelaxBreathFrame {
  const cycleMs =
    timing.inhaleMs + timing.holdMs + timing.exhaleMs;
  const t = elapsedMs % cycleMs;
  const cyclePosition01 = t / cycleMs;

  let phase: RelaxBreathPhase;
  let scale01: number;
  let phaseLocal01: number;

  if (t < timing.inhaleMs) {
    phase = "inhale";
    phaseLocal01 = t / timing.inhaleMs;
    scale01 = relaxBreathEaseOutCubic(phaseLocal01);
  } else if (t < timing.inhaleMs + timing.holdMs) {
    phase = "hold";
    phaseLocal01 = (t - timing.inhaleMs) / timing.holdMs;
    scale01 = 1;
  } else {
    phase = "exhale";
    const ex = t - timing.inhaleMs - timing.holdMs;
    phaseLocal01 = ex / timing.exhaleMs;
    scale01 = 1 - relaxBreathEaseInCubic(phaseLocal01);
  }

  let fishDtScale = 1;
  if (phase === "inhale") {
    fishDtScale = 0.9 + 0.1 * relaxBreathSmoothstep(phaseLocal01);
  } else if (phase === "hold") {
    fishDtScale = 1;
  } else {
    fishDtScale = 1 - 0.1 * relaxBreathSmoothstep(phaseLocal01);
  }

  // Peak softly with breath fullness; keep very subtle (canvas multiplies again by mode).
  const lightOverlayAlpha = scale01 * 0.022;

  return {
    phase,
    scale01,
    fishDtScale,
    lightOverlayAlpha,
    cyclePosition01,
  };
}

/** Radial ring group scale (CSS transform) — wider than the old disc for a clear breath. */
export function relaxBreathRingScaleFrom01(scale01: number): number {
  const lo = 0.78;
  const hi = 1.12;
  return lo + scale01 * (hi - lo);
}

export type RelaxBreathRingVisualTheme = "day" | "night";

/**
 * Group opacity for the particle ring (applied to the HUD wrapper each rAF frame).
 * Day uses a much higher range so darker bubbles read clearly on light UI.
 */
export function relaxBreathRingGroupOpacityFrom01(
  scale01: number,
  theme: RelaxBreathRingVisualTheme = "night",
): number {
  if (theme === "day") {
    const lo = 0.9;
    const hi = 1;
    return lo + scale01 * (hi - lo);
  }
  const lo = 0.44;
  const hi = 0.78;
  return lo + scale01 * (hi - lo);
}
