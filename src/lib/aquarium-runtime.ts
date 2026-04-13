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
};

/** Same strings as canvas poetry (DOM LCP mirror + draw). */
export const AQUARIUM_POEM_TAGLINES = [
  "A soothing, interactive aquarium",
  "with gentle motion and responsive life,",
  "a space to rest, return, and breathe.",
] as const;

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
  const n = AQUARIUM_POEM_TAGLINES.length;
  const blockHalfHeight = (titleSize * 1.1 + n * lineHeight) * 0.5;
  const cy = h * 0.24;
  const yTitle = cy - blockHalfHeight + titleSize * 0.45;
  const titleLineHeight = titleSize * 1.1;
  const paddingTop = yTitle - titleLineHeight / 2;
  const taglinesMarginTop = titleSize * 0.5 - lineHeight / 2;
  return {
    titleSize,
    lineSize,
    lineHeight,
    yTitle,
    titleLineHeight,
    paddingTop,
    taglinesMarginTop,
  };
}
