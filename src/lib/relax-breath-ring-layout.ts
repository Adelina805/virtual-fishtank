/**
 * Deterministic layout for Relax-mode radial “bubble” particles (no Math.random).
 * Keeps rendering props stable across renders for performance.
 */

export const RELAX_BREATH_RING_PARTICLE_COUNT = 26;

/** Small angular jitter per index — organic ring, still reproducible. */
export function relaxBreathRingParticleJitterDeg(index: number): number {
  return Math.sin(index * 2.918 + 0.37) * 5.2 + Math.cos(index * 1.713) * 2.1;
}

/** Slight size variation (px) for softer, less uniform bubbles. */
export function relaxBreathRingParticleSizePx(index: number): number {
  const base = 3.6;
  const wobble = 0.6 * Math.sin(index * 1.47);
  return Math.round((base + wobble) * 10) / 10;
}
