"use client";

import { useEffect, useRef, type MutableRefObject } from "react";

/** Latest pointer position in canvas CSS pixels (same space as drawing after DPR scale). */
export type PointerCanvasState = {
  x: number;
  y: number;
  /** True while the pointer is inside the canvas element (mouse hover or active touch). */
  inCanvas: boolean;
};

function updatePointerCanvasState(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  out: PointerCanvasState,
) {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, canvas.clientWidth);
  const h = Math.max(1, canvas.clientHeight);
  const rw = Math.max(1e-6, rect.width);
  const rh = Math.max(1e-6, rect.height);

  out.x = ((clientX - rect.left) / rw) * w;
  out.y = ((clientY - rect.top) / rh) * h;
  out.inCanvas =
    clientX >= rect.left &&
    clientX < rect.right &&
    clientY >= rect.top &&
    clientY < rect.bottom;
}

/** Hard caps keep phones cool; count scales down with smaller canvases. */
const MAX_PARTICLES = 56;
const MAX_BUBBLES = 24;
/** Cursor / touch trail bubbles — small pool, same look as background bubbles. */
const MAX_POINTER_BUBBLES = 32;
const FISH_COUNT = 6;

/** 0 = behind midground, 1 = between midground & seaweed, 2 = in front of seaweed (near glass). */
const FISH_DEPTH_BACK = 0;
const FISH_DEPTH_MID = 1;
const FISH_DEPTH_FRONT = 2;

/** Simple fish: horizontal drift; vertical bob applied when drawing. */
type FishSchool = {
  x: Float32Array;
  y: Float32Array;
  speed: Float32Array;
  dir: Float32Array;
  size: Float32Array;
  bobPhase: Float32Array;
  /** Smoothed pointer reaction — added to base swim each step (CSS px/s). */
  vxOff: Float32Array;
  vyOff: Float32Array;
  /** Which compositing pass this fish belongs to (layered depth). */
  depth: Uint8Array;
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
    vxOff: new Float32Array(FISH_COUNT),
    vyOff: new Float32Array(FISH_COUNT),
    depth: new Uint8Array(FISH_COUNT),
    color: FISH_COLORS,
  };
}

function resetFish(fish: FishSchool, w: number, h: number) {
  const top = h * 0.14;
  const bottom = h * 0.86;
  /** Two fish per depth band — back / mid-water / near glass. */
  const depths: readonly number[] = [
    FISH_DEPTH_BACK,
    FISH_DEPTH_BACK,
    FISH_DEPTH_MID,
    FISH_DEPTH_MID,
    FISH_DEPTH_FRONT,
    FISH_DEPTH_FRONT,
  ];
  for (let i = 0; i < FISH_COUNT; i++) {
    fish.x[i] = Math.random() * w;
    fish.y[i] = top + Math.random() * (bottom - top);
    fish.speed[i] = 26 + Math.random() * 48;
    fish.dir[i] = Math.random() < 0.5 ? -1 : 1;
    fish.size[i] = 0.75 + Math.random() * 0.65;
    fish.bobPhase[i] = Math.random() * Math.PI * 2;
    fish.vxOff[i] = 0;
    fish.vyOff[i] = 0;
    fish.depth[i] = depths[i]!;
  }
}

