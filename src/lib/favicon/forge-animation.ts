/**
 * "Strike & Temper" — the animated tab icon.
 *
 * A red-hot résumé on the anvil takes three hammer blows, each cooling it a
 * shade; the third and hardest quenches it to forest green, its lines write
 * in, and it reheats for the next loop. Browsers don't animate favicons on
 * their own (Chrome/Edge ignore animated SVG and GIF icons), so the scene is
 * drawn to a canvas frame by frame and swapped in as the icon.
 *
 * `sceneAt` is pure — where everything is at a point in the loop — so it is
 * unit-testable; `drawScene` paints a scene into a 32×32 coordinate space.
 * Geometry matches the static icon and the design canvas exploration.
 */

/** One full loop. */
export const CYCLE_MS = 4200;

/** Keyframe stops: [percent of the loop, value]. */
type Stops = readonly (readonly [number, number])[];

const smooth = (x: number) => x * x * (3 - 2 * x);

/** The value of a track at loop position `p` (0–100), eased between stops. */
function track(stops: Stops, p: number): number {
  if (p <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [p1, v1] = stops[i];
    if (p <= p1) {
      const [p0, v0] = stops[i - 1];
      const span = p1 - p0;
      return span === 0 ? v1 : v0 + (v1 - v0) * smooth((p - p0) / span);
    }
  }
  return stops[stops.length - 1][1];
}

