"use client";

import { useRef, type MutableRefObject } from "react";
import { useRelaxBreathing } from "@/src/hooks/use-relax-breathing";
import RelaxBreathRing from "@/src/components/modes/RelaxBreathRing";
import {
  aquariumPoetryTitleColor,
  relaxBreathGuideCircleStyle,
  relaxBreathMistRadialGradient,
  type AquariumPoetryTheme,
} from "@/src/lib/aquarium-poetry-colors";
import type { RelaxBreathAmbientState } from "@/src/lib/relax-breathing-cycle";

export type RelaxBreathingHudProps = {
  isNight: boolean;
  visible: boolean;
  ambientRef: MutableRefObject<RelaxBreathAmbientState>;
};

const phaseLayerClass =
  "pointer-events-none absolute inset-0 flex items-center justify-center text-center font-sans text-[0.72rem] font-light lowercase tracking-[0.28em] transition-opacity duration-[550ms] ease-[cubic-bezier(0.33,0,0.2,1)] sm:text-[0.8rem]";

/**
 * Always-on Relax breath: soft radial bubble ring + one quiet phase word (no numerals, no controls).
 */
export default function RelaxBreathingHud({
  isNight,
  visible,
  ambientRef,
}: RelaxBreathingHudProps) {
  const ringRef = useRef<HTMLDivElement>(null);
  const phaseARef = useRef<HTMLSpanElement>(null);
  const phaseBRef = useRef<HTMLSpanElement>(null);

  useRelaxBreathing(visible, {
    ringRef,
    phaseLayer0Ref: phaseARef,
    phaseLayer1Ref: phaseBRef,
    ambientRef,
    visualTheme: isNight ? "night" : "day",
  });

  if (!visible) return null;

  const theme: AquariumPoetryTheme = isNight ? "night" : "day";
  const mist = relaxBreathMistRadialGradient(theme);
  const phaseColor = aquariumPoetryTitleColor(theme);
  const guideStyle = !isNight ? relaxBreathGuideCircleStyle("day") : undefined;

  return (
    <div className="pointer-events-none flex w-full flex-col items-center justify-center px-2">
      <div className="relative flex h-[min(52vw,13.5rem)] w-[min(52vw,13.5rem)] items-center justify-center sm:h-56 sm:w-56">
        <div
          ref={ringRef}
          className={`absolute inset-0 origin-center will-change-transform ${
            isNight ? "blur-[0.2px]" : "blur-0"
          }`}
          style={{ opacity: 0 }}
          aria-hidden
        >
          <div
            className={`pointer-events-none absolute inset-[18%] rounded-full ${
              isNight ? "opacity-95" : "opacity-100"
            }`}
            style={{ background: mist }}
          />
          {!isNight ? (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-[min(54vw,13.5rem)] w-[min(54vw,13.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={guideStyle}
              aria-hidden
            />
          ) : null}
          <RelaxBreathRing isNight={isNight} />
        </div>

        <div
          className="relative z-1 flex h-9 w-[min(72%,10rem)] items-center justify-center sm:h-10"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span
            ref={phaseARef}
            className={phaseLayerClass}
            style={{ opacity: 0, color: phaseColor }}
          />
          <span
            ref={phaseBRef}
            className={phaseLayerClass}
            style={{ opacity: 0, color: phaseColor }}
          />
        </div>
      </div>
    </div>
  );
}