/** Nearby fish gently bias toward or away from the pointer; offsets are low-pass filtered (no snapping). */
function stepFish(
  fish: FishSchool,
  w: number,
  h: number,
  dt: number,
  pointer: PointerCanvasState,
) {
  const margin = 40;
  const top = h * 0.14;
  const bottom = h * 0.86;
  const influenceR = Math.min(320, Math.min(w, h) * 0.52);
  const personal = 56;
  const maxSteer = 58;
  const follow = 1;
  const flee = 1.35;
  const depthReact: readonly number[] = [0.88, 1.12, 1.38];

  for (let i = 0; i < FISH_COUNT; i++) {
    let targetVx = 0;
    let targetVy = 0;

    if (pointer.inCanvas && influenceR > 1) {
      let dx = pointer.x - fish.x[i];
      const dy = pointer.y - fish.y[i];
      if (dx > w * 0.5) dx -= w;
      else if (dx < -w * 0.5) dx += w;

      const dist = Math.hypot(dx, dy);
      if (dist > 0.75 && dist < influenceR) {
        const nx = dx / dist;
        const ny = dy / dist;
        const edge = 1 - dist / influenceR;
        // Softer than edge² so mid-range fish still steer clearly toward the pointer.
        const falloff = Math.pow(edge, 1.2);
        const dFac = depthReact[fish.depth[i]!] ?? 1;
        let along: number;
        if (dist < personal) {
          const t = 1 - dist / personal;
          along = -flee * (t * t);
        } else {
          along = follow * (1 - (dist - personal) / (influenceR - personal));
        }
        const mag = Math.min(maxSteer, 52 * falloff * along * dFac);
        targetVx = nx * mag;
        targetVy = ny * mag;
      }
    }

    const followRate = Math.min(1, 8 * dt);
    fish.vxOff[i] += (targetVx - fish.vxOff[i]) * followRate;
    fish.vyOff[i] += (targetVy - fish.vyOff[i]) * followRate;

    const decay = pointer.inCanvas ? 1 : Math.max(0, 1 - 2.4 * dt);
    fish.vxOff[i] *= decay;
    fish.vyOff[i] *= decay;

    const vx = fish.speed[i] * fish.dir[i] + fish.vxOff[i];
    fish.x[i] += vx * dt;
    fish.y[i] += fish.vyOff[i] * dt;
    fish.y[i] = Math.min(bottom, Math.max(top, fish.y[i]));

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
  depth: number,
) {
  const depthScale =
    depth === FISH_DEPTH_BACK ? 0.7 : depth === FISH_DEPTH_FRONT ? 1.14 : 1;
  const alpha =
    depth === FISH_DEPTH_BACK ? 0.78 : depth === FISH_DEPTH_FRONT ? 1 : 0.96;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(dir * depthScale, depthScale);
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
  depthPass: number,
) {
  for (let i = 0; i < FISH_COUNT; i++) {
    if (fish.depth[i] !== depthPass) continue;
    const bobHz = 0.95 + i * 0.11;
    const bobAmp =
      fish.depth[i] === FISH_DEPTH_BACK
        ? 0.72
        : fish.depth[i] === FISH_DEPTH_FRONT
          ? 1.08
          : 1;
    const bob =
      Math.sin(timeSec * bobHz + fish.bobPhase[i]) *
      (5 + fish.size[i] * 9) *
      bobAmp;
    drawFish(
      ctx,
      fish.x[i],
      fish.y[i] + bob,
      fish.size[i],
      fish.dir[i],
      fish.color[i]!,
      fish.depth[i]!,
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

function drawBubbleSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  timeSec: number,
  phase: number,
  shimmerSeed: number,
) {
  ctx.lineWidth = 1;
  const shimmer =
    0.28 + Math.sin(timeSec * 0.35 + phase + shimmerSeed * 0.7) * 0.06;

  ctx.globalAlpha = shimmer;
  ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = shimmer + 0.12;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
  ctx.stroke();
}

function drawBubbles(
  ctx: CanvasRenderingContext2D,
  buf: FloatBuffers,
  timeSec: number,
) {
  ctx.save();
  for (let i = 0; i < buf.bCount; i++) {
    const x = buf.bx[i] + Math.sin(timeSec * 0.5 + buf.bPhase[i]) * 5;
    const y = buf.by[i];
    const r = buf.br[i];
    drawBubbleSprite(ctx, x, y, r, timeSec, buf.bPhase[i], i);
  }
  ctx.restore();
}

type PointerBubbleBuf = {
  px: Float32Array;
  py: Float32Array;
  pr: Float32Array;
  pRise: Float32Array;
  pPhase: Float32Array;
  active: Uint8Array;
};

function createPointerBubbleBuf(): PointerBubbleBuf {
  return {
    px: new Float32Array(MAX_POINTER_BUBBLES),
    py: new Float32Array(MAX_POINTER_BUBBLES),
    pr: new Float32Array(MAX_POINTER_BUBBLES),
    pRise: new Float32Array(MAX_POINTER_BUBBLES),
    pPhase: new Float32Array(MAX_POINTER_BUBBLES),
    active: new Uint8Array(MAX_POINTER_BUBBLES),
  };
}

function clearPointerBubbles(pb: PointerBubbleBuf) {
  pb.active.fill(0);
}

function spawnPointerBubble(
  pb: PointerBubbleBuf,
  cx: number,
  cy: number,
  w: number,
  h: number,
) {
  let slot = -1;
  for (let i = 0; i < MAX_POINTER_BUBBLES; i++) {
    if (pb.active[i] === 0) {
      slot = i;
      break;
    }
  }
  if (slot < 0) {
    slot = (Math.random() * MAX_POINTER_BUBBLES) | 0;
  }
  const margin = 10;
  pb.active[slot] = 1;
  pb.px[slot] = Math.min(
    w - margin,
    Math.max(margin, cx + (Math.random() - 0.5) * 16),
  );
  pb.py[slot] = Math.min(
    h - margin,
    Math.max(margin, cy + (Math.random() - 0.5) * 12),
  );
  pb.pr[slot] = 0.75 + Math.random() * 1.35;
  pb.pRise[slot] = 13 + Math.random() * 16;
  pb.pPhase[slot] = Math.random() * Math.PI * 2;
}

function stepPointerBubbles(
  pb: PointerBubbleBuf,
  w: number,
  dt: number,
  timeSec: number,
) {
  for (let i = 0; i < MAX_POINTER_BUBBLES; i++) {
    if (pb.active[i] === 0) continue;
    pb.px[i] += Math.sin(timeSec * 0.22 + pb.pPhase[i]) * 2.2 * dt;
    pb.py[i] -= pb.pRise[i] * dt;
    if (pb.py[i] < -pb.pr[i] * 4) pb.active[i] = 0;
    if (pb.px[i] < -24) pb.px[i] = w + 12;
    if (pb.px[i] > w + 24) pb.px[i] = -12;
  }
}

function drawPointerBubbles(
  ctx: CanvasRenderingContext2D,
  pb: PointerBubbleBuf,
  timeSec: number,
) {
  ctx.save();
  for (let i = 0; i < MAX_POINTER_BUBBLES; i++) {
    if (pb.active[i] === 0) continue;
    const x = pb.px[i] + Math.sin(timeSec * 0.5 + pb.pPhase[i]) * 5;
    const y = pb.py[i];
    const r = pb.pr[i];
    drawBubbleSprite(ctx, x, y, r, timeSec, pb.pPhase[i], i + 0.37);
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

type AquariumCanvasProps = {
  /** Optional ref to read the latest pointer position in canvas coordinates (no re-renders). */
  pointerCanvasRef?: MutableRefObject<PointerCanvasState>;
};

export default function AquariumCanvas({ pointerCanvasRef: pointerCanvasRefProp }: AquariumCanvasProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerCanvasRefInternal = useRef<PointerCanvasState>({
    x: 0,
    y: 0,
    inCanvas: false,
  });
  const pointerCanvasRef = pointerCanvasRefProp ?? pointerCanvasRefInternal;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const buf = createBuffers();
    const pointerBubbles = createPointerBubbleBuf();
    const fish = createFishSchool();
    let rafId = 0;
    let lastCssW = -1;
    let lastCssH = -1;
    let lastNow = 0;

    const pointerSpawn = {
      lastT: 0,
      lastX: 0,
      lastY: 0,
      initialized: false,
    };

    const trySpawnPointerTrail = () => {
      const p = pointerCanvasRef.current;
      if (!p.inCanvas) return;
      const now = performance.now();
      const w = Math.max(1, canvas.clientWidth);
      const h = Math.max(1, canvas.clientHeight);
      const dx = p.x - pointerSpawn.lastX;
      const dy = p.y - pointerSpawn.lastY;
      const dist = Math.hypot(dx, dy);
      if (!pointerSpawn.initialized) {
        pointerSpawn.initialized = true;
        pointerSpawn.lastT = now;
        pointerSpawn.lastX = p.x;
        pointerSpawn.lastY = p.y;
        return;
      }
      const elapsed = now - pointerSpawn.lastT;
      if (elapsed < 0.055) return;
      if (dist < 4 && elapsed < 0.38) return;
      pointerSpawn.lastT = now;
      pointerSpawn.lastX = p.x;
      pointerSpawn.lastY = p.y;
      spawnPointerBubble(pointerBubbles, p.x, p.y, w, h);
      if (dist > 22 && Math.random() < 0.32) {
        spawnPointerBubble(pointerBubbles, p.x, p.y, w, h);
      }
    };

    const onPointerClient = (clientX: number, clientY: number) => {
      updatePointerCanvasState(canvas, clientX, clientY, pointerCanvasRef.current);
    };

    const onPointerMove = (e: PointerEvent) => {
      onPointerClient(e.clientX, e.clientY);
      trySpawnPointerTrail();
    };

    const onPointerDown = (e: PointerEvent) => {
      onPointerClient(e.clientX, e.clientY);
      const p = pointerCanvasRef.current;
      if (!p.inCanvas) return;
      const w = Math.max(1, canvas.clientWidth);
      const h = Math.max(1, canvas.clientHeight);
      const now = performance.now();
      pointerSpawn.lastT = now;
      pointerSpawn.lastX = p.x;
      pointerSpawn.lastY = p.y;
      pointerSpawn.initialized = true;
      const burst = e.pointerType === "touch" || e.pointerType === "pen" ? 3 : 2;
      for (let k = 0; k < burst; k++) {
        spawnPointerBubble(pointerBubbles, p.x, p.y, w, h);
      }
    };

    const onPointerLeave = () => {
      pointerCanvasRef.current.inCanvas = false;
      pointerSpawn.initialized = false;
    };

    const onPointerCancel = () => {
      pointerCanvasRef.current.inCanvas = false;
      pointerSpawn.initialized = false;
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("pointercancel", onPointerCancel);

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
        clearPointerBubbles(pointerBubbles);
        resetFish(fish, cssW, cssH);
      }

      stepParticles(buf, cssW, cssH, dt);
      stepBubbles(buf, cssW, cssH, dt, timeSec);
      stepPointerBubbles(pointerBubbles, cssW, dt, timeSec);
      stepFish(fish, cssW, cssH, dt, pointerCanvasRef.current);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      drawUnderwaterBackground(ctx, cssW, cssH);
      drawDistantReef(ctx, cssW, cssH);
      drawDriftParticles(ctx, buf);
      drawFishSchool(ctx, fish, timeSec, FISH_DEPTH_BACK);
      drawMidgroundRocksAndPlants(ctx, cssW, cssH, timeSec);
      drawFishSchool(ctx, fish, timeSec, FISH_DEPTH_MID);
      drawForegroundSeaweed(ctx, cssW, cssH, timeSec);
      drawFishSchool(ctx, fish, timeSec, FISH_DEPTH_FRONT);
      drawBubbles(ctx, buf, timeSec);
      drawPointerBubbles(ctx, pointerBubbles, timeSec);

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [pointerCanvasRef]);

  return (
    <div ref={containerRef} className="h-full w-full min-h-0">
      <canvas
        ref={canvasRef}
        className="pointer-events-auto block h-full w-full touch-none"
        aria-label="Aquarium view"
      />
    </div>
  );
}
