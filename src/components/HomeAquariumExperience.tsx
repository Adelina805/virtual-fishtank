"use client";

import { Dancing_Script } from "next/font/google";
import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import FloatingControlPanel from "@/src/components/FloatingControlPanel";
import {
  AQUARIUM_POEM_TAGLINES,
  DEFAULT_FISH_COUNT,
  getAquariumPoetryLayout,
  MAX_FISH_COUNT,
  type AquariumRuntimeSettings,
} from "@/src/lib/aquarium-runtime";

const AquariumCanvas = dynamic(
  () => import("@/src/components/AquariumCanvas"),
  { ssr: false, loading: () => null },
);

const poemFont = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "600"],
});

type PoetryLayout = ReturnType<typeof getAquariumPoetryLayout>;

export default function HomeAquariumExperience() {
  // Keep initial SSR/CSR markup identical; hydrate preference after mount.
  const [isNight, setIsNight] = useState(true);
  const [fishCount, setFishCount] = useState(DEFAULT_FISH_COUNT);
  const [sceneVisible, setSceneVisible] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  // Must start null on server and client so the first paint matches (avoids hydration mismatch).
  const [poetryLayout, setPoetryLayout] = useState<PoetryLayout | null>(null);

  const tankMeasureRef = useRef<HTMLDivElement>(null);

  const runtimeSettingsRef = useRef<AquariumRuntimeSettings>({
    ambience: "night",
    fishCount: DEFAULT_FISH_COUNT,
  });
  runtimeSettingsRef.current.ambience = isNight ? "night" : "day";
  runtimeSettingsRef.current.fishCount = fishCount;

  useEffect(() => {
    const stored =
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
  }, []);

  useEffect(() => {
    const value = isNight ? "night" : "day";
    window.localStorage.setItem("vf-ambience", value);
    // Keep compatibility with common theme keys used by other UI parts.
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

      <div ref={tankMeasureRef} className="absolute inset-0 z-0 min-h-0">
        {/* Invisible DOM copy for LCP metrics (canvas is the real visuals). */}
        {poetryLayout ? (
          <div
            className="pointer-events-none absolute inset-0 z-0 flex justify-center text-transparent select-none"
            style={{ paddingTop: poetryLayout.paddingTop }}
            aria-hidden
          >
            <div
              className={`w-full text-center ${poemFont.className}`}
            >
              <p
                className="m-0 font-semibold"
                style={{
                  fontSize: poetryLayout.titleSize,
                  lineHeight: `${poetryLayout.titleLineHeight}px`,
                }}
              >
                Virtual Fishtank
              </p>
              <div
                className="m-0"
                style={{ marginTop: poetryLayout.taglinesMarginTop }}
              >
                {AQUARIUM_POEM_TAGLINES.map((line) => (
                  <p
                    key={line}
                    className="m-0 font-normal"
                    style={{
                      fontSize: poetryLayout.lineSize,
                      lineHeight: `${poetryLayout.lineHeight}px`,
                    }}
                  >
                    {line}
                  </p>
                ))}
              </div>
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
            poemFontFamily={poemFont.style.fontFamily}
          />
        </div>
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