type Rgb = readonly [number, number, number];
const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** A colour track: linear in RGB between stops. */
function colorTrack(stops: readonly (readonly [number, string])[], p: number): string {
  const rgb = [0, 1, 2].map((c) => Math.round(track(stops.map(([s, h]) => [s, hex(h)[c]] as const), p)));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

// The blows land at 18%, 36% and 54% of the loop.
const HAMMER: Stops = [
  [0, 30], [10, 34], [18, -25], [22, -18], [24, -25],
  [32, 34], [36, -25], [40, -18], [42, -25],
  [50, 38], [54, -25], [58, -16], [61, -25], [72, 30], [100, 30],
];
const SPARK_OPACITY: Stops = [
  [0, 0], [17.5, 0], [18.5, 1], [24, 0], [35.5, 0], [36.5, 1], [42, 0], [53.5, 0], [54.5, 1], [63, 0], [100, 0],
];
const SPARK_SCALE: Stops = [
  [0, 0.2], [17.5, 0.2], [18.5, 0.6], [24, 1.1], [35.5, 0.2], [36.5, 0.7], [42, 1.2], [53.5, 0.2], [54.5, 0.95], [63, 1.7], [100, 0.2],
];
const HEAT = [
  [0, "#FF4D1F"], [17.5, "#FF4D1F"], [20, "#FF7A1F"], [35.5, "#FF7A1F"], [38, "#F2A23A"], [53.5, "#F2A23A"],
  [56, "#FFD27A"], [64, "#2FBF71"], [94, "#2FBF71"], [97, "#FF4D1F"], [100, "#FF4D1F"],
] as const;
const FOLD = [
  [0, "#FFD0A0"], [35.5, "#FFD0A0"], [38, "#FFE2B0"], [53.5, "#FFE2B0"], [64, "#B9F0D0"], [94, "#B9F0D0"], [97, "#FFD0A0"], [100, "#FFD0A0"],
] as const;
const GLOW: Stops = [[0, 0.9], [17.5, 0.9], [20, 0.6], [35.5, 0.6], [38, 0.3], [53.5, 0.3], [60, 0], [94, 0], [97, 0.9], [100, 0.9]];
const SQUASH_X: Stops = [
  [0, 1], [17.5, 1], [18.5, 1.05], [21, 1], [35.5, 1], [36.5, 1.05], [39, 1], [53.5, 1], [54.5, 1.08], [58, 0.98], [61, 1], [100, 1],
];
const SQUASH_Y: Stops = [
  [0, 1], [17.5, 1], [18.5, 0.92], [21, 1], [35.5, 1], [36.5, 0.92], [39, 1], [53.5, 1], [54.5, 0.88], [58, 1.03], [61, 1], [100, 1],
];
const AVATAR: Stops = [[0, 0], [62, 0], [67, 1], [94, 1], [97, 0], [100, 0]];
const LINES: Stops[] = [
  [[0, 0], [64, 0], [70, 1], [94, 1], [97, 0], [100, 0]],
  [[0, 0], [66, 0], [72, 1], [94, 1], [97, 0], [100, 0]],
  [[0, 0], [68, 0], [74, 1], [94, 1], [97, 0], [100, 0]],
];

export interface ForgeScene {
  /** Hammer rotation in degrees about its grip; −25 is on the anvil. */
  hammerAngle: number;
  sparkOpacity: number;
  sparkScale: number;
  /** The page's colour: red-hot → orange → amber → forest green. */
  docColor: string;
  foldColor: string;
  glowOpacity: number;
  squashX: number;
  squashY: number;
  avatarScale: number;
  /** How far each of the three text lines has written in, 0–1. */
  lines: [number, number, number];
}

/** Where everything is at loop position `t` (0 ≤ t < 1, wraps). */
export function sceneAt(t: number): ForgeScene {
  const p = (((t % 1) + 1) % 1) * 100;
  return {
    hammerAngle: track(HAMMER, p),
    sparkOpacity: track(SPARK_OPACITY, p),
    sparkScale: track(SPARK_SCALE, p),
    docColor: colorTrack(HEAT, p),
    foldColor: colorTrack(FOLD, p),
    glowOpacity: track(GLOW, p),
    squashX: track(SQUASH_X, p),
    squashY: track(SQUASH_Y, p),
    avatarScale: track(AVATAR, p),
    lines: [track(LINES[0], p), track(LINES[1], p), track(LINES[2], p)],
  };
}

/**
 * Loop positions of the story's beats — red-hot, a blow landing, the
 * third blow's sparks, quenched, written. A background tab only updates its
 * icon about once a second, so there the beats are shown as a slideshow
 * instead of a stuttering animation.
 */
export const KEY_MOMENTS = [0.05, 0.19, 0.55, 0.65, 0.85] as const;

// Paths in the icon's 32×32 space (same as public/ and the design canvas).
const TILE = "M7 0h18a7 7 0 0 1 7 7v18a7 7 0 0 1-7 7H7a7 7 0 0 1-7-7V7a7 7 0 0 1 7-7z";
const ANVIL = "M4 12h22v4.5h-3.5c-1.6 0-2.5 1-2.5 2.5V21h3v4H9v-4h3v-2c0-1.5-0.9-2.5-2.5-2.5H8.5C6 16.5 4.5 14.8 4 12z";
const DOC = "M10 5h9l4 4v15a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z";
const FOLD_PATH = "M19 5v3a1 1 0 0 0 1 1h3z";
const SPARK = "M16 3.5v5M16 23.5v5M3.5 16h5M23.5 16h5M7.2 7.2l3.5 3.5M21.3 21.3l3.5 3.5M24.8 7.2l-3.5 3.5M10.7 21.3l-3.5 3.5";

const BG = "#163A2E";
const GREEN = "#2FBF71";
const MINT = "#B9F0D0";
const WHITE = "#FFFFFF";

let paths: Record<"tile" | "anvil" | "doc" | "fold" | "spark", Path2D> | null = null;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Paint `scene` into the current 32×32 coordinate space of `ctx`. */
export function drawScene(ctx: CanvasRenderingContext2D, s: ForgeScene): void {
  paths ??= {
    tile: new Path2D(TILE),
    anvil: new Path2D(ANVIL),
    doc: new Path2D(DOC),
    fold: new Path2D(FOLD_PATH),
    spark: new Path2D(SPARK),
  };
  ctx.clearRect(0, 0, 32, 32);
  ctx.save();
  ctx.clip(paths.tile);
  ctx.fillStyle = BG;
  ctx.fill(paths.tile);

  // Anvil.
  ctx.save();
  ctx.translate(1, 3);
  ctx.fillStyle = WHITE;
  ctx.fill(paths.anvil);
  ctx.restore();

  // The page, squashed from its bottom edge when a blow lands.
  ctx.save();
  ctx.translate(7.6, 0.6);
  ctx.scale(0.55, 0.55);
  ctx.translate(15.5, 26);
  ctx.scale(s.squashX, s.squashY);
  ctx.translate(-15.5, -26);
  if (s.glowOpacity > 0.01) {
    ctx.globalAlpha = s.glowOpacity * 0.55;
    ctx.strokeStyle = "#FF6A2B";
    ctx.lineWidth = 3.2;
    ctx.stroke(paths.doc);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = s.docColor;
  ctx.fill(paths.doc);
  ctx.fillStyle = s.foldColor;
  ctx.fill(paths.fold);
  ctx.fillStyle = WHITE;
  if (s.avatarScale > 0.01) {
    ctx.beginPath();
    ctx.arc(12.5, 10.5, 2 * s.avatarScale, 0, Math.PI * 2);
    ctx.fill();
  }
  const lines: [number, number, number][] = [
    [15, 9, s.lines[0]],
    [18.5, 9, s.lines[1]],
    [22, 5.5, s.lines[2]],
  ];
  for (const [y, width, progress] of lines) {
    if (progress > 0.01) {
      roundRect(ctx, 11, y, Math.max(1.6, width * progress), 1.6, 0.8);
      ctx.fill();
    }
  }
  ctx.restore();

  // Hammer, pivoting on its grip at (28, 27).
  ctx.save();
  ctx.translate(28, 27);
  ctx.rotate((s.hammerAngle * Math.PI) / 180);
  ctx.translate(-28, -27);
  ctx.fillStyle = MINT;
  roundRect(ctx, 27, 13, 2, 14, 1);
  ctx.fill();
  ctx.fillStyle = WHITE;
  roundRect(ctx, 23.5, 9, 9, 4.5, 1.2);
  ctx.fill();
  ctx.fillStyle = GREEN;
  ctx.fillRect(23.5, 12, 9, 0.9);
  ctx.restore();

  // Sparks where the hammer lands.
  if (s.sparkOpacity > 0.01) {
    ctx.save();
    ctx.globalAlpha = s.sparkOpacity;
    ctx.translate(19, 13);
    ctx.scale(0.5 * s.sparkScale, 0.5 * s.sparkScale);
    ctx.translate(-16, -16);
    ctx.strokeStyle = "#FFC24B";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke(paths.spark);
    ctx.fillStyle = "#FFE29A";
    ctx.beginPath();
    ctx.arc(16, 16, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
