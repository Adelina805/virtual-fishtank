"use client";

import { useMemo } from "react";
import { computeEnvironmentGrowthState } from "@/src/lib/environment-growth";
import { useFocusTimerElapsed } from "@/src/state/focus-timer-context";

export function useEnvironmentGrowth() {
  const elapsedMs = useFocusTimerElapsed();

  return useMemo(() => {
    return computeEnvironmentGrowthState(elapsedMs);
  }, [elapsedMs]);
}
