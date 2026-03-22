import AquariumCanvas from "@/src/components/AquariumCanvas";

export default function Home() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-950">
      <div className="absolute inset-0 z-0 min-h-0">
        <AquariumCanvas />
      </div>

      <header className="absolute left-0 top-0 z-10 max-w-md p-6 sm:p-8">
        <div className="rounded-2xl bg-slate-950/45 px-5 py-4 shadow-lg ring-1 ring-white/15 backdrop-blur-md">
          <h1 className="text-2xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-3xl">
            Virtual Fishtank
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/90 sm:text-[0.9375rem]">
            A soothing, interactive aquarium — calm motion, gentle taps, and a
            layout that feels at home on phones and desktops alike.
          </p>
        </div>
      </header>

      <aside className="absolute bottom-5 right-5 z-10 w-56 rounded-2xl border border-white/25 bg-slate-950/40 p-4 shadow-lg shadow-black/30 backdrop-blur-md sm:bottom-8 sm:right-8 sm:w-60">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-white/70">
          Panel
        </p>
        <p className="mt-2 text-sm leading-snug text-white/90">
          Feed, themes, and audio will anchor here.
        </p>
      </aside>
    </div>
  );
}
