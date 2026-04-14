import type { EnvironmentGrowthState } from "@/src/lib/environment-growth";
import { ENVIRONMENT_GROWTH_IDLE } from "@/src/lib/environment-growth";

export type AquariumAmbience = "day" | "night";

/** Default school size (user can add fish up to `MAX_FISH_COUNT`). */
export const DEFAULT_FISH_COUNT = 10;
/** Upper bound for extra fish — keeps mobile GPUs happier. */
export const MAX_FISH_COUNT = 100;

/**
 * Mutable settings read every animation frame — keep them in a ref so the canvas can stay memoized
 * while React state updates only the control panel.
 */
export type AquariumRuntimeSettings = {
  ambience: AquariumAmbience;
  /** Clamped each frame to DEFAULT…MAX. */
  fishCount: number;
  /** Focus-driven growth layer; rendering systems read this (not timer logic). */
  environmentGrowth: EnvironmentGrowthState;
};

export const DEFAULT_ENVIRONMENT_GROWTH_STATE = ENVIRONMENT_GROWTH_IDLE;

/** One mode-specific caption under the title (see `MODE_TAGLINES` in `mode-taglines.ts`). */
const POETRY_TAGLINE_LINE_COUNT = 1;

/** Sizing and vertical placement shared by `drawAquariumPoetry` and the DOM LCP mirror. */
export function getAquariumPoetryLayout(cssWidth: number, cssHeight: number) {
  const w = Math.max(1, cssWidth);
  const h = Math.max(1, cssHeight);
  const isMobile = w < 640;
  const titleSize = isMobile
    ? Math.max(32, Math.min(60, w * 0.105))
    : Math.max(26, Math.min(56, w * 0.09));
  const lineSize = isMobile
    ? Math.max(18, Math.min(30, w * 0.05))
    : Math.max(15, Math.min(26, w * 0.042));
  const lineHeight = lineSize * 1.42;
  const n = POETRY_TAGLINE_LINE_COUNT;
  const blockHalfHeight = (titleSize * 1.1 + n * lineHeight) * 0.5;
  /** Vertical anchor for title + taglines (fraction of height); larger = lower on screen. */
  const cy = h * 0.16;
  const yTitle = cy - blockHalfHeight + titleSize * 0.45;
  const titleLineHeight = titleSize * 1.1;
  const paddingTop = yTitle - titleLineHeight / 2;
  const taglinesMarginTop = titleSize * 0.5 - lineHeight / 2;
  /** Bottom edge of the title + tagline stack (matches DOM LCP mirror + canvas poetry). */
  const poetryStackBottom =
    paddingTop + titleLineHeight + taglinesMarginTop + lineHeight;
  /** Padding from tank top to start relax/focus HUD so it stacks below the poetry block. */
  const modeHudTopPx = poetryStackBottom + 32;
  return {
    titleSize,
    lineSize,
    lineHeight,
    yTitle,
    titleLineHeight,
    paddingTop,
    taglinesMarginTop,
    poetryStackBottom,
    modeHudTopPx,
  };
}

export type AquariumPoetryLayout = ReturnType<typeof getAquariumPoetryLayout>;
