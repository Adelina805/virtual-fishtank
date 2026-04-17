"use client";

import FocusPresetChips from "@/src/components/modes/FocusPresetChips";
import FocusTimerReadout from "@/src/components/modes/FocusTimerReadout";
import FocusTimerTransport from "@/src/components/modes/FocusTimerTransport";

export type FocusModeHudProps = {
  isNight: boolean;
};

export default function FocusModeHud({ isNight }: FocusModeHudProps) {
  return (
    <div
      className="pointer-events-none mt-2 flex w-full max-w-[min(100vw-2rem,22rem)] flex-col items-center gap-3 sm:mt-3 sm:max-w-none sm:gap-3.5"
      aria-label="Timer"
    >
      <FocusTimerReadout isNight={isNight} />
      <div className="pointer-events-auto flex w-full flex-wrap items-center justify-center gap-1">
        <FocusPresetChips isNight={isNight} />
        <FocusTimerTransport isNight={isNight} />
      </div>
    </div>
  );
}
