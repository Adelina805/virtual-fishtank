"use client";

import { useEffect, useRef } from "react";
import {
  FOCUS_TIMER_DEBUG_MULT,
  formatFocusCountdown,
} from "@/src/hooks/use-focus-timer";
import {
  useFocusTimerMode,
  useFocusTimerRemaining,
} from "@/src/state/focus-timer-context";

const DEFAULT_TITLE = "Aquacalma";

export default function FocusTimerDocumentTitleSync() {
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

    const runStartTs = Date.now();
    const runStartRemainingMs = remainingMs;

    const updateTitle = () => {
      const elapsedMs = Math.max(0, Date.now() - runStartTs);
      const countdownMs = Math.max(0, runStartRemainingMs - elapsedMs);
      const display = formatFocusCountdown(countdownMs * FOCUS_TIMER_DEBUG_MULT);
      const nextTitle = `${display} — ${DEFAULT_TITLE}`;
      if (lastTitleRef.current !== nextTitle) {
        document.title = nextTitle;
        lastTitleRef.current = nextTitle;
      }
    };

    updateTitle();
    const interval = window.setInterval(updateTitle, 250);
    return () => window.clearInterval(interval);
  }, [status, remainingMs]);

  useEffect(() => {
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, []);

  return null;
}
