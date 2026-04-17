"use client";

import type { MutableRefObject, ReactNode } from "react";
import type { PoetryLayout } from "@/src/components/shell/AquariumTankLayer";
import type { RelaxBreathAmbientState } from "@/src/lib/relax-breathing-cycle";
import ModeToggle from "@/src/components/mode/ModeToggle";
import FocusModeHud from "@/src/components/modes/FocusModeHud";
import RelaxBreathingHud from "@/src/components/modes/RelaxBreathingHud";
import { MODE_TAGLINES } from "@/src/lib/mode-taglines";
import { useAppMode } from "@/src/state/app-mode-context";

export type AppShellProps = {
  isNight: boolean;
  sceneVisible: boolean;
  controlsVisible: boolean;
  /** Simulation + LCP layer (absolute inset-0). */
  tankLayer: ReactNode;
  /** Top-right global controls (theme toggle). */
  globalControls: ReactNode;
  /** Play-mode controls (fish and feed actions). */
  playControls: ReactNode;
  /** Shared Relax breath state for canvas sync (fish / light). */
  relaxBreathAmbientRef: MutableRefObject<RelaxBreathAmbientState>;
  /** Measured poetry block — positions relax/focus HUD in a column below title + tagline. */
  poetryLayout: PoetryLayout | null;
};

/**
 * Composes the full-screen experience: tank (z-0), light per-mode HUD, chrome
 * and controls above. Keeps the canvas visually dominant.
 */
export default function AppShell({
  isNight,
  sceneVisible,
  controlsVisible,
  tankLayer,
  globalControls,
  playControls,
  relaxBreathAmbientRef,
  poetryLayout,
}: AppShellProps) {
  const { mode } = useAppMode();
  const tagline = MODE_TAGLINES[mode];

  const rootBg = isNight
    ? "relative h-dvh w-full overflow-hidden bg-slate-950"
    : "relative h-dvh w-full overflow-hidden bg-linear-to-b from-sky-50/95 via-cyan-50/55 to-slate-100/90";

  return (
    <div className={rootBg}>
      <h1 className="sr-only">
        Aquacalma — {tagline}. Interactive digital aquarium, comfortable on phones
        and desktops.
      </h1>

      {tankLayer}

      {(mode === "relax" || mode === "focus") && (
        <div
          className={`pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-start px-2 transition-opacity duration-700 ease-out ${
            poetryLayout ? "pt-0" : "pt-[max(11.5rem,calc(env(safe-area-inset-top)+11rem))] sm:pt-[max(12.5rem,calc(env(safe-area-inset-top)+11.75rem))]"
          } ${sceneVisible ? "opacity-100" : "opacity-0"}`}
          style={
            poetryLayout
              ? {
                  paddingTop: `max(calc(env(safe-area-inset-top) + 0.5rem), ${poetryLayout.modeHudTopPx}px)`,
                }
              : undefined
          }
        >
          <div
            className={`pointer-events-none flex w-full max-w-[min(100vw-1.5rem,28rem)] shrink-0 flex-col items-center gap-4 transition-transform duration-700 ease-out sm:max-w-none sm:gap-5 ${
              sceneVisible ? "translate-y-0" : "translate-y-2"
            }`}
          >
            {mode === "relax" ? (
              <RelaxBreathingHud
                isNight={isNight}
                visible={sceneVisible}
                ambientRef={relaxBreathAmbientRef}
              />
            ) : null}
            {mode === "focus" ? <FocusModeHud isNight={isNight} /> : null}
          </div>
        </div>
      )}

      <div
        className={`pointer-events-none absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-30 w-full max-w-[min(100vw-1.5rem,28rem)] -translate-x-1/2 px-2 transition-[opacity,transform] duration-700 ease-out sm:bottom-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-none ${
          sceneVisible ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
        }`}
      >
        {mode === "play" ? (
          <div className="pointer-events-auto mx-auto mb-2 flex justify-center sm:mb-3">
            {playControls}
          </div>
        ) : null}
        <div className="pointer-events-auto mx-auto flex justify-center">
          <ModeToggle isNight={isNight} />
        </div>
      </div>

      <a
        href="https://github.com/Adelina805/aquacalma"
        target="_blank"
        rel="noopener noreferrer"
        className={`pointer-events-auto absolute left-[max(1.25rem,env(safe-area-inset-left))] bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-50 cursor-pointer text-base leading-none no-underline transition-[opacity,color] duration-700 ease-out sm:left-[max(1.75rem,env(safe-area-inset-left))] sm:bottom-[max(1.75rem,env(safe-area-inset-bottom))] ${
          sceneVisible ? "opacity-100" : "opacity-0"
        } ${
          isNight
            ? "text-slate-400 hover:text-rose-500"
            : "text-slate-400 hover:text-rose-500"
        }`}
        aria-label="Aquacalma on GitHub"
      >
        <span aria-hidden className="select-none">
          &#9829;
        </span>
      </a>

      <aside
        className={`pointer-events-none absolute inset-e-[max(0.5rem,env(safe-area-inset-right))] top-[max(0.5rem,env(safe-area-inset-top))] z-10 w-max max-w-[min(100vw-1rem,20rem)] transition-[opacity,transform] duration-700 ease-out sm:inset-e-[max(0.75rem,env(safe-area-inset-right))] sm:top-[max(0.75rem,env(safe-area-inset-top))] ${
          controlsVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-1.5 opacity-0"
        }`}
      >
        {globalControls}
      </aside>
    </div>
  );
}
