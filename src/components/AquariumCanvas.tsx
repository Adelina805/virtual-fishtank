"use client";

import {
  memo,
  useEffect,
  useRef,
  type MutableRefObject,
} from "react";

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

/**
 * Effective backing-store scale: `min(deviceDPR, MAX_CANVAS_DPR)`, then lowered if the
 * canvas would exceed `MAX_BACKING_PIXELS` (large fullscreen layouts).
 *
 * Tradeoff: higher DPR = sharper edges and thinner strokes on retina; lower DPR = fewer
 * pixels per frame (fill rate / memory). Capping avoids paying ~9× fill for 3× phones and
 * avoids multi‑million‑pixel buffers on big desktop windows where 2× is rarely visible.
 */
const MAX_CANVAS_DPR = 2;
/** ~1920×1080 at 2× — keeps fill rate bounded on ultrawide / 4K CSS layouts. */
const MAX_BACKING_PIXELS = 8_294_400;

function effectiveCanvasDpr(
  cssW: number,
  cssH: number,
  deviceDpr: number,
): number {
  const w = Math.max(1, cssW);
  const h = Math.max(1, cssH);
  let dpr = Math.min(MAX_CANVAS_DPR, Math.max(1, deviceDpr || 1));
  const maxDprByPixels = Math.sqrt(MAX_BACKING_PIXELS / (w * h));
  dpr = Math.min(dpr, maxDprByPixels);
  return Math.max(1, dpr);
}

/** Hard caps keep phones cool; count scales down with smaller canvases. */
const MAX_PARTICLES = 56;
const MAX_BUBBLES = 24;
/** Cursor / touch trail bubbles — small pool, same look as background bubbles. */
const MAX_POINTER_BUBBLES = 40;
/** Default school size (user can add fish up to `MAX_FISH_COUNT`). */
export const DEFAULT_FISH_COUNT = 10;
/** Upper bound for extra fish — keeps mobile GPUs happier. */
export const MAX_FISH_COUNT = 100;

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
  /** Extra swim multiplier headroom; effective horizontal speed uses `speed * (1 + speedBoost)`. */
  speedBoost: Float32Array;
  /** Which compositing pass this fish belongs to (layered depth). */
  depth: Uint8Array;
  /** Index into `FISH_PALETTES` — dorsal / mid / belly / fin for each fish. */
  paletteId: Uint8Array;
};

/** Tropical reef-inspired gradients (dorsal → mid → belly + tail accent). */
const FISH_PALETTES = [
  { dorsal: "#d4a010", mid: "#f0c238", belly: "#fff4c8", fin: "#a67a08" },
  { dorsal: "#1a5588", mid: "#2a9adb", belly: "#9bd8f2", fin: "#103a5c" },
  { dorsal: "#c84818", mid: "#e86c28", belly: "#fde0b8", fin: "#8a3010" },
  { dorsal: "#218a78", mid: "#3ec9b0", belly: "#d2f5ee", fin: "#145c50" },
  { dorsal: "#5c34a0", mid: "#7c58d8", belly: "#ddd0f5", fin: "#3c2068" },
  { dorsal: "#b83020", mid: "#e05038", belly: "#ffd0a0", fin: "#781810" },
  { dorsal: "#267848", mid: "#42b868", belly: "#c8f0d0", fin: "#165030" },
  { dorsal: "#b84878", mid: "#e07098", belly: "#ffd8e8", fin: "#803050" },
  { dorsal: "#167888", mid: "#2ab8d0", belly: "#b8eef8", fin: "#0e5060" },
  { dorsal: "#a86828", mid: "#d09040", belly: "#ffeec8", fin: "#704018" },
] as const;

type FishPalette = (typeof FISH_PALETTES)[number];

function createFishSchool(capacity: number): FishSchool {
  return {
    x: new Float32Array(capacity),
    y: new Float32Array(capacity),
    speed: new Float32Array(capacity),
    dir: new Float32Array(capacity),
    size: new Float32Array(capacity),
    bobPhase: new Float32Array(capacity),
    vxOff: new Float32Array(capacity),
    vyOff: new Float32Array(capacity),
    speedBoost: new Float32Array(capacity),
    depth: new Uint8Array(capacity),
    paletteId: new Uint8Array(capacity),
  };
}

