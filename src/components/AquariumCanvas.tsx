"use client";

import {
  memo,
  useEffect,
  useRef,
  type MutableRefObject,
} from "react";
import {
  AQUARIUM_POEM_TAGLINES,
  DEFAULT_FISH_COUNT,
  getAquariumPoetryLayout,
  MAX_FISH_COUNT,
  type AquariumAmbience,
  type AquariumRuntimeSettings,
} from "@/src/lib/aquarium-runtime";

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
const MAX_PARTICLES = 40;
const MAX_BUBBLES = 18;
/** Cursor / touch trail bubbles — small pool, same look as background bubbles. */
const MAX_POINTER_BUBBLES = 32;

/** 0 = behind midground, 1 = between midground & seaweed, 2 = in front of seaweed (near glass). */
const FISH_DEPTH_BACK = 0;
const FISH_DEPTH_MID = 1;
const FISH_DEPTH_FRONT = 2;
/** Stage reveal timing keeps first paint calm and premium. */
const OPENING_PRIMARY_MS = 1000;
const DETAILS_REVEAL_DELAY_MS = 180;
const PARTICLES_REVEAL_MS = 1200;
const MIDGROUND_REVEAL_DELAY_MS = 220;
const MIDGROUND_REVEAL_MS = 1250;
const FOREGROUND_REVEAL_DELAY_MS = 320;
const FOREGROUND_REVEAL_MS = 1300;
const BUBBLES_REVEAL_DELAY_MS = 460;
const BUBBLES_REVEAL_MS = 1200;
const POETRY_REVEAL_MS = 1050;
const WAKE_VEIL_DELAY_MS = 80;
const WAKE_VEIL_MS = 1500;

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
  /** Countdown to a possible random direction switch (seconds). */
  turnTimer: Float32Array;
  /** Prevent rapid flip-flopping when the pointer stays in front. */
  turnCooldown: Float32Array;
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
    turnTimer: new Float32Array(capacity),
    turnCooldown: new Float32Array(capacity),
  };
}

function nextRandomTurnTimerSec() {
  return 2.8 + Math.random() * 3.4;
}

/** Hoisted: avoid allocating each `stepFish` call (once per frame). */
const FISH_DEPTH_REACT: readonly number[] = [0.88, 1.12, 1.38];

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

