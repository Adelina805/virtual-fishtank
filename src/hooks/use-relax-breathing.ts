"use client";

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import {
  computeRelaxBreathFrame,
  RELAX_BREATH_PHASE_LABEL,
  type RelaxBreathAmbientState,
  type RelaxBreathPhase,
  type RelaxBreathTimingConfig,
  type RelaxBreathRingVisualTheme,
  relaxBreathRingGroupOpacityFrom01,
  relaxBreathRingScaleFrom01,
  RELAX_BREATH_AMBIENT_IDLE,
} from "@/src/lib/relax-breathing-cycle";

export type UseRelaxBreathingOptions = {
  /** Ring container: scale, opacity, and subtle drift applied each frame (no React updates). */
  ringRef: RefObject<HTMLDivElement | null>;
  /** Two layers for crossfading phase words without flashing text. */
  phaseLayer0Ref: RefObject<HTMLSpanElement | null>;
  phaseLayer1Ref: RefObject<HTMLSpanElement | null>;
  /** Written each frame for aquarium integration (fish + light); reset when inactive. */
  ambientRef: MutableRefObject<RelaxBreathAmbientState>;
  /** Optional override; defaults to `DEFAULT_RELAX_BREATH_TIMING` in `computeRelaxBreathFrame`. */
  timing?: RelaxBreathTimingConfig;
  /** Drives ring group opacity curve (day needs stronger alpha on light backgrounds). */
  visualTheme: RelaxBreathRingVisualTheme;
};

/**
 * Continuous ambient breath cycle while `sessionActive` is true.
 * Stops when leaving Relax mode or hiding the scene; clears `ambientRef` on teardown.
 */
export function useRelaxBreathing(
  sessionActive: boolean,
  {
    ringRef,
    phaseLayer0Ref,
    phaseLayer1Ref,
    ambientRef,
    timing,
    visualTheme,
  }: UseRelaxBreathingOptions,
): void {
  const cycleStartRef = useRef<number | null>(null);
  const rafRef = useRef(0);
  const lastPhaseRef = useRef<RelaxBreathPhase | null>(null);
  const activeLayerRef = useRef(0);

  useEffect(() => {
    const phaseSpan0 = phaseLayer0Ref.current;
    const phaseSpan1 = phaseLayer1Ref.current;
    const ringStopTarget = ringRef.current;

    const applyRingVisual = (scale01: number, elapsed: number) => {
      const el = ringRef.current;
      if (!el) return;
      const driftDeg = Math.sin(elapsed / 9800) * 0.55;
      const s = relaxBreathRingScaleFrom01(scale01);
      el.style.transform = `scale(${s}) rotate(${driftDeg}deg)`;
      el.style.opacity = String(
        relaxBreathRingGroupOpacityFrom01(scale01, visualTheme),
      );
    };

    const setPhaseLayers = (phase: RelaxBreathPhase, activeIndex: number) => {
      const a = phaseLayer0Ref.current;
      const b = phaseLayer1Ref.current;
      if (!a || !b) return;
      const layers = [a, b] as const;
      const label = RELAX_BREATH_PHASE_LABEL[phase];
      const visible = layers[activeIndex];
      const hidden = layers[1 - activeIndex];
      visible.textContent = label;
      hidden.textContent = label;
      visible.style.opacity = "1";
      hidden.style.opacity = "0";
    };

    const syncPhaseUi = (phase: RelaxBreathPhase) => {
      if (lastPhaseRef.current === phase) return;
      const next = 1 - activeLayerRef.current;
      const a = phaseLayer0Ref.current;
      const b = phaseLayer1Ref.current;
      if (!a || !b) return;
      const layers = [a, b] as const;
      const label = RELAX_BREATH_PHASE_LABEL[phase];
      const from = activeLayerRef.current;
      const to = next;
      layers[to].textContent = label;
      layers[to].style.opacity = "1";
      layers[from].style.opacity = "0";
      activeLayerRef.current = to;
      lastPhaseRef.current = phase;
    };

    if (!sessionActive) {
      ambientRef.current = { ...RELAX_BREATH_AMBIENT_IDLE };
      lastPhaseRef.current = null;
      const el = ringRef.current;
      if (el) {
        el.style.transform = "scale(1) rotate(0deg)";
        el.style.opacity = "0";
      }
      if (phaseSpan0) phaseSpan0.style.opacity = "0";
      if (phaseSpan1) phaseSpan1.style.opacity = "0";
      return;
    }

    const applyIdleVisual = () => {
      const f = computeRelaxBreathFrame(0, timing);
      applyRingVisual(f.scale01, 0);
      activeLayerRef.current = 0;
      lastPhaseRef.current = null;
      setPhaseLayers(f.phase, 0);
      lastPhaseRef.current = f.phase;
    };

    const tick = (now: number) => {
      if (cycleStartRef.current === null) {
        cycleStartRef.current = now;
      }
      const elapsed = now - cycleStartRef.current;
      const frame = computeRelaxBreathFrame(elapsed, timing);

      ambientRef.current = {
        active: true,
        scale01: frame.scale01,
        fishDtScale: frame.fishDtScale,
        lightOverlayAlpha: frame.lightOverlayAlpha,
      };

      applyRingVisual(frame.scale01, elapsed);
      syncPhaseUi(frame.phase);

      rafRef.current = requestAnimationFrame(tick);
    };

    cycleStartRef.current = null;
    applyIdleVisual();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      cycleStartRef.current = null;
      lastPhaseRef.current = null;
      ambientRef.current = { ...RELAX_BREATH_AMBIENT_IDLE };
      if (ringStopTarget) {
        ringStopTarget.style.transform = "scale(1) rotate(0deg)";
        ringStopTarget.style.opacity = "0";
      }
      if (phaseSpan0) phaseSpan0.style.opacity = "0";
      if (phaseSpan1) phaseSpan1.style.opacity = "0";
    };
  }, [
    sessionActive,
    ambientRef,
    ringRef,
    phaseLayer0Ref,
    phaseLayer1Ref,
    timing,
    visualTheme,
  ]);
}