/** Hoisted: avoid allocating each `stepFish` call (once per frame). */
const FISH_DEPTH_REACT: readonly number[] = [0.88, 1.12, 1.38];

const AQUARIUM_POEM_TAGLINES: readonly string[] = [
  "A soothing, interactive aquarium",
  "with calm motion, gentle taps,",
  "and a quiet home on palm or desk.",
];

type NightBiolumSpot = {
  ux: number;
  uy: number;
  r: number;
  phase: number;
};

const NIGHT_BIOLOUM_SPOTS: readonly NightBiolumSpot[] = [
  { ux: 0.2, uy: 0.58, r: 0.32, phase: 0 },
  { ux: 0.82, uy: 0.52, r: 0.26, phase: 1.15 },
  { ux: 0.5, uy: 0.68, r: 0.36, phase: 2.05 },
];

/** Two per depth band — cycles for fish beyond the first six. */
const FISH_DEPTH_CYCLE: readonly number[] = [
  FISH_DEPTH_BACK,
  FISH_DEPTH_BACK,
  FISH_DEPTH_MID,
  FISH_DEPTH_MID,
  FISH_DEPTH_FRONT,
  FISH_DEPTH_FRONT,
];

function initFishIndex(fish: FishSchool, i: number, w: number, h: number) {
  const top = h * 0.14;
  const bottom = h * 0.86;
  const nPalettes = FISH_PALETTES.length;
  fish.x[i] = Math.random() * w;
  fish.y[i] = top + Math.random() * (bottom - top);
  fish.dir[i] = Math.random() < 0.5 ? -1 : 1;
  fish.bobPhase[i] = Math.random() * Math.PI * 2;
  fish.vxOff[i] = 0;
  fish.vyOff[i] = 0;
  fish.speedBoost[i] = 0;
  fish.depth[i] = FISH_DEPTH_CYCLE[i % FISH_DEPTH_CYCLE.length]!;
  fish.paletteId[i] = (Math.random() * nPalettes) | 0;

  const sizeT = Math.random();
  fish.size[i] = 0.72 + sizeT * 0.78;
  const baseSpeed = 14 + Math.random() * 62;
  const depthSpeedMul =
    fish.depth[i] === FISH_DEPTH_BACK
      ? 0.78 + Math.random() * 0.12
      : fish.depth[i] === FISH_DEPTH_FRONT
        ? 1.02 + Math.random() * 0.14
        : 0.9 + Math.random() * 0.14;
  fish.speed[i] = baseSpeed * depthSpeedMul;
}

function resetFish(fish: FishSchool, w: number, h: number, count: number) {
  for (let i = 0; i < count; i++) {
    initFishIndex(fish, i, w, h);
  }
}

