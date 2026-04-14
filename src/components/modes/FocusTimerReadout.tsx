import {
  FOCUS_TIMER_DEBUG_MULT,
  formatFocusCountdown,
} from "@/src/hooks/use-focus-timer";
import { useFocusTimerRemaining } from "@/src/state/focus-timer-context";

export type FocusTimerReadoutProps = {
  isNight: boolean;
};

/**
 * Large but soft countdown readout; color stays below full contrast so the
 * aquarium stays visually primary. Subscribes only to remaining time.
 */
export default function FocusTimerReadout({ isNight }: FocusTimerReadoutProps) {
  const remainingMs = useFocusTimerRemaining();
  const display = formatFocusCountdown(remainingMs * FOCUS_TIMER_DEBUG_MULT);

  return (
    <p
      className={
        isNight
          ? "m-0 w-full text-center text-6xl font-extralight tabular-nums tracking-tight text-white/78 sm:text-7xl"
          : "m-0 w-full text-center text-6xl font-extralight tabular-nums tracking-tight text-slate-800/85 sm:text-7xl"
      }
      aria-live="polite"
      aria-atomic
    >
      {display}
    </p>
  );
}
