"use client";

import { useEffect, useRef } from "react";
import FocusPresetChips from "@/src/components/modes/FocusPresetChips";
import FocusTimerReadout from "@/src/components/modes/FocusTimerReadout";
import FocusTimerTransport from "@/src/components/modes/FocusTimerTransport";
import {
  FOCUS_TIMER_DEBUG_MULT,
  formatFocusCountdown,
} from "@/src/hooks/use-focus-timer";
import {
  useFocusTimerMode,
  useFocusTimerRemaining,
} from "@/src/state/focus-timer-context";

export type FocusModeHudProps = {
  isNight: boolean;
};

const DEFAULT_TITLE = "Aquacalma";

function FocusModeDocumentTitleSync() {
  const { status } = useFocusTimerMode();
  const remainingMs = useFocusTimerRemaining();
  const lastTitleRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "running") {
      if (lastTitleRef.current !== DEFAULT_TITLE) {
        document.title = DEFAULT_TITLE;
        lastTitleRef.current = DEFAULT_TITLE;
      }
      return;
    }

    const display = formatFocusCountdown(remainingMs * FOCUS_TIMER_DEBUG_MULT);
    const nextTitle = `${display} — ${DEFAULT_TITLE}`;
    if (lastTitleRef.current !== nextTitle) {
      document.title = nextTitle;
      lastTitleRef.current = nextTitle;
    }
  }, [status, remainingMs]);

  useEffect(() => {
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, []);

  return null;
}

export default function FocusModeHud({ isNight }: FocusModeHudProps) {
  return (
    <div
      className="pointer-events-none mt-2 flex w-full max-w-[min(100vw-2rem,22rem)] flex-col items-center gap-3 sm:mt-3 sm:max-w-none sm:gap-3.5"
      aria-label="Timer"
    >
      <FocusModeDocumentTitleSync />
      <FocusTimerReadout isNight={isNight} />
      <div className="pointer-events-auto flex w-full flex-wrap items-center justify-center gap-1">
        <FocusPresetChips isNight={isNight} />
        <FocusTimerTransport isNight={isNight} />
      </div>
    </div>
  );
}