const OPENING_HERO_FISH: readonly {
  ux: number;
  uy: number;
  dir: -1 | 1;
  size: number;
  depth: number;
  speed: number;
  paletteId: number;
}[] = [
  { ux: 0.2, uy: 0.34, dir: 1, size: 1.18, depth: FISH_DEPTH_FRONT, speed: 34, paletteId: 1 },
  { ux: 0.36, uy: 0.28, dir: 1, size: 1.04, depth: FISH_DEPTH_MID, speed: 29, paletteId: 3 },
  { ux: 0.7, uy: 0.38, dir: -1, size: 1.12, depth: FISH_DEPTH_FRONT, speed: 36, paletteId: 8 },
  { ux: 0.54, uy: 0.47, dir: -1, size: 0.96, depth: FISH_DEPTH_BACK, speed: 24, paletteId: 0 },
];

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function easeOutCubic(t: number) {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}

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
  fish.turnTimer[i] = nextRandomTurnTimerSec();
  fish.turnCooldown[i] = 0;

  const sizeT = Math.random();
  fish.size[i] = 0.72 + sizeT * 0.78;
  // Lower base drift speed for a calmer feel.
  const baseSpeed = 12 + Math.random() * 44;
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

  const heroCount = Math.min(count, OPENING_HERO_FISH.length);
  for (let i = 0; i < heroCount; i++) {
    const hero = OPENING_HERO_FISH[i]!;
    fish.x[i] = hero.ux * w;
    fish.y[i] = hero.uy * h;
    fish.dir[i] = hero.dir;
    fish.size[i] = hero.size;
    fish.speed[i] = hero.speed;
    fish.depth[i] = hero.depth;
    fish.paletteId[i] = hero.paletteId % FISH_PALETTES.length;
    fish.bobPhase[i] = i * 0.78;
    fish.vxOff[i] = 0;
    fish.vyOff[i] = 0;
    fish.speedBoost[i] = 0;
    fish.turnTimer[i] = nextRandomTurnTimerSec();
    fish.turnCooldown[i] = 0;
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
  const influenceR = Math.min(320, Math.min(w, h) * 0.42);
  const personal = 56;
  const maxSteer = 46;
  const follow = 0.78;
  const maxSpeedBoost = 0.55;
  const behindBoostPerSec = 2.1;
  const boostOnFrontTurn = 0.28;
  const boostDecayPerSec = 1.75;
  const randomTurnChance = 0.34;
  const turnCooldownSec = 0.34;
  const directFleeRadius = 34;

  // Same for every fish this frame — hoisted out of the loop.
  const followRate = Math.min(1, 6 * dt);
  const decay = pointer.inCanvas ? 1 : Math.max(0, 1 - 1.9 * dt);
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
        const frontTurnRadius = Math.max(personal * 1.75, fish.size[i] * 46);
        const behindBoostRadius = Math.max(personal * 0.9, fish.size[i] * 30);
        const pointerAhead = fish.dir[i] * dx > 0;
        const directOnTop = dist < directFleeRadius;
        if (directOnTop) {
          // Cursor directly over fish: always flee from the pointer.
          fish.speedBoost[i] = Math.min(
            maxSpeedBoost,
            fish.speedBoost[i] + behindBoostPerSec * 1.25 * dt,
          );
        }
        if (pointerAhead && dist < frontTurnRadius) {
          if (fish.turnCooldown[i] <= 0) {
            fish.dir[i] *= -1;
            fish.turnCooldown[i] = turnCooldownSec;
            fish.speedBoost[i] = Math.min(
              maxSpeedBoost,
              fish.speedBoost[i] + boostOnFrontTurn,
            );
          }
        } else if (!pointerAhead && dist < behindBoostRadius) {
          fish.speedBoost[i] = Math.min(
            maxSpeedBoost,
            fish.speedBoost[i] + behindBoostPerSec * dt,
          );
        }

        const nx = dx / dist;
        const ny = dy / dist;
        const edge = 1 - dist / influenceR;
        // Softer than edge² so mid-range fish still steer clearly toward the pointer.
        const falloff = Math.pow(edge, 1.2);
        const dFac = FISH_DEPTH_REACT[fish.depth[i]!] ?? 1;
        let along: number;
        if (directOnTop) {
          along = -1.3;
        } else if (dist < behindBoostRadius) {
          if (pointerAhead) {
            along = -0.7;
          } else {
            along = follow * 0.42;
          }
        } else {
          along = follow * (1 - (dist - personal) / influenceSpan);
        }
        const mag = Math.min(maxSteer, 52 * falloff * along * dFac);
        targetVx = nx * mag;
        targetVy = ny * mag;
      }
    }

    fish.turnCooldown[i] = Math.max(0, fish.turnCooldown[i] - dt);
    fish.turnTimer[i] -= dt;
    if (fish.turnTimer[i] <= 0) {
      fish.turnTimer[i] = nextRandomTurnTimerSec();
      if (Math.random() < randomTurnChance && fish.turnCooldown[i] <= 0) {
        fish.dir[i] *= -1;
        fish.turnCooldown[i] = turnCooldownSec;
        fish.speedBoost[i] = Math.min(maxSpeedBoost, fish.speedBoost[i] + 0.14);
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
  const paths = getFishGeometryPaths();
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
  ctx.fill(paths.body);

  ctx.fillStyle = palette.fin;
  ctx.fill(paths.tail);

  // Lateral eye: sits inside the head ellipse (not past the snout).
  const ex = L * 0.17;
  const ey = H * 0.06;
  const eyeR = H * 0.17;
  ctx.fillStyle = "rgba(252, 252, 250, 0.94)";
  ctx.fill(paths.eyeWhite);
  ctx.fillStyle = "#1a2e32";
  ctx.fill(paths.eyePupil);
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.fill(paths.eyeHighlight);

  ctx.restore();
}

type FishGeometryPaths = {
  body: Path2D;
  tail: Path2D;
  eyeWhite: Path2D;
  eyePupil: Path2D;
  eyeHighlight: Path2D;
};

/** Unit fish geometry reused for every draw (less per-frame path work). */
let fishGeometryPaths: FishGeometryPaths | null = null;

function getFishGeometryPaths(): FishGeometryPaths {
  if (fishGeometryPaths) return fishGeometryPaths;
  const body = new Path2D();
  body.ellipse(-22 * 0.12, 0, 22 * 0.44, 10 * 0.48, 0, 0, Math.PI * 2);
  const tail = new Path2D();
  tail.moveTo(-22 * 0.52, 0);
  tail.lineTo(-22 * 0.98, -10 * 0.5);
  tail.lineTo(-22 * 0.98, 10 * 0.5);
  tail.closePath();
  const eyeWhite = new Path2D();
  eyeWhite.ellipse(
    22 * 0.17,
    10 * 0.06,
    10 * 0.17 * 1.02,
    10 * 0.17,
    0,
    0,
    Math.PI * 2,
  );
  const eyePupil = new Path2D();
  eyePupil.arc(22 * 0.17 + 10 * 0.055, 10 * 0.06, 10 * 0.078, 0, Math.PI * 2);
  const eyeHighlight = new Path2D();
  eyeHighlight.arc(
    22 * 0.17 + 10 * 0.04,
    10 * 0.06 - 10 * 0.03,
    10 * 0.028,
    0,
    Math.PI * 2,
  );
  fishGeometryPaths = { body, tail, eyeWhite, eyePupil, eyeHighlight };
  return fishGeometryPaths;
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

    const bobHz = 0.78 + i * 0.085;
    const bobAmp =
      fish.depth[i] === FISH_DEPTH_BACK
        ? 0.72
        : fish.depth[i] === FISH_DEPTH_FRONT
          ? 1.08
          : 1;
    const bob =
      Math.sin(timeSec * bobHz + fish.bobPhase[i]) *
      (5 + fish.size[i] * 9) *
      bobAmp *
      0.72;
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
  buf.pCount = Math.min(MAX_PARTICLES, Math.max(8, ((w * h) / 32000) | 0));
  for (let i = 0; i < buf.pCount; i++) {
    buf.px[i] = Math.random() * w;
    buf.py[i] = Math.random() * h * 0.94;
    buf.pvx[i] = (Math.random() - 0.5) * 4.5;
    buf.pvy[i] = (Math.random() - 0.5) * 2.8;
    buf.pr[i] = 0.35 + Math.random() * 1.05;
    buf.pop[i] = 0.07 + Math.random() * 0.14;
  }

  buf.bCount = Math.min(MAX_BUBBLES, Math.max(6, (w / 110) | 0));
  for (let i = 0; i < buf.bCount; i++) {
    buf.bx[i] = Math.random() * w;
    buf.by[i] = h * 0.35 + Math.random() * h * 0.65;
    buf.br[i] = 1.1 + Math.random() * 2;
    buf.bRise[i] = 9 + Math.random() * 10;
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
    buf.bx[i] += Math.sin(timeSec * 0.18 + buf.bPhase[i]) * 1.6 * dt;
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
    0.26 + Math.sin(timeSec * 0.25 + phase + shimmerSeed * 0.6) * 0.04;

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
    Math.max(margin, cx + (Math.random() - 0.5) * 11),
  );
  pb.py[slot] = Math.min(
    h - margin,
    Math.max(margin, cy + (Math.random() - 0.5) * 8),
  );
  pb.pr[slot] = 0.75 + Math.random() * 1.35;
  pb.pRise[slot] = 10 + Math.random() * 12;
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
    pb.px[i] += Math.sin(timeSec * 0.18 + pb.pPhase[i]) * 1.5 * dt;
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
    const x = pb.px[i] + Math.sin(timeSec * 0.38 + pb.pPhase[i]) * 3.6;
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
  /** Shared overlays reused each frame; intensity is applied with `globalAlpha`. */
  openingLightGrad: CanvasGradient;
  vignetteGrad: CanvasGradient;
  wakeVeilDayGrad: CanvasGradient;
  wakeVeilNightGrad: CanvasGradient;
};

/**
 * After the opening poetry fade-in finishes, title + taglines are static — rasterizing once
 * avoids repeated `strokeText` / `fillText` work every frame (hot path for main-thread time).
 */
type PoetryRasterCache = {
  canvas: HTMLCanvasElement;
  cssW: number;
  cssH: number;
  dpr: number;
  ambience: AquariumAmbience;
  fontKey: string;
};

function poetryRasterNeedsRebuild(
  c: PoetryRasterCache | null,
  cssW: number,
  cssH: number,
  dpr: number,
  ambience: AquariumAmbience,
  fontKey: string,
) {
  if (!c) return true;
  return (
    c.cssW !== cssW ||
    c.cssH !== cssH ||
    c.dpr !== dpr ||
    c.ambience !== ambience ||
    c.fontKey !== fontKey
  );
}

function drawAquariumPoetryCached(
  ctx: CanvasRenderingContext2D,
  poetryHolder: { poetryRaster: PoetryRasterCache | null },
  cssW: number,
  cssH: number,
  dpr: number,
  ambience: AquariumAmbience,
  fontFamily: string,
  detailsAlpha: number,
) {
  const fontKey = fontFamily;
  const canRasterize = detailsAlpha >= 0.999;
  if (!canRasterize) {
    poetryHolder.poetryRaster = null;
    drawAquariumPoetry(ctx, cssW, cssH, ambience, fontKey, detailsAlpha);
    return;
  }

  let cache = poetryHolder.poetryRaster;
  if (poetryRasterNeedsRebuild(cache, cssW, cssH, dpr, ambience, fontKey)) {
    const canvasEl = cache?.canvas ?? document.createElement("canvas");
    const bw = Math.max(1, Math.round(cssW * dpr));
    const bh = Math.max(1, Math.round(cssH * dpr));
    canvasEl.width = bw;
    canvasEl.height = bh;
    const pctx = canvasEl.getContext("2d");
    if (!pctx) {
      drawAquariumPoetry(ctx, cssW, cssH, ambience, fontKey, detailsAlpha);
      return;
    }
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, bw, bh);
    pctx.scale(dpr, dpr);
    drawAquariumPoetry(pctx, cssW, cssH, ambience, fontKey, 1);
    cache = {
      canvas: canvasEl,
      cssW,
      cssH,
      dpr,
      ambience,
      fontKey,
    };
    poetryHolder.poetryRaster = cache;
  }

  ctx.drawImage(cache!.canvas, 0, 0, cssW, cssH);
}

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
    // Allow tiny 1px-level rounding jitter during initial layout/resizes without
    // constantly rebuilding gradients (which is one of the more expensive canvas ops).
    Math.abs(cached.cssW - w) <= 1 &&
    Math.abs(cached.cssH - h) <= 1 &&
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

  const openingLightGrad = ctx.createLinearGradient(0, 0, 0, h);
  if (ambience === "day") {
    openingLightGrad.addColorStop(0, "rgba(255, 255, 255, 0.24)");
    openingLightGrad.addColorStop(0.34, "rgba(225, 246, 255, 0.08)");
    openingLightGrad.addColorStop(1, "rgba(200, 230, 255, 0)");
  } else {
    openingLightGrad.addColorStop(0, "rgba(158, 214, 255, 0.2)");
    openingLightGrad.addColorStop(0.36, "rgba(58, 128, 180, 0.07)");
    openingLightGrad.addColorStop(1, "rgba(20, 38, 70, 0)");
  }

  const vignetteGrad = ctx.createLinearGradient(0, 0, 0, h);
  vignetteGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignetteGrad.addColorStop(0.62, "rgba(0, 0, 0, 0.05)");
  vignetteGrad.addColorStop(1, ambience === "day" ? "rgba(5, 20, 30, 0.2)" : "rgba(0, 0, 0, 0.3)");

  const wakeVeilDayGrad = ctx.createLinearGradient(0, 0, 0, h);
  wakeVeilDayGrad.addColorStop(0, "rgba(241, 249, 255, 0.92)");
  wakeVeilDayGrad.addColorStop(0.56, "rgba(212, 235, 247, 0.72)");
  wakeVeilDayGrad.addColorStop(1, "rgba(170, 210, 225, 0.86)");
  const wakeVeilNightGrad = ctx.createLinearGradient(0, 0, 0, h);
  wakeVeilNightGrad.addColorStop(0, "rgba(8, 14, 24, 0.95)");
  wakeVeilNightGrad.addColorStop(0.56, "rgba(5, 10, 18, 0.82)");
  wakeVeilNightGrad.addColorStop(1, "rgba(2, 6, 12, 0.92)");

  const next: AquariumPaintCache = {
    cssW: w,
    cssH: h,
    ambience,
    fillGrad,
    glowGrad,
    nightSurfaceGrad,
    dayRayVerticalGrad,
    nightBioGrads,
    openingLightGrad,
    vignetteGrad,
    wakeVeilDayGrad,
    wakeVeilNightGrad,
  };
  sim.paint = next;
  return next;
}

