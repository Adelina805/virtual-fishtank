"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import FloatingControlPanel from "@/src/components/FloatingControlPanel";
import AquariumTankLayer, {
  type PoetryLayout,
} from "@/src/components/shell/AquariumTankLayer";
import AppShell from "@/src/components/shell/AppShell";
import { AppModeProvider } from "@/src/state/app-mode-context";
import { FocusTimerProvider } from "@/src/state/focus-timer-context";
import {
  DEFAULT_FISH_COUNT,
  getAquariumPoetryLayout,
  MAX_FISH_COUNT,
  type AquariumRuntimeSettings,
} from "@/src/lib/aquarium-runtime";
import {
  RELAX_BREATH_AMBIENT_IDLE,
  type RelaxBreathAmbientState,
} from "@/src/lib/relax-breathing-cycle";

export default function HomeAquariumExperience() {
  const [isNight, setIsNight] = useState(true);
  const [fishCount, setFishCount] = useState(DEFAULT_FISH_COUNT);
  const [isFeedMode, setIsFeedMode] = useState(false);
  const [sceneVisible, setSceneVisible] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [poetryLayout, setPoetryLayout] = useState<PoetryLayout | null>(null);

  const tankMeasureRef = useRef<HTMLDivElement>(null);

  const runtimeSettingsRef = useRef<AquariumRuntimeSettings>({
    ambience: "night",
    fishCount: DEFAULT_FISH_COUNT,
  });

  const feedModeRef = useRef(false);
  const relaxBreathAmbientRef = useRef<RelaxBreathAmbientState>(
    RELAX_BREATH_AMBIENT_IDLE,
  );

  useLayoutEffect(() => {
    runtimeSettingsRef.current.ambience = isNight ? "night" : "day";
    runtimeSettingsRef.current.fishCount = fishCount;
  }, [isNight, fishCount]);

  useLayoutEffect(() => {
    feedModeRef.current = isFeedMode;
  }, [isFeedMode]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- post-hydration theme from localStorage; avoids SSR/client mismatch */
    const stored =
      window.localStorage.getItem("aquacalma-ambience") ??
      window.localStorage.getItem("vf-ambience") ??
      window.localStorage.getItem("theme");
    if (stored === "day" || stored === "light") {
      setIsNight(false);
      return;
    }
    if (stored === "night" || stored === "dark") {
      setIsNight(true);
      return;
    }
    setIsNight(window.matchMedia("(prefers-color-scheme: dark)").matches);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    const value = isNight ? "night" : "day";
    window.localStorage.setItem("aquacalma-ambience", value);
    window.localStorage.setItem("theme", isNight ? "dark" : "light");
  }, [isNight]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSceneVisible(true));
    const controlsTimer = window.setTimeout(() => setControlsVisible(true), 450);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(controlsTimer);
    };
  }, []);

  useLayoutEffect(() => {
    const el = tankMeasureRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setPoetryLayout(getAquariumPoetryLayout(r.width, r.height));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <AppModeProvider>
      <FocusTimerProvider>
        <AppShell
          isNight={isNight}
          sceneVisible={sceneVisible}
          controlsVisible={controlsVisible}
          relaxBreathAmbientRef={relaxBreathAmbientRef}
          tankLayer={
            <AquariumTankLayer
              isNight={isNight}
              sceneVisible={sceneVisible}
              poetryLayout={poetryLayout}
              tankMeasureRef={tankMeasureRef}
              runtimeSettingsRef={runtimeSettingsRef}
              feedModeRef={feedModeRef}
              relaxBreathAmbientRef={relaxBreathAmbientRef}
            />
          }
          aquariumControls={
            <FloatingControlPanel
              isNight={isNight}
              onToggleDayNight={() => setIsNight((v) => !v)}
              isFeedMode={isFeedMode}
              onToggleFeedMode={() => setIsFeedMode((v) => !v)}
              fishCount={fishCount}
              defaultFishCount={DEFAULT_FISH_COUNT}
              maxFishCount={MAX_FISH_COUNT}
              onAddFish={() =>
                setFishCount((c) => Math.min(MAX_FISH_COUNT, c + 1))
              }
              onResetFish={() => setFishCount(DEFAULT_FISH_COUNT)}
            />
          }
        />
      </FocusTimerProvider>
    </AppModeProvider>
  );
}
