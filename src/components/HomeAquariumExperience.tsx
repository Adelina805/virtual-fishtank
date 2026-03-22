"use client";

import { useState } from "react";
import AquariumCanvas from "@/src/components/AquariumCanvas";
import FloatingControlPanel from "@/src/components/FloatingControlPanel";

export default function HomeAquariumExperience() {
  const [isNight, setIsNight] = useState(true);

  return (
    <div
      className={
        isNight
          ? "relative h-dvh w-full overflow-hidden bg-slate-950"
          : "relative h-dvh w-full overflow-hidden bg-linear-to-b from-sky-100 via-cyan-50/80 to-slate-200"
      }
    >
      <div className="absolute inset-0 z-0 min-h-0">
        <AquariumCanvas ambience={isNight ? "night" : "day"} />
      </div>

      <header className="absolute left-0 top-0 z-10 max-w-md p-6 sm:p-8">
        <div
          className={
            isNight
              ? "rounded-2xl bg-slate-950/45 px-5 py-4 shadow-lg ring-1 ring-white/15 backdrop-blur-md"
              : "rounded-2xl bg-white/55 px-5 py-4 shadow-lg shadow-slate-900/10 ring-1 ring-white/70 backdrop-blur-md"
          }
        >
          <h1
            className={
              isNight
                ? "text-2xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-3xl"
                : "text-2xl font-semibold tracking-tight text-slate-800 drop-shadow-sm sm:text-3xl"
            }
          >
            Virtual Fishtank
          </h1>
          <p
            className={
              isNight
                ? "mt-3 text-sm leading-relaxed text-white/90 sm:text-[0.9375rem]"
                : "mt-3 text-sm leading-relaxed text-slate-600 sm:text-[0.9375rem]"
            }
          >
            A soothing, interactive aquarium — calm motion, gentle taps, and a
            layout that feels at home on phones and desktops alike.
          </p>
        </div>
      </header>

      <aside className="absolute bottom-5 right-5 z-10 sm:bottom-8 sm:right-8">
        <FloatingControlPanel
          isNight={isNight}
          onToggle={() => setIsNight((v) => !v)}
        />
      </aside>
    </div>
  );
}
