"use client";

import { useCallback, useEffect, useRef } from "react";

const UI_BUBBLE_SOUND_SRC = "/audio/ui-bubble.mp3";
const DEFAULT_VOLUME = 0.05;
const DEFAULT_COOLDOWN_MS = 120;

export type UseUiSoundOptions = {
  src?: string;
  volume?: number;
  cooldownMs?: number;
};

/**
 * Plays a short, subtle UI interaction sound from a single shared audio element.
 */
export function useUiSound({
  src = UI_BUBBLE_SOUND_SRC,
  volume = DEFAULT_VOLUME,
  cooldownMs = DEFAULT_COOLDOWN_MS,
}: UseUiSoundOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedAtRef = useRef(0);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = false;
    audio.preload = "auto";
    audio.volume = Math.min(Math.max(volume, 0), 1);
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [src, volume]);

  const playUiSound = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const now = performance.now();
    if (now - lastPlayedAtRef.current < Math.max(0, cooldownMs)) {
      return;
    }
    lastPlayedAtRef.current = now;

    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, [cooldownMs]);

  return { playUiSound };
}
