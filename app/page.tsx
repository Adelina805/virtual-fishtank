import HomeAquariumExperience from "@/src/components/HomeAquariumExperience";

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <section
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 flex justify-center bg-slate-950 pt-[clamp(4.25rem,13vh,7.25rem)] select-none"
      >
        <div className="w-full text-center">
          <p
            className="m-0 font-semibold"
            style={{
              fontSize: "clamp(2.15rem, 6.3vw, 3.15rem)",
              lineHeight: "50px",
              color: "rgba(18, 50, 70, 0.72)",
            }}
          >
            Aquacalma
          </p>
          <p
            className="mx-auto mt-[0.28em] max-w-[min(92vw,36rem)] font-normal"
            style={{
              fontSize: "clamp(1.05rem, 3.3vw, 1.35rem)",
              lineHeight: "32px",
              color: "rgba(10, 31, 43, 0.58)",
            }}
          >
            Breathe in stillness. Release into gentle blue.
          </p>
        </div>
      </section>
      <div className="relative z-10 h-full w-full">
        <HomeAquariumExperience />
      </div>
    </main>
  );
}
