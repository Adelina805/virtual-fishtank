"use client";

import { useEffect, useRef } from "react";

/** Hard caps keep phones cool; count scales down with smaller canvases. */
const MAX_PARTICLES = 56;
const MAX_BUBBLES = 24;
const FISH_COUNT = 6;

/** Simple fish: horizontal drift; vertical bob applied when drawing. */
type FishSchool = {
  x: Float32Array;
  y: Float32Array;
  speed: Float32Array;
  dir: Float32Array;
  size: Float32Array;
  bobPhase: Float32Array;
  color: readonly string[];
};

const FISH_COLORS: readonly string[] = [
  "#e85d4c",
  "#f4a23a",
  "#6ec9e0",
  "#c89cff",
  "#ffd966",
  "#7ed957",
];

function createFishSchool(): FishSchool {
  return {
    x: new Float32Array(FISH_COUNT),
    y: new Float32Array(FISH_COUNT),
    speed: new Float32Array(FISH_COUNT),
    dir: new Float32Array(FISH_COUNT),
    size: new Float32Array(FISH_COUNT),
    bobPhase: new Float32Array(FISH_COUNT),
    color: FISH_COLORS,
  };
}

function resetFish(fish: FishSchool, w: number, h: number) {
  const top = h * 0.14;
  const bottom = h * 0.86;
  for (let i = 0; i < FISH_COUNT; i++) {
    fish.x[i] = Math.random() * w;
    fish.y[i] = top + Math.random() * (bottom - top);
    fish.speed[i] = 26 + Math.random() * 48;
    fish.dir[i] = Math.random() < 0.5 ? -1 : 1;
    fish.size[i] = 0.75 + Math.random() * 0.65;
    fish.bobPhase[i] = Math.random() * Math.PI * 2;
  }
}

function stepFish(fish: FishSchool, w: number, dt: number) {
  const margin = 40;
  for (let i = 0; i < FISH_COUNT; i++) {
    fish.x[i] += fish.speed[i] * fish.dir[i] * dt;
    if (fish.x[i] < -margin) fish.x[i] += w + margin * 2;
    else if (fish.x[i] > w + margin) fish.x[i] -= w + margin * 2;
  }
}

