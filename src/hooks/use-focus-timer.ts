"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const FOCUS_PRESET_MINUTES = [25, 15, 10, 5] as const;

export type FocusPresetMinutes = (typeof FOCUS_PRESET_MINUTES)[number];

export type FocusTimerStatus = "idle" | "running" | "paused" | "complete";

export type UseFocusTimerResult = {
  presetMinutes: FocusPresetMinutes;
  setPresetMinutes: (m: FocusPresetMinutes) => void;
  status: FocusTimerStatus;
  remainingMs: number;
  /** Non-regressive virtual elapsed focus time used for environment growth. */
  elapsedMs: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
};

const DEFAULT_PRESET: FocusPresetMinutes = 25;

/**
 * Dev-only: set `NEXT_PUBLIC_FOCUS_TIMER_DEBUG_MULT=60` in `.env.local` so a 5-minute
 * session completes in 5 seconds of real time (growth thresholds still use virtual minutes).
 */
export function getFocusTimerDebugMult(): number {
  if (typeof process === "undefined") return 1;
  const raw = process.env.NEXT_PUBLIC_FOCUS_TIMER_DEBUG_MULT;
  if (raw === undefined || raw === "") return 1;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Real wall-clock session length = preset duration ÷ this (1 = normal). */
export const FOCUS_TIMER_DEBUG_MULT = getFocusTimerDebugMult();

function sessionDurationMs(presetMinutes: number): number {
  return (presetMinutes * 60_000) / FOCUS_TIMER_DEBUG_MULT;
}

/**
 * Virtual elapsed time (what the user “should” have waited) for growth + display.
 * When debug mult is 1, this matches real elapsed.
 */
export function getFocusVirtualElapsedMs(
  presetMinutes: number,
  remainingMs: number,
): number {
  return Math.max(0, presetMinutes * 60_000 - remainingMs * FOCUS_TIMER_DEBUG_MULT);
}

/**
 * Single-session countdown using a performance.now() deadline while running
 * so display stays accurate across background tabs and avoids interval drift.
 */
export function useFocusTimer(): UseFocusTimerResult {
  const [presetMinutes, setPresetMinutesState] =
    useState<FocusPresetMinutes>(DEFAULT_PRESET);
  const [status, setStatus] = useState<FocusTimerStatus>("idle");
  const [remainingMs, setRemainingMs] = useState(
    () => sessionDurationMs(DEFAULT_PRESET),
  );
  const [elapsedMs, setElapsedMs] = useState(0);

  const deadlinePerfRef = useRef<number | null>(null);
  const runSessionVirtualDurationMsRef = useRef(DEFAULT_PRESET * 60_000);

  useEffect(() => {
    if (status !== "running" || deadlinePerfRef.current === null) return;

    let frame = 0;

    const tick = () => {
      const end = deadlinePerfRef.current;
      if (end === null) return;
      const left = Math.max(0, end - performance.now());
      setRemainingMs(left);
      const virtualLeft = left * FOCUS_TIMER_DEBUG_MULT;
      const virtualElapsed = Math.max(
        0,
        runSessionVirtualDurationMsRef.current - virtualLeft,
      );
      setElapsedMs((prev) => Math.max(prev, virtualElapsed));
      if (left <= 0) {
        deadlinePerfRef.current = null;
        setElapsedMs((prev) =>
          Math.max(prev, runSessionVirtualDurationMsRef.current),
        );
        setStatus("complete");
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [status]);

  const setPresetMinutes = useCallback(
    (m: FocusPresetMinutes) => {
      const ms = sessionDurationMs(m);
      const virtualMs = m * 60_000;
      setPresetMinutesState(m);

      if (status === "running") {
        runSessionVirtualDurationMsRef.current = virtualMs;
        deadlinePerfRef.current = performance.now() + ms;
        setRemainingMs(ms);
        return;
      }

      if (status === "paused") {
        runSessionVirtualDurationMsRef.current = virtualMs;
        deadlinePerfRef.current = null;
        setRemainingMs(ms);
        return;
      }

      runSessionVirtualDurationMsRef.current = virtualMs;
      setRemainingMs(ms);
      if (status === "complete") setStatus("idle");
    },
    [status],
  );

  const start = useCallback(() => {
    if (status !== "idle" && status !== "complete") return;
    const ms = sessionDurationMs(presetMinutes);
    runSessionVirtualDurationMsRef.current = presetMinutes * 60_000;
    deadlinePerfRef.current = performance.now() + ms;
    setRemainingMs(ms);
    setStatus("running");
  }, [status, presetMinutes]);

  const pause = useCallback(() => {
    if (status !== "running" || deadlinePerfRef.current === null) return;
    setRemainingMs(Math.max(0, deadlinePerfRef.current - performance.now()));
    deadlinePerfRef.current = null;
    setStatus("paused");
  }, [status]);

  const resume = useCallback(() => {
    if (status !== "paused") return;
    deadlinePerfRef.current = performance.now() + remainingMs;
    setStatus("running");
  }, [status, remainingMs]);

  const reset = useCallback(() => {
    deadlinePerfRef.current = null;
    setStatus("idle");
    setRemainingMs(sessionDurationMs(presetMinutes));
  }, [presetMinutes]);

  return {
    presetMinutes,
    setPresetMinutes,
    status,
    remainingMs,
    elapsedMs,
    start,
    pause,
    resume,
    reset,
  };
}

/** Ceil to whole seconds so the last second still reads 0:01 until the run ends. */
export function formatFocusCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
