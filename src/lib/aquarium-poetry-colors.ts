/**
 * Typography colors for the “Aquacalma” title + tagline (tank poetry + canvas caption).
 * Reused by Relax breathe ring so HUD matches title UI.
 */

export type AquariumPoetryTheme = "night" | "day";

const TITLE = {
  night: { r: 255, g: 250, b: 245, a: 0.54 },
  day: { r: 18, g: 50, b: 70, a: 0.72 },
} as const;

const TAGLINE = {
  night: { r: 200, g: 228, b: 248, a: 0.38 },
  day: { r: 26, g: 68, b: 86, a: 0.48 },
} as const;

function rgba(
  c: Readonly<{ r: number; g: number; b: number; a: number }>,
): string {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
}

export function aquariumPoetryTitleColor(theme: AquariumPoetryTheme): string {
  return rgba(TITLE[theme]);
}

export function aquariumPoetryTaglineColor(theme: AquariumPoetryTheme): string {
  return rgba(TAGLINE[theme]);
}

/** Bubble fill + glow — same hue as title, tuned for small dots. */
export function relaxBreathRingParticleAppearance(
  theme: AquariumPoetryTheme,
): { backgroundColor: string; boxShadow: string } {
  const { r, g, b, a } = TITLE[theme];
  const backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
  if (theme === "night") {
    return {
      backgroundColor,
      boxShadow: `0 0 12px 3px rgba(${r}, ${g}, ${b}, 0.26)`,
    };
  }
  return {
    backgroundColor,
    boxShadow: `0 0 0 1px rgba(${r}, ${g}, ${b}, 0.42), 0 2px 10px rgba(${r}, ${g}, ${b}, 0.3)`,
  };
}

/** Soft radial wash behind ring particles (title chroma, low alpha). */
export function relaxBreathMistRadialGradient(
  theme: AquariumPoetryTheme,
): string {
  const { r, g, b } = TITLE[theme];
  if (theme === "night") {
    return `radial-gradient(circle at 50% 48%, rgba(${r},${g},${b},0.2) 0%, rgba(${r},${g},${b},0.07) 52%, transparent 74%)`;
  }
  return `radial-gradient(circle at 50% 48%, rgba(${r},${g},${b},0.34) 0%, rgba(${r},${g},${b},0.2) 48%, rgba(${r},${g},${b},0.07) 68%, transparent 78%)`;
}

/**
 * Day-mode orbit hint — title-hue glow only (no border).
 */
export function relaxBreathGuideCircleStyle(
  theme: AquariumPoetryTheme,
): {
  borderWidth: number;
  borderStyle: "solid";
  borderColor: string;
  boxShadow: string;
} {
  const { r, g, b } = TITLE[theme];
  return {
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: "transparent",
    boxShadow: `0 0 32px rgba(${r}, ${g}, ${b}, 0.07), 0 0 56px rgba(${r}, ${g}, ${b}, 0.04)`,
  };
}
