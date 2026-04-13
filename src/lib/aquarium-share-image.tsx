import { ImageResponse } from "next/og";

const WIDTH = 1200;
const HEIGHT = 630;

export function createAquariumShareImageResponse() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 80px",
          background:
            "linear-gradient(145deg, #061018 0%, #0b2a36 42%, #0d3d4d 72%, #082028 100%)",
          position: "relative",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 55% at 70% 40%, rgba(56, 189, 248, 0.22), transparent 55%), radial-gradient(ellipse 60% 45% at 18% 75%, rgba(34, 211, 238, 0.12), transparent 50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 180,
            height: 180,
            left: 720,
            top: 120,
            borderRadius: "50%",
            background: "rgba(251, 191, 36, 0.12)",
            filter: "blur(2px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 96,
            height: 96,
            left: 520,
            top: 340,
            borderRadius: "50%",
            background: "rgba(165, 243, 252, 0.14)",
            filter: "blur(1px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 64,
            height: 64,
            left: 900,
            top: 380,
            borderRadius: "50%",
            background: "rgba(94, 234, 212, 0.1)",
          }}
        />
        <p
          style={{
            margin: 0,
            fontSize: 22,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(207, 250, 254, 0.72)",
            position: "relative",
          }}
        >
          Interactive digital aquarium
        </p>
        <h1
          style={{
            margin: "20px 0 0",
            fontSize: 76,
            lineHeight: 1.05,
            fontWeight: 700,
            color: "#ecfeff",
            textShadow: "0 8px 40px rgba(6, 182, 212, 0.35)",
            position: "relative",
          }}
        >
          Aquacalma
        </h1>
        <p
          style={{
            margin: "28px 0 0",
            maxWidth: 820,
            fontSize: 28,
            lineHeight: 1.45,
            color: "rgba(224, 242, 254, 0.88)",
            position: "relative",
          }}
        >
          Calm, focus, and play—guided breathing, evolving attention, and fish
          that respond to your presence in a gentle digital ecosystem.
        </p>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );
}