/** Unit beam reused for every daylight ray. */
let dayRayPath: Path2D | null = null;

function getDayRayPath(): Path2D {
  if (dayRayPath) return dayRayPath;
  const next = new Path2D();
  next.moveTo(-0.5, 0);
  next.lineTo(0.5, 0);
  next.lineTo(1.65, 0.88);
  next.lineTo(-1.65, 0.88);
  next.closePath();
  dayRayPath = next;
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
  const rayPath = getDayRayPath();
  ctx.save();
  const cx = width * 0.5;
  const rayCount = 5;
  for (let i = 0; i < rayCount; i++) {
    const t = (i + 0.5) / rayCount - 0.5;
    const originX = cx + t * width * 0.72;
    const angle = t * 0.11;
    const beamNarrow = width * (0.028 + (i % 2) * 0.014);
    const breath = 0.9 + 0.08 * Math.sin(timeSec * 0.25 + i * 0.9);

    ctx.save();
    ctx.translate(originX, 0);
    ctx.rotate(angle);
    ctx.globalAlpha = breath;
    ctx.fillStyle = verticalRayGradient;

    ctx.scale(beamNarrow, height);
    ctx.fill(rayPath);
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
    const pulse = 0.57 + 0.3 * Math.sin(timeSec * 0.32 + s.phase);
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
  openingPrimaryT: number,
) {
  const cache = ensureAquariumPaintCache(ctx, width, height, ambience, sim);

  ctx.fillStyle = cache.fillGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = cache.glowGrad;
  ctx.fillRect(0, 0, width, height);

  // Early frames get stronger overlays so first paint feels intentional.
  ctx.save();
  const openingBoost = 1.1 - openingPrimaryT * 0.35;
  ctx.globalAlpha = openingBoost;
  ctx.fillStyle = cache.openingLightGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = cache.vignetteGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

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
    const angle = Math.sin(timeSec * 0.26 + phase) * 0.045;

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
    const swayLean = Math.sin(timeSec * 0.3 + phase) * width * 0.009;
    const swayMid = Math.sin(timeSec * 0.22 + phase * 1.35) * width * 0.0035;
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
  detailsAlpha: number,
) {
  const cx = w * 0.5;
  const title = "Virtual Fishtank";
  const { titleSize, lineSize, lineHeight, yTitle } = getAquariumPoetryLayout(
    w,
    h,
  );

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const night = ambience === "night";
  const titleFill = night
    ? "rgba(255, 250, 245, 0.54)"
    : "rgba(18, 50, 70, 0.72)";
  const lineFill = night
    ? "rgba(220, 240, 255, 0.44)"
    : "rgba(26, 68, 86, 0.58)";
  const glow = night
    ? "rgba(160, 220, 255, 0.32)"
    : "rgba(255, 255, 255, 0.5)";

  let y = yTitle;

  ctx.font = `600 ${titleSize}px ${fontFamily}`;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1.2, titleSize * 0.03);
  ctx.strokeStyle = night ? "rgba(5, 10, 20, 0.45)" : "rgba(255, 255, 255, 0.56)";
  ctx.strokeText(title, cx, y);
  ctx.fillStyle = titleFill;
  ctx.fillText(title, cx, y);

  y += titleSize * 1.05;
  ctx.globalAlpha *= detailsAlpha;
  ctx.shadowBlur = 0;
  ctx.font = `400 ${lineSize}px ${fontFamily}`;
  ctx.fillStyle = lineFill;
  for (const line of AQUARIUM_POEM_TAGLINES) {
    ctx.fillText(line, cx, y);
    y += lineHeight;
  }

  ctx.restore();
}

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
  /** Raster cache for poetry text after opening reveal; cleared on resize / ambience / font. */
  poetryRaster: PoetryRasterCache | null;
};

