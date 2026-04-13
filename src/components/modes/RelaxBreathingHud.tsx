"use client";

import { useRef, type MutableRefObject } from "react";
import { useRelaxBreathing } from "@/src/hooks/use-relax-breathing";
import type { RelaxBreathAmbientState } from "@/src/lib/relax-breathing-cycle";

export type RelaxBreathingHudProps = {
  isNight: boolean;
  visible: boolean;
  ambientRef: MutableRefObject<RelaxBreathAmbientState>;
};

/**
 * Minimal always-on breath cue for Relax mode: one soft disc, motion only.
 */
export default function RelaxBreathingHud({
  isNight,
  visible,
  ambientRef,
}: RelaxBreathingHudProps) {
  const discRef = useRef<HTMLDivElement>(null);
  useRelaxBreathing(visible, { discRef, ambientRef });

  if (!visible) return null;

  return (
    <div className="pointer-events-none flex w-full flex-col items-center justify-center px-2">
      <div
        ref={discRef}
        className="h-[min(44vw,12rem)] w-[min(44vw,12rem)] rounded-full sm:h-44 sm:w-44"
        style={{
          opacity: 0,
          background: isNight
            ? "radial-gradient(circle at 38% 32%, rgba(185,220,245,0.38) 0%, rgba(110,165,205,0.22) 46%, rgba(70,110,150,0.08) 72%, transparent 88%)"
            : "radial-gradient(circle at 38% 32%, rgba(255,255,255,0.72) 0%, rgba(200,230,252,0.38) 48%, rgba(160,205,235,0.16) 76%, transparent 90%)",
          boxShadow: isNight
            ? "0 0 88px -4px rgba(140,200,235,0.28), inset 0 0 52px -10px rgba(210,235,255,0.14)"
            : "0 0 72px -6px rgba(90,155,210,0.22), inset 0 0 48px -12px rgba(255,255,255,0.38)",
          willChange: "transform, opacity",
        }}
        aria-hidden
      />
    </div>
  );
}
