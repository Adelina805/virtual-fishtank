"use client";

import { Dancing_Script } from "next/font/google";
import dynamic from "next/dynamic";
import { useLayoutEffect, useRef, type MutableRefObject } from "react";
import type { RelaxBreathAmbientState } from "@/src/lib/relax-breathing-cycle";
import {
  aquariumPoetryTaglineColor,
  aquariumPoetryTitleColor,
} from "@/src/lib/aquarium-poetry-colors";
import { MODE_TAGLINES } from "@/src/lib/mode-taglines";
import {
  getAquariumPoetryLayout,
  type AquariumRuntimeSettings,
} from "@/src/lib/aquarium-runtime";
import { useAppMode } from "@/src/state/app-mode-context";

const AquariumCanvas = dynamic(
  () => import("@/src/components/AquariumCanvas"),
  { ssr: false, loading: () => null },
);

const poemFont = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "600"],
});

export type PoetryLayout = ReturnType<typeof getAquariumPoetryLayout>;

export type AquariumTankLayerProps = {
  isNight: boolean;
  sceneVisible: boolean;
  poetryLayout: PoetryLayout | null;
  tankMeasureRef: MutableRefObject<HTMLDivElement | null>;
  runtimeSettingsRef: MutableRefObject<AquariumRuntimeSettings>;
  feedModeRef: MutableRefObject<boolean>;
  relaxBreathAmbientRef: MutableRefObject<RelaxBreathAmbientState>;
};

/** Full-viewport tank: LCP mirror, measure root, and canvas simulation. */
export default function AquariumTankLayer({
  isNight,
  sceneVisible,
  poetryLayout,
  tankMeasureRef,
  runtimeSettingsRef,
  feedModeRef,
  relaxBreathAmbientRef,
}: AquariumTankLayerProps) {
  const { mode } = useAppMode();
  const appModeRef = useRef(mode);
  useLayoutEffect(() => {
    appModeRef.current = mode;
  }, [mode]);

  const tagline = MODE_TAGLINES[mode];
  const poetryTheme = isNight ? "night" : "day";

  return (
    <div ref={tankMeasureRef} className="absolute inset-0 z-0 min-h-0">
      {poetryLayout ? (
        <div
          className="pointer-events-none absolute inset-0 z-0 flex justify-center opacity-[0.01] select-none"
          style={{ paddingTop: poetryLayout.paddingTop }}
          aria-hidden
        >
          <div className={`w-full text-center ${poemFont.className}`}>
            <p
              className="m-0 font-semibold"
              style={{
                fontSize: poetryLayout.titleSize,
                lineHeight: `${poetryLayout.titleLineHeight}px`,
                color: aquariumPoetryTitleColor(poetryTheme),
              }}
            >
              Aquacalma
            </p>
            <p
              className="m-0 max-w-[min(92vw,36rem)] font-normal"
              style={{
                marginTop: poetryLayout.taglinesMarginTop,
                fontSize: poetryLayout.lineSize,
                lineHeight: `${poetryLayout.lineHeight}px`,
                color: aquariumPoetryTaglineColor(poetryTheme),
              }}
            >
              {tagline}
            </p>
          </div>
        </div>
      ) : null}

      <div
        className={`relative z-10 flex h-full min-h-0 flex-col transition-opacity duration-1400 ease-out ${
          sceneVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <AquariumCanvas
          runtimeSettingsRef={runtimeSettingsRef}
          feedModeRef={feedModeRef}
          poemFontFamily={poemFont.style.fontFamily}
          appModeRef={appModeRef}
          relaxBreathAmbientRef={relaxBreathAmbientRef}
        />
      </div>
    </div>
  );
}
