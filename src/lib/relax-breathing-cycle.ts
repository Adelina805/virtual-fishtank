/**
 * Pure timing + easing for the Relax-mode ambient breath cycle.
 * Inhale → hold → exhale → rest repeats with a soft bottom pause.
 */

export const RELAX_BREATH_INHALE_MS = 4000;
export const RELAX_BREATH_HOLD_MS = 4000;
export const RELAX_BREATH_EXHALE_MS = 4000;
export const RELAX_BREATH_REST_MS = 4000;

export const RELAX_BREATH_CYCLE_MS =
  RELAX_BREATH_INHALE_MS +
  RELAX_BREATH_HOLD_MS +
  RELAX_BREATH_EXHALE_MS +
  RELAX_BREATH_REST_MS;

/** Fish wander multiplier during breath hold (near 0 = nearly motionless). */
export const RELAX_FISH_HOLD_SPEED_MUL = 0.5;

export type RelaxBreathPhase = "inhale" | "hold" | "exhale" | "rest";

export type RelaxBreathCycleDurations = {
  inhaleMs: number;
  holdMs: number;
  exhaleMs: number;
  restMs: number;
};

export type RelaxBreathScaleConfig = {
  /** Scale at inhale start (top of previous rest). */
  inhaleStart: number;
  /** Peak scale during hold. */
  inhalePeak: number;
  /** Bottom scale at exhale end + rest. */
  exhaleEnd: number;
};

export type RelaxBreathOpacityConfig = {
  inhaleStart: number;
  inhalePeak: number;
  /** Opacity during rest (and end of exhale). */
  rest: number;
};

export type RelaxBreathRadiusConfig = {
  /** Multiplies particle radius; subtle expansion/contraction for clarity. */
  inhaleStart: number;
  inhalePeak: number;
  exhaleEnd: number;
};

export type RelaxBreathEasingConfig = {
  /** Inhale progression (0..1). */
  inhale: (t01: number) => number;
  /** Exhale progression (0..1). */
  exhale: (t01: number) => number;
};

export type RelaxBreathCycleConfig = {
  durations: RelaxBreathCycleDurations;
  scale: RelaxBreathScaleConfig;
  opacity: RelaxBreathOpacityConfig;
  radius: RelaxBreathRadiusConfig;
  easing: RelaxBreathEasingConfig;
  /** Label lead time so text reads slightly ahead of motion. */
  labelLeadMs: number;
};

export const DEFAULT_RELAX_BREATH_CONFIG: RelaxBreathCycleConfig = {
  durations: {
    inhaleMs: RELAX_BREATH_INHALE_MS,
    holdMs: RELAX_BREATH_HOLD_MS,
    exhaleMs: RELAX_BREATH_EXHALE_MS,
    restMs: RELAX_BREATH_REST_MS,
  },
  scale: {
    // Match exhale end for a continuous loop without start-of-inhale catch-up.
    inhaleStart: 0.74,
    inhalePeak: 1.1,
    exhaleEnd: 0.74,
  },
  // Keep subtle: day/night theme still modulates through `visualTheme` in the hook.
  opacity: {
    inhaleStart: 0.0,
    inhalePeak: 1.0,
    rest: 0.0,
  },
  radius: {
    // Match exhale end so rest -> inhale has no radius snap.
    inhaleStart: 0.9,
    inhalePeak: 1.06,
    exhaleEnd: 0.9,
  },
  easing: {
    // Keep ring motion close to constant-speed across inhale/exhale.
    inhale: relaxBreathEaseLinear,
    exhale: relaxBreathEaseLinear,
  },
  labelLeadMs: 0,
};

export type RelaxBreathAmbientState = {
  /** False when Relax HUD is inactive or unmounted — canvas should ignore modifiers. */
  active: boolean;
  /** 0 = empty / small visual, 1 = full / large visual. */
  scale01: number;
  /**
   * Wander / swim speed multiplier in Relax (~0.9 at low breath … ~1.05 at full).
   * Canvas applies with smoothing; does not replace simulation `dt` (avoids timer jitter).
   */
  fishSpeedMul: number;
  /**
   * Inhale-only 0…1 weight for a gentle bias toward tank center (no pull on hold/exhale/rest).
   */
  fishCenterDrift01: number;
  /** Subtle full-screen light wash alpha (applied in canvas). */
  lightOverlayAlpha: number;
};