/** Nearby fish gently bias toward or away from the pointer; offsets are low-pass filtered (no snapping). */
function stepFish(
  fish: FishSchool,
  w: number,
  h: number,
  dt: number,
  pointer: PointerCanvasState,
  count: number,
) {
  const margin = 40;
  const top = h * 0.14;
  const bottom = h * 0.86;
  const influenceR = Math.min(320, Math.min(w, h) * 0.52);
  const personal = 56;
  const maxSteer = 58;
  const follow = 1;
  const flee = 1.35;
  const maxSpeedBoost = 0.52;
  const boostOnFlip = 0.36;
  const pointerBoostPerSec = 2.4;
  const boostDecayPerSec = 2.15;

  // Same for every fish this frame — hoisted out of the loop.
  const followRate = Math.min(1, 8 * dt);
  const decay = pointer.inCanvas ? 1 : Math.max(0, 1 - 2.4 * dt);
  const halfW = w * 0.5;
  const influenceRSq = influenceR * influenceR;
  /** Skip pointer math when the cursor is outside the tank. */
  const pointerActive = pointer.inCanvas && influenceR > 1;
  /** Avoid divide-by-zero if the tank is very small (influence radius can shrink below `personal`). */
  const influenceSpan = Math.max(1e-3, influenceR - personal);

  for (let i = 0; i < count; i++) {
    let targetVx = 0;
    let targetVy = 0;

    if (pointerActive) {
      let dx = pointer.x - fish.x[i];
      const dy = pointer.y - fish.y[i];
      if (dx > halfW) dx -= w;
      else if (dx < -halfW) dx += w;

      const distSq = dx * dx + dy * dy;
      // Match old logic: react only when 0.75 < dist < influenceR (use squares to skip sqrt).
      if (distSq > 0.5625 && distSq < influenceRSq) {
        const dist = Math.sqrt(distSq);
        // In the close zone, flee pushes opposite the base swim when the pointer is *ahead*
        // of the fish (same side as the mouth), so horizontal speed cancels and the fish
        // looks frozen. Turn around once so swimming matches fleeing.
        if (dist < personal) {
          const pointerAhead = fish.dir[i]! * dx > 2;
          if (pointerAhead) {
            fish.dir[i]! *= -1;
            fish.vxOff[i] = 0;
            fish.speedBoost[i] = Math.min(
              maxSpeedBoost,
              fish.speedBoost[i] + boostOnFlip,
            );
          }
        }

        const nx = dx / dist;
        const ny = dy / dist;
        const edge = 1 - dist / influenceR;
        // Softer than edge² so mid-range fish still steer clearly toward the pointer.
        const falloff = Math.pow(edge, 1.2);
        const dFac = FISH_DEPTH_REACT[fish.depth[i]!] ?? 1;
        let along: number;
        if (dist < personal) {
          const t = 1 - dist / personal;
          along = -flee * (t * t);
        } else {
          along = follow * (1 - (dist - personal) / influenceSpan);
        }
        const mag = Math.min(maxSteer, 52 * falloff * along * dFac);
        targetVx = nx * mag;
        targetVy = ny * mag;
        fish.speedBoost[i] = Math.min(
          maxSpeedBoost,
          fish.speedBoost[i] + pointerBoostPerSec * dt,
        );
      }
    }

    fish.vxOff[i] += (targetVx - fish.vxOff[i]) * followRate;
    fish.vyOff[i] += (targetVy - fish.vyOff[i]) * followRate;

    fish.vxOff[i] *= decay;
    fish.vyOff[i] *= decay;

    fish.speedBoost[i] = Math.max(
      0,
      fish.speedBoost[i] - boostDecayPerSec * dt,
    );
    const swimMul = 1 + fish.speedBoost[i];
    const vx = fish.speed[i] * swimMul * fish.dir[i] + fish.vxOff[i];
    fish.x[i] += vx * dt;
    fish.y[i] += fish.vyOff[i] * dt;
    fish.y[i] = Math.min(bottom, Math.max(top, fish.y[i]));

    if (fish.x[i] < -margin) fish.x[i] += w + margin * 2;
    else if (fish.x[i] > w + margin) fish.x[i] -= w + margin * 2;
  }
}

/** One gradient per palette per context — fish drawing uses unit L=22,H=10 then scales by `size`. */
const fishBodyGradientCache = new WeakMap<
  CanvasRenderingContext2D,
  (CanvasGradient | undefined)[]
>();

function getFishBodyGradient(
  ctx: CanvasRenderingContext2D,
  paletteId: number,
): CanvasGradient {
  let row = fishBodyGradientCache.get(ctx);
  if (!row) {
    row = [];
    fishBodyGradientCache.set(ctx, row);
  }
  let g = row[paletteId];
  if (!g) {
    const pal = FISH_PALETTES[paletteId] ?? FISH_PALETTES[0]!;
    const H = 10;
    g = ctx.createLinearGradient(0, -H * 0.55, 0, H * 0.55);
    g.addColorStop(0, pal.dorsal);
    g.addColorStop(0.42, pal.mid);
    g.addColorStop(1, pal.belly);
    row[paletteId] = g;
  }
  return g;
}

