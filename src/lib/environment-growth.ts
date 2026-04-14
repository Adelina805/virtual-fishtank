export type EnvironmentGrowthStage = 0 | 1 | 2 | 3;

export type EnvironmentGrowthState = {
  elapsedMs: number;
  stage: EnvironmentGrowthStage;
  fishBonusCount: number;
  plantRichness01: number;
  rareVisuals01: number;
};

export const FOCUS_GROWTH_THRESHOLDS_MS = {
  stage1: 5 * 60_000,
  stage2: 10 * 60_000,
  stage3: 20 * 60_000,
} as const;

const FOCUS_GROWTH_BLEND_MS = {
  fishStage1: 90_000,
  fishStage2: 120_000,
  fishStage3: 150_000,
  plants: 180_000,
  rare: 240_000,
} as const;

export const ENVIRONMENT_GROWTH_IDLE: EnvironmentGrowthState = {
  elapsedMs: 0,
  stage: 0,
  fishBonusCount: 0,
  plantRichness01: 0,
  rareVisuals01: 0,
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function smoothstep01(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function ramp01(elapsedMs: number, startMs: number, durationMs: number): number {
  const d = Math.max(1, durationMs);
  return smoothstep01((elapsedMs - startMs) / d);
}

export function computeEnvironmentGrowthStage(
  elapsedMs: number,
): EnvironmentGrowthStage {
  if (elapsedMs >= FOCUS_GROWTH_THRESHOLDS_MS.stage3) return 3;
  if (elapsedMs >= FOCUS_GROWTH_THRESHOLDS_MS.stage2) return 2;
  if (elapsedMs >= FOCUS_GROWTH_THRESHOLDS_MS.stage1) return 1;
  return 0;
}

export function computeEnvironmentGrowthState(
  elapsedMs: number,
): EnvironmentGrowthState {
  const safeElapsedMs = Math.max(0, elapsedMs);
  const stage = computeEnvironmentGrowthStage(safeElapsedMs);

  const stage1Fish = 2 * ramp01(
    safeElapsedMs,
    FOCUS_GROWTH_THRESHOLDS_MS.stage1,
    FOCUS_GROWTH_BLEND_MS.fishStage1,
  );
  const stage2Fish = 2 * ramp01(
    safeElapsedMs,
    FOCUS_GROWTH_THRESHOLDS_MS.stage2,
    FOCUS_GROWTH_BLEND_MS.fishStage2,
  );
  const stage3Fish = 2 * ramp01(
    safeElapsedMs,
    FOCUS_GROWTH_THRESHOLDS_MS.stage3,
    FOCUS_GROWTH_BLEND_MS.fishStage3,
  );
  const fishBonusCount = Math.round(stage1Fish + stage2Fish + stage3Fish);

  const plantRichness01 = ramp01(
    safeElapsedMs,
    FOCUS_GROWTH_THRESHOLDS_MS.stage2,
    FOCUS_GROWTH_BLEND_MS.plants,
  );
  const rareVisuals01 = ramp01(
    safeElapsedMs,
    FOCUS_GROWTH_THRESHOLDS_MS.stage3,
    FOCUS_GROWTH_BLEND_MS.rare,
  );

  return {
    elapsedMs: safeElapsedMs,
    stage,
    fishBonusCount,
    plantRichness01,
    rareVisuals01,
  };
}
