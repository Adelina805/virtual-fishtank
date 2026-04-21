"use client";

import { Dancing_Script } from "next/font/google";
import dynamic from "next/dynamic";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { RelaxBreathAmbientState } from "@/src/lib/relax-breathing-cycle";
import {
  aquariumPoetryTaglineColor,
  aquariumPoetryTitleColor,
} from "@/src/lib/aquarium-poetry-colors";
import { MODE_TAGLINES } from "@/src/lib/mode-taglines";
import {
  type AquariumPoetryLayout,
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
  display: "swap",
});

export type PoetryLayout = AquariumPoetryLayout;

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
  const [canvasReady, setCanvasReady] = useState(false);
  const appModeRef = useRef(mode);
  useLayoutEffect(() => {
    appModeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;
    const arm = () => setCanvasReady(true);
    if ("requestIdleCallback" in globalThis) {
      idleId = requestIdleCallback(arm, { timeout: 500 });
    } else {
      timeoutId = setTimeout(arm, 120);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (idleId !== null && "cancelIdleCallback" in globalThis) {
        cancelIdleCallback(idleId);
      }
    };
  }, []);

  const tagline = MODE_TAGLINES[mode];
  const poetryTheme = isNight ? "night" : "day";
  const poemFontFamilyWithFallback = `${poemFont.style.fontFamily}, ui-serif, Georgia, serif`;
  const titleFontSize = poetryLayout?.titleSize ?? "clamp(2.15rem, 6.3vw, 3.15rem)";
  const titleLineHeight = poetryLayout?.titleLineHeight ?? 50;
  const lineFontSize = poetryLayout?.lineSize ?? "clamp(1.05rem, 3.3vw, 1.35rem)";
  const lineHeight = poetryLayout?.lineHeight ?? 32;
  const taglinesMarginTop = poetryLayout?.taglinesMarginTop ?? "0.28em";
  const paddingTop = poetryLayout?.paddingTop ?? "clamp(4.25rem, 13vh, 7.25rem)";

  return (
    <div ref={tankMeasureRef} className="absolute inset-0 z-0 min-h-0">
      <div
        className="pointer-events-none absolute inset-0 z-0 flex justify-center opacity-[0.01] select-none"
        style={{ paddingTop }}
        aria-hidden
      >
        <div className={`w-full text-center ${poemFont.className}`}>
          <p
            className="m-0 font-semibold"
            style={{
              fontSize: titleFontSize,
              lineHeight: `${titleLineHeight}px`,
              fontFamily: poemFontFamilyWithFallback,
              color: aquariumPoetryTitleColor(poetryTheme),
            }}
          >
            Aquacalma
          </p>
          <p
            className="m-0 max-w-[min(92vw,36rem)] font-normal"
            style={{
              marginTop: taglinesMarginTop,
              fontSize: lineFontSize,
              lineHeight: `${lineHeight}px`,
              fontFamily: poemFontFamilyWithFallback,
              color: aquariumPoetryTaglineColor(poetryTheme),
            }}
          >
            {tagline}
          </p>
        </div>
      </div>

      <div
        className={`relative z-10 flex h-full min-h-0 flex-col transition-opacity duration-1400 ease-out ${
          sceneVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {canvasReady ? (
          <AquariumCanvas
            runtimeSettingsRef={runtimeSettingsRef}
            feedModeRef={feedModeRef}
            poemFontFamily={poemFontFamilyWithFallback}
            appModeRef={appModeRef}
            relaxBreathAmbientRef={relaxBreathAmbientRef}
          />
        ) : null}
      </div>
    </div>
  );
}