export const RELAX_BREATH_AMBIENT_IDLE: RelaxBreathAmbientState = {
  active: false,
  scale01: 0,
  fishSpeedMul: 1,
  fishCenterDrift01: 0,
  lightOverlayAlpha: 0,
};

export type RelaxBreathFrame = {
  /** Phase used for motion (ring scale/opacity/radius). */
  phase: RelaxBreathPhase;
  /** Phase used for label timing (slightly leads motion). */
  labelPhase: RelaxBreathPhase;
  /** Ring wrapper scale (CSS transform). */
  ringScale: number;
  /** Ring wrapper opacity (0…1). */
  ringOpacity: number;
  /** Multiplier for particle radius (inward draw clarity). */
  ringRadiusMult: number;
  /** Normalized breath fullness 0…1 for ambient integration. */
  scale01: number;
  fishSpeedMul: number;
  /** Same gate as ring inhale drift; only inhale contributes to fish center bias. */
  fishCenterDrift01: number;
  lightOverlayAlpha: number;
  /** Linear 0…1 position in the full cycle (for debugging / future use). */
  cyclePosition01: number;
  /** 0…1 drift weight (hold/rest should feel still). */
  drift01: number;
};

/** Center label copy — single word per phase, no numerals. */
export const RELAX_BREATH_PHASE_LABEL: Record<RelaxBreathPhase, string> = {
  inhale: "inhale",
  hold: "hold",
  exhale: "exhale",
  rest: "",
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

/**
 * Inhale ramp: gentler start than pure ease-out cubic.
 * Keeps the "settle" of ease-out but avoids a quick initial push.
 */
export function relaxBreathEaseGentleInhale(t: number): number {
  const x = clamp01(t);
  // Extra early drag: slows the first part of inhale noticeably.
  const s = relaxBreathSmootherstep(x);
  const slowed = s ** 1.35;
  return relaxBreathEaseOutCubic(slowed);
}

/** Ease-in cubic — contraction eases in softly (exhale). */
export function relaxBreathEaseInCubic(t: number): number {
  const x = clamp01(t);
  return x * x * x;
}

/**
 * Inward-biased easing (stronger perceived draw on exhale).
 * Similar feel to cubic-bezier(0.32, 0, 0.67, 0).
 */
export function relaxBreathEaseInOutInward(t: number): number {
  const x = clamp01(t);
  // Gentle start (zero slope) + stronger inward pull later.
  // This avoids a perceptible snap at hold→exhale while keeping exhale legible.
  const s = relaxBreathSmootherstep(x);
  return s ** 1.35;
}

/** Linear progression for steady, metronomic breath pacing. */
export function relaxBreathEaseLinear(t: number): number {
  return clamp01(t);
}

function lerp(a: number, b: number, t01: number): number {
  return a + (b - a) * clamp01(t01);
}

function toFullness01(scale: number, lo: number, hi: number): number {
  if (hi <= lo) return 0;
  return clamp01((scale - lo) / (hi - lo));
}

function easeInOutGate01(t01: number, enterWindow01: number, exitWindow01: number): number {
  const t = clamp01(t01);
  const enter = relaxBreathSmoothstep(clamp01(t / Math.max(enterWindow01, 1e-6)));
  const exit = relaxBreathSmoothstep(
    clamp01((1 - t) / Math.max(exitWindow01, 1e-6)),
  );
  return Math.min(enter, exit);
}

/**
 * Given elapsed time since cycle start (any non-negative ms), returns the current frame.
 */
export function computeRelaxBreathFrame(
  elapsedMs: number,
  config: RelaxBreathCycleConfig = DEFAULT_RELAX_BREATH_CONFIG,
): RelaxBreathFrame {
  const { durations, scale, opacity, radius, easing, labelLeadMs } = config;
  const cycleMs =
    durations.inhaleMs + durations.holdMs + durations.exhaleMs + durations.restMs;
  const t = elapsedMs % cycleMs;
  const cyclePosition01 = t / cycleMs;

  let phase: RelaxBreathPhase;
  let ringScale: number;
  let ringOpacity: number;
  let ringRadiusMult: number;
  let drift01: number;
  let phaseLocal01: number;

  if (t < durations.inhaleMs) {
    phase = "inhale";
    phaseLocal01 = t / durations.inhaleMs;
    const e = easing.inhale(phaseLocal01);
    ringScale = lerp(scale.inhaleStart, scale.inhalePeak, e);
    const inhaleOpacity = lerp(
      opacity.inhaleStart,
      opacity.inhalePeak,
      relaxBreathSmoothstep(phaseLocal01),
    );
    const inhaleRadius = lerp(
      radius.inhaleStart,
      radius.inhalePeak,
      relaxBreathSmootherstep(phaseLocal01),
    );
    ringOpacity = inhaleOpacity;
    ringRadiusMult = inhaleRadius;
    drift01 = easeInOutGate01(phaseLocal01, 0.22, 0.18);
  } else if (t < durations.inhaleMs + durations.holdMs) {
    phase = "hold";
    phaseLocal01 = (t - durations.inhaleMs) / durations.holdMs;
    ringScale = scale.inhalePeak;
    ringOpacity = opacity.inhalePeak;
    ringRadiusMult = radius.inhalePeak;
    drift01 = 0;
  } else if (t < durations.inhaleMs + durations.holdMs + durations.exhaleMs) {
    phase = "exhale";
    const ex = t - durations.inhaleMs - durations.holdMs;
    phaseLocal01 = ex / durations.exhaleMs;
    const e = easing.exhale(phaseLocal01);
    ringScale = lerp(scale.inhalePeak, scale.exhaleEnd, e);
    ringOpacity = lerp(opacity.inhalePeak, opacity.rest, relaxBreathSmoothstep(phaseLocal01));
    ringRadiusMult = lerp(radius.inhalePeak, radius.exhaleEnd, relaxBreathSmootherstep(phaseLocal01));
    drift01 = easeInOutGate01(phaseLocal01, 0.18, 0.22);
  } else {
    phase = "rest";
    phaseLocal01 =
      (t - durations.inhaleMs - durations.holdMs - durations.exhaleMs) /
      durations.restMs;
    ringScale = scale.exhaleEnd;
    ringOpacity = opacity.rest;
    ringRadiusMult = radius.exhaleEnd;
    drift01 = 0;
  }

  const scale01 = toFullness01(ringScale, scale.exhaleEnd, scale.inhalePeak);

  // Inhale / exhale / rest: subtle wander speed (~0.9…1.05). Hold: almost still.
  const fishSpeedMul =
    phase === "hold" ? RELAX_FISH_HOLD_SPEED_MUL : 0.9 + scale01 * 0.15;
  const fishCenterDrift01 = phase === "inhale" ? drift01 : 0;

  // Peak softly with breath fullness; keep very subtle (canvas may smooth + mode-gate).
  const lightOverlayAlpha = scale01 * 0.028;

  const labelT = (elapsedMs + labelLeadMs) % cycleMs;
  let labelPhase: RelaxBreathPhase;
  if (labelT < durations.inhaleMs) labelPhase = "inhale";
  else if (labelT < durations.inhaleMs + durations.holdMs) labelPhase = "hold";
  else if (labelT < durations.inhaleMs + durations.holdMs + durations.exhaleMs)
    labelPhase = "exhale";
  else labelPhase = "rest";

  return {
    phase,
    labelPhase,
    ringScale,
    ringOpacity,
    ringRadiusMult,
    scale01,
    fishSpeedMul,
    fishCenterDrift01,
    lightOverlayAlpha,
    cyclePosition01,
    drift01,
  };
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
