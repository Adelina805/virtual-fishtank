"use client";

import { Dancing_Script } from "next/font/google";
import { useEffect, useRef, useState } from "react";
import AquariumCanvas, {
  DEFAULT_FISH_COUNT,
  MAX_FISH_COUNT,
  type AquariumRuntimeSettings,
} from "@/src/components/AquariumCanvas";
import FloatingControlPanel from "@/src/components/FloatingControlPanel";

const poemFont = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "600"],
});

export default function HomeAquariumExperience() {
  const [isNight, setIsNight] = useState(true);
  const [fishCount, setFishCount] = useState(DEFAULT_FISH_COUNT);
  const [sceneVisible, setSceneVisible] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);

  const runtimeSettingsRef = useRef<AquariumRuntimeSettings>({
    ambience: "night",
    fishCount: DEFAULT_FISH_COUNT,
  });
  runtimeSettingsRef.current.ambience = isNight ? "night" : "day";
  runtimeSettingsRef.current.fishCount = fishCount;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSceneVisible(true));
    const controlsTimer = window.setTimeout(() => setControlsVisible(true), 450);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(controlsTimer);
    };
  }, []);

  return (
    <div
      className={
        isNight
          ? "relative h-dvh w-full overflow-hidden bg-slate-950"
          : "relative h-dvh w-full overflow-hidden bg-linear-to-b from-sky-50/95 via-cyan-50/55 to-slate-100/90"
      }
    >
      <h1 className="sr-only">
        Virtual Fishtank — a soothing, interactive aquarium with calm motion
        and gentle taps, comfortable on phones and desktops.
      </h1>

      <div
        className={`absolute inset-0 z-0 min-h-0 transition-opacity duration-[1400ms] ease-out ${
          sceneVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <AquariumCanvas
          runtimeSettingsRef={runtimeSettingsRef}
          poemFontFamily={poemFont.style.fontFamily}
        />
      </div>

      <aside
        className={`pointer-events-none absolute inset-e-[max(1.25rem,env(safe-area-inset-right))] bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-10 w-max max-w-[min(100vw-2rem,20rem)] transition-[opacity,transform] duration-700 ease-out sm:inset-e-[max(1.75rem,env(safe-area-inset-right))] sm:bottom-[max(1.75rem,env(safe-area-inset-bottom))] ${
          controlsVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-1.5 opacity-0"
        }`}
      >
        <FloatingControlPanel
          isNight={isNight}
          onToggleDayNight={() => setIsNight((v) => !v)}
          fishCount={fishCount}
          defaultFishCount={DEFAULT_FISH_COUNT}
          maxFishCount={MAX_FISH_COUNT}
          onAddFish={() =>
            setFishCount((c) => Math.min(MAX_FISH_COUNT, c + 1))
          }
          onResetFish={() => setFishCount(DEFAULT_FISH_COUNT)}
        />
      </aside>
    </div>
  );
}
