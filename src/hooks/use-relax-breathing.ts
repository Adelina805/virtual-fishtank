"use client";

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import {
  computeRelaxBreathFrame,
  type RelaxBreathAmbientState,
  relaxBreathDiscOpacityFrom01,
  relaxBreathDiscScaleFrom01,
  RELAX_BREATH_AMBIENT_IDLE,
} from "@/src/lib/relax-breathing-cycle";

export type UseRelaxBreathingOptions = {
  /** Element whose transform/opacity are driven each frame (avoids React re-renders). */
  discRef: RefObject<HTMLDivElement | null>;
  /** Written each frame for aquarium integration (fish + light); reset when inactive. */
  ambientRef: MutableRefObject<RelaxBreathAmbientState>;
};

/**
 * Continuous ambient breath cycle while `sessionActive` is true.
 * Stops when leaving Relax mode or hiding the scene; clears `ambientRef` on teardown.
 */
export function useRelaxBreathing(
  sessionActive: boolean,
  { discRef, ambientRef }: UseRelaxBreathingOptions,
): void {
  const cycleStartRef = useRef<number | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!sessionActive) {
      ambientRef.current = { ...RELAX_BREATH_AMBIENT_IDLE };
      const el = discRef.current;
      if (el) {
        el.style.transform = "scale(1)";
        el.style.opacity = "0";
      }
      return;
    }

    const applyIdleVisual = () => {
      const el = discRef.current;
      if (el) {
        const f = computeRelaxBreathFrame(0);
        el.style.transform = `scale(${relaxBreathDiscScaleFrom01(f.scale01)})`;
        el.style.opacity = String(relaxBreathDiscOpacityFrom01(f.scale01));
      }
    };

    const tick = (now: number) => {
      if (cycleStartRef.current === null) {
        cycleStartRef.current = now;
      }
      const elapsed = now - cycleStartRef.current;
      const frame = computeRelaxBreathFrame(elapsed);

      ambientRef.current = {
        active: true,
        scale01: frame.scale01,
        fishDtScale: frame.fishDtScale,
        lightOverlayAlpha: frame.lightOverlayAlpha,
      };

      const el = discRef.current;
      if (el) {
        el.style.transform = `scale(${relaxBreathDiscScaleFrom01(frame.scale01)})`;
        el.style.opacity = String(relaxBreathDiscOpacityFrom01(frame.scale01));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    cycleStartRef.current = null;
    applyIdleVisual();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      cycleStartRef.current = null;
      ambientRef.current = { ...RELAX_BREATH_AMBIENT_IDLE };
    };
  }, [sessionActive, ambientRef, discRef]);
}
