"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import PlayModeControls from "@/src/components/PlayModeControls";
import ThemeToggle from "@/src/components/ThemeToggle";
import AquariumTankLayer, {
  type PoetryLayout,
} from "@/src/components/shell/AquariumTankLayer";
import AppShell from "@/src/components/shell/AppShell";
import { AppModeProvider } from "@/src/state/app-mode-context";
import { FocusTimerProvider } from "@/src/state/focus-timer-context";
import {
  DEFAULT_ENVIRONMENT_GROWTH_STATE,
  DEFAULT_FISH_COUNT,
  getAquariumPoetryLayout,
  MAX_FISH_COUNT,
  type AquariumRuntimeSettings,
} from "@/src/lib/aquarium-runtime";
import {
  RELAX_BREATH_AMBIENT_IDLE,
  type RelaxBreathAmbientState,
} from "@/src/lib/relax-breathing-cycle";
import { useEnvironmentGrowth } from "@/src/hooks/use-environment-growth";

const FishCountToggle = dynamic(
  () => import("@/src/components/FishCountToggle"),
  { ssr: false, loading: () => null },
);

function HomeAquariumExperienceContent() {
  const [isNight, setIsNight] = useState(true);
  const [fishCount, setFishCount] = useState(DEFAULT_FISH_COUNT);
  const [growthBaselineBonus, setGrowthBaselineBonus] = useState(0);
  const [isFeedMode, setIsFeedMode] = useState(false);
  const [sceneVisible, setSceneVisible] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [poetryLayout, setPoetryLayout] = useState<PoetryLayout | null>(null);

  const tankMeasureRef = useRef<HTMLDivElement>(null);

  const runtimeSettingsRef = useRef<AquariumRuntimeSettings>({
    ambience: "night",
    fishCount: DEFAULT_FISH_COUNT,
    fishBonusBaseline: 0,
    environmentGrowth: DEFAULT_ENVIRONMENT_GROWTH_STATE,
  });

  const feedModeRef = useRef(false);
  const relaxBreathAmbientRef = useRef<RelaxBreathAmbientState>(
    RELAX_BREATH_AMBIENT_IDLE,
  );
  const environmentGrowth = useEnvironmentGrowth();

  useLayoutEffect(() => {
    runtimeSettingsRef.current.ambience = isNight ? "night" : "day";
    runtimeSettingsRef.current.fishCount = fishCount;
    runtimeSettingsRef.current.fishBonusBaseline = growthBaselineBonus;
    runtimeSettingsRef.current.environmentGrowth = environmentGrowth;
  }, [isNight, fishCount, growthBaselineBonus, environmentGrowth]);

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

  const effectiveTankFishCount = Math.min(
    MAX_FISH_COUNT,
    fishCount +
      Math.max(0, environmentGrowth.fishBonusCount - growthBaselineBonus),
  );

  return (
    <AppShell
      isNight={isNight}
      sceneVisible={sceneVisible}
      controlsVisible={controlsVisible}
      relaxBreathAmbientRef={relaxBreathAmbientRef}
      poetryLayout={poetryLayout}
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
      globalControls={
        <div className="flex flex-col items-end gap-1.5">
          <ThemeToggle
            isNight={isNight}
            onToggleDayNight={() => setIsNight((v) => !v)}
          />
          <FishCountToggle isNight={isNight} fishCount={effectiveTankFishCount} />
        </div>
      }
      playControls={
        <PlayModeControls
          isNight={isNight}
          isFeedMode={isFeedMode}
          onToggleFeedMode={() => setIsFeedMode((v) => !v)}
          fishCount={fishCount}
          displayFishCount={effectiveTankFishCount}
          defaultFishCount={DEFAULT_FISH_COUNT}
          maxFishCount={MAX_FISH_COUNT}
          onAddFish={() =>
            setFishCount((c) => Math.min(MAX_FISH_COUNT, c + 1))
          }
          onResetFish={() => {
            setGrowthBaselineBonus(environmentGrowth.fishBonusCount);
            setFishCount(DEFAULT_FISH_COUNT);
          }}
        />
      }
    />
  );
}

export default function HomeAquariumExperience() {
  return (
    <AppModeProvider>
      <FocusTimerProvider>
        <HomeAquariumExperienceContent />
      </FocusTimerProvider>
    </AppModeProvider>
  );
}
