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