function drawFish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  dir: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  const L = 22 * size;
  const H = 10 * size;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(-L * 0.12, 0, L * 0.44, H * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-L * 0.52, 0);
  ctx.lineTo(-L * 0.98, -H * 0.5);
  ctx.lineTo(-L * 0.98, H * 0.5);
  ctx.closePath();
  ctx.fill();

  const ex = L * 0.24;
  const ey = -H * 0.14;
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.beginPath();
  ctx.arc(ex, ey, H * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#142428";
  ctx.beginPath();
  ctx.arc(ex + H * 0.05, ey, H * 0.09, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawFishSchool(
  ctx: CanvasRenderingContext2D,
  fish: FishSchool,
  timeSec: number,
) {
  for (let i = 0; i < FISH_COUNT; i++) {
    const bobHz = 0.95 + i * 0.11;
    const bob =
      Math.sin(timeSec * bobHz + fish.bobPhase[i]) * (5 + fish.size[i] * 9);
    drawFish(
      ctx,
      fish.x[i],
      fish.y[i] + bob,
      fish.size[i],
      fish.dir[i],
      fish.color[i]!,
    );
  }
}

type FloatBuffers = {
  px: Float32Array;
  py: Float32Array;
  pvx: Float32Array;
  pvy: Float32Array;
  pr: Float32Array;
  pop: Float32Array;
  pCount: number;
  bx: Float32Array;
  by: Float32Array;
  br: Float32Array;
  bRise: Float32Array;
  bPhase: Float32Array;
  bCount: number;
};

function createBuffers(): FloatBuffers {
  return {
    px: new Float32Array(MAX_PARTICLES),
    py: new Float32Array(MAX_PARTICLES),
    pvx: new Float32Array(MAX_PARTICLES),
    pvy: new Float32Array(MAX_PARTICLES),
    pr: new Float32Array(MAX_PARTICLES),
    pop: new Float32Array(MAX_PARTICLES),
    pCount: 0,
    bx: new Float32Array(MAX_BUBBLES),
    by: new Float32Array(MAX_BUBBLES),
    br: new Float32Array(MAX_BUBBLES),
    bRise: new Float32Array(MAX_BUBBLES),
    bPhase: new Float32Array(MAX_BUBBLES),
    bCount: 0,
  };
}

/** Called when the canvas CSS size changes — spreads dots and bubbles across the tank. */
function resetParticlesAndBubbles(buf: FloatBuffers, w: number, h: number) {
  buf.pCount = Math.min(MAX_PARTICLES, Math.max(12, ((w * h) / 26000) | 0));
  for (let i = 0; i < buf.pCount; i++) {
    buf.px[i] = Math.random() * w;
    buf.py[i] = Math.random() * h * 0.94;
    buf.pvx[i] = (Math.random() - 0.5) * 4.5;
    buf.pvy[i] = (Math.random() - 0.5) * 2.8;
    buf.pr[i] = 0.35 + Math.random() * 1.05;
    buf.pop[i] = 0.07 + Math.random() * 0.14;
  }

  buf.bCount = Math.min(MAX_BUBBLES, Math.max(10, (w / 72) | 0));
  for (let i = 0; i < buf.bCount; i++) {
    buf.bx[i] = Math.random() * w;
    buf.by[i] = h * 0.35 + Math.random() * h * 0.65;
    buf.br[i] = 1.1 + Math.random() * 2;
    buf.bRise[i] = 11 + Math.random() * 14;
    buf.bPhase[i] = Math.random() * Math.PI * 2;
  }
}

function stepParticles(buf: FloatBuffers, w: number, h: number, dt: number) {
  for (let i = 0; i < buf.pCount; i++) {
    buf.px[i] += buf.pvx[i] * dt;
    buf.py[i] += buf.pvy[i] * dt;
    if (buf.px[i] < 0) buf.px[i] += w;
    else if (buf.px[i] > w) buf.px[i] -= w;
    if (buf.py[i] < 0) buf.py[i] += h;
    else if (buf.py[i] > h) buf.py[i] -= h;
  }
}

function stepBubbles(
  buf: FloatBuffers,
  w: number,
  h: number,
  dt: number,
  timeSec: number,
) {
  for (let i = 0; i < buf.bCount; i++) {
    buf.bx[i] += Math.sin(timeSec * 0.22 + buf.bPhase[i]) * 2.2 * dt;
    buf.by[i] -= buf.bRise[i] * dt;

    if (buf.by[i] < -buf.br[i] * 4) {
      buf.by[i] = h + buf.br[i] * 2 + Math.random() * h * 0.15;
      buf.bx[i] = Math.random() * w;
    }
    if (buf.bx[i] < -24) buf.bx[i] = w + 12;
    if (buf.bx[i] > w + 24) buf.bx[i] = -12;
  }
}

function drawDriftParticles(
  ctx: CanvasRenderingContext2D,
  buf: FloatBuffers,
) {
  ctx.save();
  for (let i = 0; i < buf.pCount; i++) {
    ctx.globalAlpha = buf.pop[i];
    ctx.fillStyle = "rgba(210, 240, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(buf.px[i], buf.py[i], buf.pr[i], 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBubbles(
  ctx: CanvasRenderingContext2D,
  buf: FloatBuffers,
  timeSec: number,
) {
  ctx.save();
  ctx.lineWidth = 1;
  for (let i = 0; i < buf.bCount; i++) {
    const x = buf.bx[i] + Math.sin(timeSec * 0.5 + buf.bPhase[i]) * 5;
    const y = buf.by[i];
    const r = buf.br[i];
    const shimmer = 0.28 + Math.sin(timeSec * 0.35 + i * 0.7) * 0.06;

    ctx.globalAlpha = shimmer;
    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = shimmer + 0.12;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
    ctx.stroke();
  }
  ctx.restore();
}

function drawUnderwaterBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#c4e8f2");
  gradient.addColorStop(0.35, "#6eb8cc");
  gradient.addColorStop(0.72, "#2a6b7c");
  gradient.addColorStop(1, "#0c2f38");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(
    width * 0.5,
    0,
    0,
    width * 0.5,
    height * 0.15,
    width * 0.65,
  );
  glow.addColorStop(0, "rgba(255, 255, 255, 0.12)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function drawDistantReef(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const bottom = height;
  const ridgeY = height * 0.5;

  ctx.beginPath();
  ctx.moveTo(0, bottom);
  ctx.lineTo(0, ridgeY + height * 0.12);
  ctx.bezierCurveTo(
    width * 0.15,
    ridgeY - height * 0.04,
    width * 0.3,
    ridgeY + height * 0.1,
    width * 0.45,
    ridgeY + height * 0.02,
  );
  ctx.bezierCurveTo(
    width * 0.58,
    ridgeY - height * 0.08,
    width * 0.72,
    ridgeY + height * 0.06,
    width * 0.88,
    ridgeY + height * 0.03,
  );
  ctx.bezierCurveTo(width * 0.96, ridgeY + height * 0.08, width, ridgeY + height * 0.14, width, bottom);
  ctx.closePath();
  ctx.fillStyle = "rgba(32, 92, 102, 0.38)";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, bottom);
  ctx.lineTo(0, ridgeY + height * 0.22);
  ctx.bezierCurveTo(
    width * 0.22,
    ridgeY + height * 0.14,
    width * 0.48,
    ridgeY + height * 0.2,
    width * 0.75,
    ridgeY + height * 0.16,
  );
  ctx.lineTo(width, ridgeY + height * 0.24);
  ctx.lineTo(width, bottom);
  ctx.closePath();
  ctx.fillStyle = "rgba(24, 78, 88, 0.28)";
  ctx.fill();
}

function drawMidgroundRocksAndPlants(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
) {
  const floorY = height * 0.94;

  const rock = (cx: number, cy: number, rx: number, ry: number, tilt: number) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, tilt, 0, Math.PI * 2);
    ctx.fill();
  };

  ctx.fillStyle = "#123a42";
  rock(width * 0.1, floorY - height * 0.01, width * 0.11, height * 0.045, 0.15);
  rock(width * 0.26, floorY, width * 0.09, height * 0.038, -0.2);
  rock(width * 0.52, floorY - height * 0.015, width * 0.13, height * 0.052, 0.08);
  rock(width * 0.78, floorY, width * 0.1, height * 0.04, -0.12);

  ctx.fillStyle = "#0e3238";
  rock(width * 0.18, floorY + height * 0.008, width * 0.07, height * 0.028, 0.25);
  rock(width * 0.62, floorY + height * 0.01, width * 0.08, height * 0.03, -0.15);

  const fan = (cx: number, base: number, scale: number, phase: number) => {
    const s = scale * Math.min(width, height) * 0.12;
    const angle = Math.sin(timeSec * 0.35 + phase) * 0.065;

    ctx.save();
    ctx.translate(cx, base);
    ctx.rotate(angle);
    ctx.translate(-cx, -base);

    ctx.strokeStyle = "#0a2830";
    ctx.lineWidth = Math.max(2, s * 0.08);
    ctx.beginPath();
    ctx.moveTo(cx, base);
    ctx.lineTo(cx, base - s * 0.35);
    ctx.stroke();

    ctx.fillStyle = "#1a4f58";
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(cx + i * s * 0.22, base - s * 0.5, s * 0.2, s * 0.38, i * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  fan(width * 0.36, floorY - height * 0.02, 0.55, 0.4);
  fan(width * 0.88, floorY - height * 0.025, 0.45, 2.2);
}

function drawForegroundSeaweed(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
) {
  const baseY = height + height * 0.02;

  const blade = (
    rootX: number,
    lean: number,
    reach: number,
    thickness: number,
    phase: number,
  ) => {
    const swayLean = Math.sin(timeSec * 0.42 + phase) * width * 0.012;
    const swayMid = Math.sin(timeSec * 0.28 + phase * 1.6) * width * 0.005;
    const leanAdj = lean + swayLean;
    const tipX = rootX + leanAdj;
    const tipY = baseY - reach;
    const midX =
      rootX + leanAdj * 0.45 + Math.sin(phase) * thickness * 1.2 + swayMid;
    const midY = baseY - reach * 0.55;

    ctx.beginPath();
    ctx.moveTo(rootX - thickness, baseY);
    ctx.quadraticCurveTo(midX - thickness * 0.8, midY, tipX, tipY);
    ctx.quadraticCurveTo(midX + thickness * 0.9, midY, rootX + thickness, baseY);
    ctx.closePath();
  };

  ctx.fillStyle = "#041a1f";

  blade(width * 0.05, width * 0.04, height * 0.42, width * 0.018, 0.3);
  ctx.fill();
  blade(width * 0.08, width * 0.02, height * 0.32, width * 0.012, 1.1);
  ctx.fill();

  blade(width * 0.42, -width * 0.03, height * 0.55, width * 0.022, 0.8);
  ctx.fill();
  blade(width * 0.46, width * 0.025, height * 0.38, width * 0.014, 1.9);
  ctx.fill();

  blade(width * 0.68, -width * 0.045, height * 0.48, width * 0.02, 0.5);
  ctx.fill();
  blade(width * 0.72, -width * 0.02, height * 0.33, width * 0.011, 2.2);
  ctx.fill();

  blade(width * 0.92, -width * 0.055, height * 0.58, width * 0.024, 1.4);
  ctx.fill();

  ctx.fillStyle = "#06262c";
  blade(width * 0.22, width * 0.015, height * 0.28, width * 0.009, 2.6);
  ctx.fill();
  blade(width * 0.58, -width * 0.01, height * 0.25, width * 0.008, 0.2);
  ctx.fill();
}

export default function AquariumCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const buf = createBuffers();
    const fish = createFishSchool();
    let rafId = 0;
    let lastCssW = -1;
    let lastCssH = -1;
    let lastNow = 0;

    const tick = (now: number) => {
      const timeSec = now * 0.001;
      const dpr = window.devicePixelRatio || 1;
      const cssW = Math.max(1, Math.round(canvas.clientWidth));
      const cssH = Math.max(1, Math.round(canvas.clientHeight));

      if (lastNow === 0) lastNow = now;
      const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;

      if (cssW !== lastCssW || cssH !== lastCssH) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        lastCssW = cssW;
        lastCssH = cssH;
        resetParticlesAndBubbles(buf, cssW, cssH);
        resetFish(fish, cssW, cssH);
      }

      stepParticles(buf, cssW, cssH, dt);
      stepBubbles(buf, cssW, cssH, dt, timeSec);
      stepFish(fish, cssW, dt);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      drawUnderwaterBackground(ctx, cssW, cssH);
      drawDistantReef(ctx, cssW, cssH);
      drawDriftParticles(ctx, buf);
      drawMidgroundRocksAndPlants(ctx, cssW, cssH, timeSec);
      drawFishSchool(ctx, fish, timeSec);
      drawForegroundSeaweed(ctx, cssW, cssH, timeSec);
      drawBubbles(ctx, buf, timeSec);

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full min-h-0">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        aria-label="Aquarium view"
      />
    </div>
  );
}
