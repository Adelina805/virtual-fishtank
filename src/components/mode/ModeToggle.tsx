"use client";

import {
  useCallback,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { APP_MODES, type AppMode } from "@/src/lib/app-mode";
import { useUiSound } from "@/src/hooks/use-ui-sound";
import { useAppMode } from "@/src/state/app-mode-context";

export type ModeToggleProps = {
  isNight: boolean;
  className?: string;
};

const MODE_LABELS: Record<AppMode, string> = {
  relax: "Relax",
  focus: "Focus",
  play: "Play",
};

const TOUCH_SAFE_BUTTON_STYLE: CSSProperties = {
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
  WebkitTapHighlightColor: "transparent",
};

export default function ModeToggle({ isNight, className = "" }: ModeToggleProps) {
  const { mode, setMode } = useAppMode();
  const { playUiSound } = useUiSound();

  const onPressStart = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "touch" || e.pointerType === "pen") {
      e.preventDefault();
    }
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const i = APP_MODES.indexOf(mode);
      const delta = e.key === "ArrowRight" ? 1 : -1;
      const next = APP_MODES[(i + delta + APP_MODES.length) % APP_MODES.length]!;
      playUiSound();
      setMode(next);
    },
    [mode, playUiSound, setMode],
  );

  const shell = isNight
    ? "rounded-xl border border-white/[0.13] bg-slate-950/[0.34] shadow-[0_12px_36px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-slate-950/[0.28]"
    : "rounded-xl border border-slate-900/10 bg-white/70 shadow-[0_12px_36px_-12px_rgba(15,23,42,0.14),inset_0_1px_0_0_rgba(255,255,255,0.75)] ring-1 ring-slate-900/10 backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/58";

  const idleBtn = isNight
    ? "touch-manipulation select-none rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/75 hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80 sm:px-3 sm:text-sm"
    : "touch-manipulation select-none rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60 sm:px-3 sm:text-sm";

  const activeBtn = isNight
    ? "touch-manipulation select-none rounded-lg bg-white/[0.14] px-2.5 py-1.5 text-xs font-semibold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/80 sm:px-3 sm:text-sm"
    : "touch-manipulation select-none rounded-lg bg-slate-950/10 px-2.5 py-1.5 text-xs font-semibold text-slate-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65)] ring-1 ring-slate-900/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/60 sm:px-3 sm:text-sm";

  return (
    <div className={`w-max max-w-[calc(100vw-2rem)] ${className}`}>
      <div
        className={`${shell} p-1`}
        role="radiogroup"
        aria-label="Experience mode"
        onKeyDown={onKeyDown}
      >
        <div className="flex flex-wrap items-center justify-center gap-0.5 sm:flex-nowrap">
          {APP_MODES.map((m) => {
            const selected = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={selected}
                className={selected ? activeBtn : idleBtn}
                style={TOUCH_SAFE_BUTTON_STYLE}
                onPointerDown={onPressStart}
                onClick={() => {
                  if (m === mode) return;
                  playUiSound();
                  setMode(m);
                }}
              >
                <span style={TOUCH_SAFE_BUTTON_STYLE}>{MODE_LABELS[m]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