function drawFish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  dir: number,
  paletteId: number,
  depth: number,
) {
  const palette = FISH_PALETTES[paletteId] ?? FISH_PALETTES[0]!;
  const depthScale =
    depth === FISH_DEPTH_BACK ? 0.7 : depth === FISH_DEPTH_FRONT ? 1.14 : 1;
  const alpha =
    depth === FISH_DEPTH_BACK ? 0.78 : depth === FISH_DEPTH_FRONT ? 1 : 0.96;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(dir * depthScale * size, depthScale * size);
  const L = 22;
  const H = 10;

  ctx.fillStyle = getFishBodyGradient(ctx, paletteId);
  ctx.beginPath();
  ctx.ellipse(-L * 0.12, 0, L * 0.44, H * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.fin;
  ctx.beginPath();
  ctx.moveTo(-L * 0.52, 0);
  ctx.lineTo(-L * 0.98, -H * 0.5);
  ctx.lineTo(-L * 0.98, H * 0.5);
  ctx.closePath();
  ctx.fill();

  // Lateral eye: sits inside the head ellipse (not past the snout).
  const ex = L * 0.17;
  const ey = H * 0.06;
  const eyeR = H * 0.17;
  ctx.fillStyle = "rgba(252, 252, 250, 0.94)";
  ctx.beginPath();
  ctx.ellipse(ex, ey, eyeR * 1.02, eyeR, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a2e32";
  ctx.beginPath();
  ctx.arc(ex + H * 0.055, ey, H * 0.078, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.beginPath();
  ctx.arc(ex + H * 0.04, ey - H * 0.03, H * 0.028, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Horizontal slack so fish slightly past the edge still draw (body + bob is smaller than this). */
const FISH_DRAW_MARGIN_X = 72;

function drawFishSchool(
  ctx: CanvasRenderingContext2D,
  fish: FishSchool,
  timeSec: number,
  depthPass: number,
  count: number,
  tankWidth: number,
) {
  const left = -FISH_DRAW_MARGIN_X;
  const right = tankWidth + FISH_DRAW_MARGIN_X;

  for (let i = 0; i < count; i++) {
    if (fish.depth[i] !== depthPass) continue;
    const x = fish.x[i];
    if (x < left || x > right) continue;

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
      x,
      fish.y[i] + bob,
      fish.size[i],
      fish.dir[i],
      fish.paletteId[i]!,
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
  ambience: AquariumAmbience,
) {
  ctx.save();
  const fill =
    ambience === "day"
      ? "rgba(210, 240, 255, 0.9)"
      : "rgba(140, 230, 220, 0.85)";
  for (let i = 0; i < buf.pCount; i++) {
    ctx.globalAlpha = ambience === "night" ? buf.pop[i] * 1.15 : buf.pop[i];
    ctx.fillStyle = fill;
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

/** Extra room for horizontal wobble (`sin(...) * 5`) so we do not pop bubbles in at the edge. */
const BUBBLE_VIEW_MARGIN = 32;

function drawBubbles(
  ctx: CanvasRenderingContext2D,
  buf: FloatBuffers,
  timeSec: number,
  tankW: number,
  tankH: number,
) {
  ctx.save();
  for (let i = 0; i < buf.bCount; i++) {
    const x = buf.bx[i] + Math.sin(timeSec * 0.5 + buf.bPhase[i]) * 5;
    const y = buf.by[i];
    const r = buf.br[i];
    if (
      x < -BUBBLE_VIEW_MARGIN ||
      x > tankW + BUBBLE_VIEW_MARGIN ||
      y < -r * 4 - BUBBLE_VIEW_MARGIN ||
      y > tankH + r * 4 + BUBBLE_VIEW_MARGIN
    ) {
      continue;
    }
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
  tankW: number,
  tankH: number,
) {
  ctx.save();
  for (let i = 0; i < MAX_POINTER_BUBBLES; i++) {
    if (pb.active[i] === 0) continue;
    const x = pb.px[i] + Math.sin(timeSec * 0.5 + pb.pPhase[i]) * 5;
    const y = pb.py[i];
    const r = pb.pr[i];
    if (
      x < -BUBBLE_VIEW_MARGIN ||
      x > tankW + BUBBLE_VIEW_MARGIN ||
      y < -r * 4 - BUBBLE_VIEW_MARGIN ||
      y > tankH + r * 4 + BUBBLE_VIEW_MARGIN
    ) {
      continue;
    }
    drawBubbleSprite(ctx, x, y, r, timeSec, pb.pPhase[i], i + 0.37);
  }
  ctx.restore();
}

export type AquariumAmbience = "day" | "night";

/**
 * Gradients tied to CSS size + day/night — rebuilt only on resize or ambience change.
 * (Resetting `canvas.width` clears the 2D state, so this cache is cleared there too.)
 */
type AquariumPaintCache = {
  cssW: number;
  cssH: number;
  ambience: AquariumAmbience;
  fillGrad: CanvasGradient;
  glowGrad: CanvasGradient;
  nightSurfaceGrad: CanvasGradient | null;
  /** Day only: one vertical ramp shared by all god-rays; per-beam brightness uses `globalAlpha`. */
  dayRayVerticalGrad: CanvasGradient | null;
  /** Night only: fixed-shape biolum gradients; pulse uses `globalAlpha`. */
  nightBioGrads: CanvasGradient[] | null;
};

function ensureAquariumPaintCache(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ambience: AquariumAmbience,
  sim: { paint: AquariumPaintCache | null },
): AquariumPaintCache {
  const cached = sim.paint;
  if (
    cached &&
    cached.cssW === w &&
    cached.cssH === h &&
    cached.ambience === ambience
  ) {
    return cached;
  }

  const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
  if (ambience === "day") {
    fillGrad.addColorStop(0, "#dff6ff");
    fillGrad.addColorStop(0.32, "#7ec8de");
    fillGrad.addColorStop(0.68, "#3a8a9c");
    fillGrad.addColorStop(1, "#124850");
  } else {
    fillGrad.addColorStop(0, "#0c1828");
    fillGrad.addColorStop(0.34, "#081420");
    fillGrad.addColorStop(0.68, "#050c18");
    fillGrad.addColorStop(1, "#02060e");
  }

  const glowGrad = ctx.createRadialGradient(
    w * 0.5,
    0,
    0,
    w * 0.5,
    h * 0.15,
    w * 0.65,
  );
  if (ambience === "day") {
    glowGrad.addColorStop(0, "rgba(255, 255, 255, 0.22)");
    glowGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  } else {
    glowGrad.addColorStop(0, "rgba(130, 175, 215, 0.1)");
    glowGrad.addColorStop(0.55, "rgba(40, 90, 130, 0.04)");
    glowGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  }

  let nightSurfaceGrad: CanvasGradient | null = null;
  let dayRayVerticalGrad: CanvasGradient | null = null;
  let nightBioGrads: CanvasGradient[] | null = null;

  if (ambience === "day") {
    dayRayVerticalGrad = ctx.createLinearGradient(0, 0, 0, h * 0.92);
    dayRayVerticalGrad.addColorStop(0, "rgba(255, 252, 245, 0.11)");
    dayRayVerticalGrad.addColorStop(0.4, "rgba(220, 240, 255, 0.045)");
    dayRayVerticalGrad.addColorStop(1, "rgba(200, 230, 255, 0)");
  } else {
    nightSurfaceGrad = ctx.createRadialGradient(
      w * 0.5,
      0,
      0,
      w * 0.5,
      h * 0.12,
      w * 0.48,
    );
    nightSurfaceGrad.addColorStop(0, "rgba(160, 200, 230, 0.055)");
    nightSurfaceGrad.addColorStop(1, "rgba(30, 60, 90, 0)");

    const m = Math.min(w, h);
    nightBioGrads = [];
    for (let si = 0; si < NIGHT_BIOLOUM_SPOTS.length; si++) {
      const s = NIGHT_BIOLOUM_SPOTS[si]!;
      const gx = w * s.ux;
      const gy = h * s.uy;
      const rad = m * s.r;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
      g.addColorStop(0, "rgba(110, 235, 215, 0.075)");
      g.addColorStop(0.38, "rgba(50, 120, 160, 0.032)");
      g.addColorStop(1, "rgba(15, 40, 70, 0)");
      nightBioGrads.push(g);
    }
  }

  const next: AquariumPaintCache = {
    cssW: w,
    cssH: h,
    ambience,
    fillGrad,
    glowGrad,
    nightSurfaceGrad,
    dayRayVerticalGrad,
    nightBioGrads,
  };
  sim.paint = next;
  return next;
}

/** Soft god-rays from the surface — low contrast, few beams. */
function drawDayLightRays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  verticalRayGradient: CanvasGradient,
) {
  ctx.save();
  const cx = width * 0.5;
  const rayCount = 5;
  for (let i = 0; i < rayCount; i++) {
    const t = (i + 0.5) / rayCount - 0.5;
    const originX = cx + t * width * 0.72;
    const angle = t * 0.11;
    const beamNarrow = width * (0.028 + (i % 2) * 0.014);
    const breath = 0.88 + 0.12 * Math.sin(timeSec * 0.35 + i * 0.9);

    ctx.save();
    ctx.translate(originX, 0);
    ctx.rotate(angle);
    ctx.globalAlpha = breath;
    ctx.fillStyle = verticalRayGradient;

    ctx.beginPath();
    ctx.moveTo(-beamNarrow * 0.5, 0);
    ctx.lineTo(beamNarrow * 0.5, 0);
    ctx.lineTo(beamNarrow * 1.65, height * 0.88);
    ctx.lineTo(-beamNarrow * 1.65, height * 0.88);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** Deep-water cyan/teal glow pools with a slow pulse — sparse, not sparkly. */
function drawNightBiolumGlow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  grads: readonly CanvasGradient[],
) {
  ctx.save();
  for (let si = 0; si < NIGHT_BIOLOUM_SPOTS.length; si++) {
    const s = NIGHT_BIOLOUM_SPOTS[si]!;
    const pulse = 0.55 + 0.45 * Math.sin(timeSec * 0.42 + s.phase);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = grads[si]!;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

function drawUnderwaterBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  ambience: AquariumAmbience,
  timeSec: number,
  sim: AquariumCanvasSimulation,
) {
  const cache = ensureAquariumPaintCache(ctx, width, height, ambience, sim);

  ctx.fillStyle = cache.fillGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = cache.glowGrad;
  ctx.fillRect(0, 0, width, height);

  if (ambience === "day") {
    drawDayLightRays(
      ctx,
      width,
      height,
      timeSec,
      cache.dayRayVerticalGrad!,
    );
  } else {
    ctx.fillStyle = cache.nightSurfaceGrad!;
    ctx.fillRect(0, 0, width, height);
    drawNightBiolumGlow(
      ctx,
      width,
      height,
      timeSec,
      cache.nightBioGrads!,
    );
  }
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

function drawAquariumPoetry(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ambience: AquariumAmbience,
  fontFamily: string,
) {
  const cx = w * 0.5;
  const title = "Virtual Fishtank";
  const titleSize = Math.max(26, Math.min(56, w * 0.09));
  const lineSize = Math.max(15, Math.min(26, w * 0.042));
  const lineHeight = lineSize * 1.42;
  const blockHalfHeight =
    (titleSize * 1.1 + AQUARIUM_POEM_TAGLINES.length * lineHeight) * 0.5;
  const cy = h * 0.24;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const night = ambience === "night";
  const titleFill = night
    ? "rgba(255, 250, 245, 0.54)"
    : "rgba(28, 55, 72, 0.5)";
  const lineFill = night
    ? "rgba(220, 240, 255, 0.44)"
    : "rgba(32, 72, 88, 0.46)";
  const glow = night
    ? "rgba(160, 220, 255, 0.32)"
    : "rgba(255, 255, 255, 0.5)";

  let y = cy - blockHalfHeight + titleSize * 0.45;

  ctx.font = `600 ${titleSize}px ${fontFamily}`;
  ctx.shadowColor = glow;
  ctx.shadowBlur = night ? 28 : 18;
  ctx.fillStyle = titleFill;
  ctx.fillText(title, cx, y);

  y += titleSize * 1.05;
  ctx.shadowBlur = night ? 14 : 10;
  ctx.font = `400 ${lineSize}px ${fontFamily}`;
  ctx.fillStyle = lineFill;
  for (const line of AQUARIUM_POEM_TAGLINES) {
    ctx.fillText(line, cx, y);
    y += lineHeight;
  }

  ctx.restore();
}

/**
 * Mutable settings read every animation frame — keep them in a ref so the canvas can stay memoized
 * while React state updates only the control panel.
 */
export type AquariumRuntimeSettings = {
  ambience: AquariumAmbience;
  /** Clamped each frame to DEFAULT…MAX. */
  fishCount: number;
};

type AquariumCanvasProps = {
  /** Optional ref to read the latest pointer position in canvas coordinates (no re-renders). */
  pointerCanvasRef?: MutableRefObject<PointerCanvasState>;
  /**
   * When provided, ambience and fish count are read here each frame (not from props).
   * When omitted, an internal ref is kept in sync from `ambience` / `fishCount` props each render.
   */
  runtimeSettingsRef?: MutableRefObject<AquariumRuntimeSettings>;
  /** Used only if `runtimeSettingsRef` is not passed. */
  ambience?: AquariumAmbience;
  /** Used only if `runtimeSettingsRef` is not passed. */
  fishCount?: number;
  /** CSS `font-family` value (e.g. from `next/font`) for centered poetry drawn under the fish. */
  poemFontFamily?: string;
};

/** All per-tank simulation data — lives outside React state; owned by the RAF loop + one ref. */
type AquariumCanvasSimulation = {
  buf: FloatBuffers;
  fish: FishSchool;
  pointerBubbles: PointerBubbleBuf;
  pointerSpawn: {
    lastT: number;
    lastX: number;
    lastY: number;
    initialized: boolean;
  };
  lastCssW: number;
  lastCssH: number;
  lastBackingW: number;
  lastBackingH: number;
  lastNow: number;
  lastAppliedFishCount: number;
  /** Cleared when the backing store is resized so gradients stay valid for the context. */
  paint: AquariumPaintCache | null;
};

function createAquariumSimulation(): AquariumCanvasSimulation {
  return {
    buf: createBuffers(),
    fish: createFishSchool(MAX_FISH_COUNT),
    pointerBubbles: createPointerBubbleBuf(),
    pointerSpawn: { lastT: 0, lastX: 0, lastY: 0, initialized: false },
    lastCssW: -1,
    lastCssH: -1,
    lastBackingW: -1,
    lastBackingH: -1,
    lastNow: 0,
    lastAppliedFishCount: 0,
    paint: null,
  };
}

function clampFishCount(n: number) {
  return Math.min(
    MAX_FISH_COUNT,
    Math.max(DEFAULT_FISH_COUNT, Math.floor(n)),
  );
}

function AquariumCanvasComponent({
  pointerCanvasRef: pointerCanvasRefProp,
  runtimeSettingsRef: runtimeSettingsRefProp,
  ambience = "night",
  fishCount = DEFAULT_FISH_COUNT,
  poemFontFamily,
}: AquariumCanvasProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerCanvasRefInternal = useRef<PointerCanvasState>({
    x: 0,
    y: 0,
    inCanvas: false,
  });
  const pointerCanvasRef = pointerCanvasRefProp ?? pointerCanvasRefInternal;

  const fallbackRuntimeRef = useRef<AquariumRuntimeSettings>({
    ambience,
    fishCount: clampFishCount(fishCount),
  });
  if (!runtimeSettingsRefProp) {
    fallbackRuntimeRef.current.ambience = ambience;
    fallbackRuntimeRef.current.fishCount = clampFishCount(fishCount);
  }
  const runtimeSettingsRef =
    runtimeSettingsRefProp ?? fallbackRuntimeRef;

  const poemFontFamilyRef = useRef(poemFontFamily);
  poemFontFamilyRef.current = poemFontFamily;

  const poemFontReadyRef = useRef(!poemFontFamily);
  useEffect(() => {
    if (!poemFontFamily) {
      poemFontReadyRef.current = true;
      return;
    }
    poemFontReadyRef.current = false;
    let cancelled = false;
    void document.fonts
      .load(`600 72px ${poemFontFamily}`)
      .then(() => {
        if (!cancelled) poemFontReadyRef.current = true;
      })
      .catch(() => {
        if (!cancelled) poemFontReadyRef.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [poemFontFamily]);

  const simulationRef = useRef<AquariumCanvasSimulation | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let sim = simulationRef.current;
    if (!sim) {
      sim = createAquariumSimulation();
      simulationRef.current = sim;
    }

    const { buf, fish, pointerBubbles, pointerSpawn } = sim;
    let rafId = 0;

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
      const cssW = Math.max(1, Math.round(canvas.clientWidth));
      const cssH = Math.max(1, Math.round(canvas.clientHeight));
      const dpr = effectiveCanvasDpr(cssW, cssH, window.devicePixelRatio || 1);
      const backingW = Math.max(1, Math.round(cssW * dpr));
      const backingH = Math.max(1, Math.round(cssH * dpr));

      if (sim.lastNow === 0) sim.lastNow = now;
      const dt = Math.min(0.05, Math.max(0, (now - sim.lastNow) / 1000));
      sim.lastNow = now;

      const rs = runtimeSettingsRef.current;
      const n = clampFishCount(rs.fishCount);
      const ambienceNow = rs.ambience;

      if (backingW !== sim.lastBackingW || backingH !== sim.lastBackingH) {
        canvas.width = backingW;
        canvas.height = backingH;
        sim.lastBackingW = backingW;
        sim.lastBackingH = backingH;
        sim.paint = null;
      }

      if (cssW !== sim.lastCssW || cssH !== sim.lastCssH) {
        sim.lastCssW = cssW;
        sim.lastCssH = cssH;
        resetParticlesAndBubbles(buf, cssW, cssH);
        clearPointerBubbles(pointerBubbles);
        resetFish(fish, cssW, cssH, n);
        sim.lastAppliedFishCount = n;
      } else if (n !== sim.lastAppliedFishCount) {
        if (n > sim.lastAppliedFishCount) {
          for (let i = sim.lastAppliedFishCount; i < n; i++) {
            initFishIndex(fish, i, cssW, cssH);
          }
        }
        sim.lastAppliedFishCount = n;
      }

      stepParticles(buf, cssW, cssH, dt);
      stepBubbles(buf, cssW, cssH, dt, timeSec);
      stepPointerBubbles(pointerBubbles, cssW, dt, timeSec);
      stepFish(fish, cssW, cssH, dt, pointerCanvasRef.current, n);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      drawUnderwaterBackground(ctx, cssW, cssH, ambienceNow, timeSec, sim);
      drawDistantReef(ctx, cssW, cssH);
      drawDriftParticles(ctx, buf, ambienceNow);
      const fam = poemFontFamilyRef.current;
      if (fam && poemFontReadyRef.current) {
        drawAquariumPoetry(ctx, cssW, cssH, ambienceNow, fam);
      }
      drawFishSchool(ctx, fish, timeSec, FISH_DEPTH_BACK, n, cssW);
      drawMidgroundRocksAndPlants(ctx, cssW, cssH, timeSec);
      drawFishSchool(ctx, fish, timeSec, FISH_DEPTH_MID, n, cssW);
      drawForegroundSeaweed(ctx, cssW, cssH, timeSec);
      drawFishSchool(ctx, fish, timeSec, FISH_DEPTH_FRONT, n, cssW);
      drawBubbles(ctx, buf, timeSec, cssW, cssH);
      drawPointerBubbles(ctx, pointerBubbles, timeSec, cssW, cssH);

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      simulationRef.current = null;
    };
  }, [pointerCanvasRef, runtimeSettingsRef]);

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

const AquariumCanvas = memo(AquariumCanvasComponent);
export default AquariumCanvas;