// In React dev, Strict Mode intentionally mounts/unmounts components to surface unsafe lifecycles.
// For this canvas, that can cause a noticeable "cold start" twice. Reusing a module-level simulation
// keeps typed-array allocations and paint warmup from happening back-to-back.
let sharedSimulation: AquariumCanvasSimulation | null = null;

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
    poetryRaster: null,
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
      sim = sharedSimulation ?? createAquariumSimulation();
      sharedSimulation = sim;
      simulationRef.current = sim;
    }
    // The DOM <canvas> backing store is per-instance. Reusing the shared simulation across
    // Strict Mode remounts means we must force a backing-store resize on every mount.
    sim.lastBackingW = -1;
    sim.lastBackingH = -1;
    sim.lastNow = 0;
    sim.paint = null;
    sim.poetryRaster = null;

    const { buf, fish, pointerBubbles, pointerSpawn } = sim;
    const effectStartMs = performance.now();
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
      const elapsedMs = now - pointerSpawn.lastT;
      // `performance.now()` is milliseconds; the original thresholds were in seconds.
      // This bug causes very frequent bubble spawns. Fixing it makes the motion calmer
      // and reduces per-frame canvas work.
      if (elapsedMs < 34) return;
      if (dist < 3 && elapsedMs < 260) return;
      const elapsedS = elapsedMs * 0.001;
      const speedPxPerSec = dist / Math.max(1e-3, elapsedS);
      pointerSpawn.lastT = now;
      pointerSpawn.lastX = p.x;
      pointerSpawn.lastY = p.y;
      spawnPointerBubble(pointerBubbles, p.x, p.y, w, h);
      if (dist > 14 && speedPxPerSec > 180 && Math.random() < 0.34) {
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
      const burst = e.pointerType === "touch" || e.pointerType === "pen" ? 2 : 1;
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

    const scheduleFrame = () => {
      if (document.visibilityState === "hidden") {
        rafId = 0;
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && rafId === 0) {
        sim.lastNow = 0;
        scheduleFrame();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

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

      const backingWDelta = Math.abs(backingW - sim.lastBackingW);
      const backingHDelta = Math.abs(backingH - sim.lastBackingH);
      const shouldUpdateBacking =
        sim.lastBackingW < 0 || sim.lastBackingH < 0
          ? true
          : backingWDelta >= 4 || backingHDelta >= 4;
      if (shouldUpdateBacking) {
        canvas.width = backingW;
        canvas.height = backingH;
        sim.lastBackingW = backingW;
        sim.lastBackingH = backingH;
        sim.paint = null;
        sim.poetryRaster = null;
      }

      const cssWDelta = Math.abs(cssW - sim.lastCssW);
      const cssHDelta = Math.abs(cssH - sim.lastCssH);
      const shouldResetForCssSize =
        sim.lastCssW < 0 || sim.lastCssH < 0
          ? true
          : cssWDelta >= 2 || cssHDelta >= 2;
      if (shouldResetForCssSize) {
        sim.lastCssW = cssW;
        sim.lastCssH = cssH;
        sim.poetryRaster = null;
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

      const openingElapsedMs = Math.max(0, now - effectStartMs);
      const openingPrimaryT = easeOutCubic(openingElapsedMs / OPENING_PRIMARY_MS);
      const particlesT = easeOutCubic(
        (openingElapsedMs - DETAILS_REVEAL_DELAY_MS) / PARTICLES_REVEAL_MS,
      );
      const midgroundT = easeOutCubic(
        (openingElapsedMs - MIDGROUND_REVEAL_DELAY_MS) / MIDGROUND_REVEAL_MS,
      );
      const foregroundT = easeOutCubic(
        (openingElapsedMs - FOREGROUND_REVEAL_DELAY_MS) / FOREGROUND_REVEAL_MS,
      );
      const bubblesT = easeOutCubic(
        (openingElapsedMs - BUBBLES_REVEAL_DELAY_MS) / BUBBLES_REVEAL_MS,
      );
      const poetryT = easeOutCubic(
        (openingElapsedMs - DETAILS_REVEAL_DELAY_MS) / POETRY_REVEAL_MS,
      );
      const wakeVeilT = easeOutCubic(
        (openingElapsedMs - WAKE_VEIL_DELAY_MS) / WAKE_VEIL_MS,
      );
      const heroFishCount = Math.min(4, n);
      const fishVisibleCount = openingElapsedMs < OPENING_PRIMARY_MS ? heroFishCount : n;

      drawUnderwaterBackground(
        ctx,
        cssW,
        cssH,
        ambienceNow,
        timeSec,
        sim,
        openingPrimaryT,
      );
      ctx.save();
      ctx.globalAlpha = 0.08 + particlesT * 0.72;
      drawDistantReef(ctx, cssW, cssH);
      drawDriftParticles(ctx, buf, ambienceNow);
      ctx.restore();
      const fam = poemFontFamilyRef.current;
      if ((fam && poemFontReadyRef.current) || !fam) {
        drawAquariumPoetryCached(
          ctx,
          sim,
          cssW,
          cssH,
          dpr,
          ambienceNow,
          fam ?? "ui-serif, Georgia, serif",
          poetryT,
        );
      }
      drawFishSchool(ctx, fish, timeSec, FISH_DEPTH_BACK, fishVisibleCount, cssW);
      if (midgroundT > 0.01) {
        ctx.save();
        ctx.globalAlpha = midgroundT;
        drawMidgroundRocksAndPlants(ctx, cssW, cssH, timeSec);
        ctx.restore();
      }
      drawFishSchool(ctx, fish, timeSec, FISH_DEPTH_MID, fishVisibleCount, cssW);
      if (foregroundT > 0.01) {
        ctx.save();
        ctx.globalAlpha = foregroundT;
        drawForegroundSeaweed(ctx, cssW, cssH, timeSec);
        ctx.restore();
      }
      drawFishSchool(ctx, fish, timeSec, FISH_DEPTH_FRONT, fishVisibleCount, cssW);
      if (bubblesT > 0.01) {
        ctx.save();
        ctx.globalAlpha = bubblesT;
        drawBubbles(ctx, buf, timeSec, cssW, cssH);
        drawPointerBubbles(ctx, pointerBubbles, timeSec, cssW, cssH);
        ctx.restore();
      }
      if (wakeVeilT < 0.999) {
        ctx.save();
        // A soft startup veil prevents the first paint from feeling abrupt.
        const veilAlpha = 1 - wakeVeilT;
        const cache = ensureAquariumPaintCache(
          ctx,
          cssW,
          cssH,
          ambienceNow,
          sim,
        );
        ctx.globalAlpha = veilAlpha;
        ctx.fillStyle =
          ambienceNow === "day" ? cache.wakeVeilDayGrad : cache.wakeVeilNightGrad;
        ctx.fillRect(0, 0, cssW, cssH);
        ctx.restore();
      }

      scheduleFrame();
    };

    scheduleFrame();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (rafId !== 0) cancelAnimationFrame(rafId);
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
