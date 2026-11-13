// Mentale Rotation – reine Logik: Würfelfiguren erzeugen, Chiralität sichern,
// Durchgänge bauen, Flächen für die Darstellung berechnen.
import { pick, randInt, type Rng } from '../../core/rng';
import { initStaircase, type StaircaseConfig, type StaircaseState } from '../../core/staircase';
import type { Summary, Trial } from '../../data/types';
import { baseMetrics } from '../metrics';

export type Vec = readonly [number, number, number];
/** 3×3-Matrix, zeilenweise. */
export type Mat3 = readonly number[];

// ---------- Lineare Algebra ----------

export function mul(a: Mat3, b: Mat3): Mat3 {
  const r: number[] = [];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) r.push(a[i * 3]! * b[j]! + a[i * 3 + 1]! * b[3 + j]! + a[i * 3 + 2]! * b[6 + j]!);
  return r;
}

export function apply(m: Mat3, v: Vec): Vec {
  return [
    m[0]! * v[0] + m[1]! * v[1] + m[2]! * v[2],
    m[3]! * v[0] + m[4]! * v[1] + m[5]! * v[2],
    m[6]! * v[0] + m[7]! * v[1] + m[8]! * v[2],
  ];
}

export function det(m: Mat3): number {
  return (
    m[0]! * (m[4]! * m[8]! - m[5]! * m[7]!) -
    m[1]! * (m[3]! * m[8]! - m[5]! * m[6]!) +
    m[2]! * (m[3]! * m[7]! - m[4]! * m[6]!)
  );
}

/** Drehung um eine Achse (Rodrigues); die Achse wird normiert. */
export function axisAngle(axis: Vec, degrees: number): Mat3 {
  const len = Math.hypot(...axis);
  const [x, y, z] = [axis[0] / len, axis[1] / len, axis[2] / len];
  const a = (degrees * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const t = 1 - c;
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ];
}

/** Die 24 Drehungen des Würfels (ganzzahlig, Determinante +1). */
export const ROTATIONS_24: Mat3[] = (() => {
  const out: Mat3[] = [];
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const p of perms)
    for (let signs = 0; signs < 8; signs++) {
      const m = new Array<number>(9).fill(0);
      for (let r = 0; r < 3; r++) m[r * 3 + p[r]!] = (signs >> r) & 1 ? -1 : 1;
      if (det(m) === 1) out.push(m);
    }
  return out;
})();

// ---------- Figuren ----------

/** Lageunabhängiger Schlüssel einer Würfelmenge (verschoben auf den Ursprung, sortiert). */
export function shapeKey(cells: readonly Vec[]): string {
  const min = [0, 1, 2].map((i) => Math.min(...cells.map((c) => c[i]!)));
  return cells
    .map((c) => `${c[0] - min[0]!},${c[1] - min[1]!},${c[2] - min[2]!}`)
    .sort()
    .join(';');
}

export function mirror(cells: readonly Vec[]): Vec[] {
  return cells.map(([x, y, z]) => [-x, y, z]);
}

/** Chiral = das Spiegelbild lässt sich durch KEINE der 24 Drehungen zur Deckung bringen. */
export function isChiral(cells: readonly Vec[]): boolean {
  const key = shapeKey(cells);
  const mirrored = mirror(cells);
  return !ROTATIONS_24.some((r) => shapeKey(mirrored.map((c) => apply(r, c))) === key);
}

const AXES: Vec[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

/**
 * Figur nach Shepard & Metzler: eine Kette aus `arms` geraden Armen (je 2–3 Würfel),
 * jeder Knick 90°. Garantiert: chiral, keine Selbstberührung.
 */
export function generateFigure(rng: Rng, arms: number): Vec[] {
  for (;;) {
    const cells: Vec[] = [[0, 0, 0]];
    const taken = new Set(['0,0,0']);
    let pos: Vec = [0, 0, 0];
    let prevAxis = -1;
    let ok = true;
    build: for (let a = 0; a < arms; a++) {
      const axis = pick(rng, [0, 1, 2].filter((i) => i !== prevAxis));
      const sign = rng() < 0.5 ? -1 : 1;
      prevAxis = axis;
      for (let n = randInt(rng, 2, 3); n > 0; n--) {
        const d = AXES[axis]!;
        const next: Vec = [pos[0] + sign * d[0], pos[1] + sign * d[1], pos[2] + sign * d[2]];
        // Der neue Würfel darf nur seinen Vorgänger berühren.
        const neighbours = AXES.flatMap((e) => [1, -1].map((s) => `${next[0] + s * e[0]},${next[1] + s * e[1]},${next[2] + s * e[2]}`)).filter((k) => taken.has(k)).length;
        if (neighbours !== 1) {
          ok = false;
          break build;
        }
        taken.add(next.join(','));
        cells.push(next);
        pos = next;
      }
    }
    if (ok && isChiral(cells)) return cells;
  }
}

// ---------- Darstellung ----------

export interface Face {
  /** Vier Eckpunkte in Bildkoordinaten (y nach unten), Einheit = Würfelkante. */
  points: [number, number][];
  depth: number;
  /** Helligkeit 0..1. */
  light: number;
}

const FACE_DIRS: Vec[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const LIGHT: Vec = [-0.35, 0.75, 0.56];

/** Radius der Kugel um den Schwerpunkt, die die Figur in jeder Drehlage enthält. */
export function boundingRadius(cells: readonly Vec[]): number {
  const c = centroid(cells);
  return Math.max(...cells.map((v) => Math.hypot(v[0] - c[0], v[1] - c[1], v[2] - c[2]))) + Math.sqrt(0.75);
}

function centroid(cells: readonly Vec[]): Vec {
  const n = cells.length;
  return [0, 1, 2].map((i) => cells.reduce((s, c) => s + c[i]!, 0) / n) as unknown as Vec;
}

/**
 * Sichtbare Würfelflächen in Parallelprojektion, von hinten nach vorn sortiert
 * (Maleralgorithmus). Innenflächen und abgewandte Flächen entfallen.
 */
export function renderFaces(cells: readonly Vec[], view: Mat3): Face[] {
  const taken = new Set(cells.map((c) => c.join(',')));
  const mid = centroid(cells);
  const faces: Face[] = [];
  for (const c of cells)
    for (const d of FACE_DIRS) {
      if (taken.has(`${c[0] + d[0]},${c[1] + d[1]},${c[2] + d[2]}`)) continue;
      const normal = apply(view, d);
      if (normal[2] <= 1e-9) continue; // Betrachter schaut entlang −z
      const [u, v] = AXES.filter((e) => e[0] * d[0] + e[1] * d[1] + e[2] * d[2] === 0) as [Vec, Vec];
      const centre: Vec = [c[0] - mid[0] + d[0] / 2, c[1] - mid[1] + d[1] / 2, c[2] - mid[2] + d[2] / 2];
      const points = ([[1, 1], [1, -1], [-1, -1], [-1, 1]] as const).map(([a, b]) => {
        const p = apply(view, [
          centre[0] + (a * u[0] + b * v[0]) / 2,
          centre[1] + (a * u[1] + b * v[1]) / 2,
          centre[2] + (a * u[2] + b * v[2]) / 2,
        ]);
        return [p[0], -p[1]] as [number, number];
      });
      const lit = Math.max(0, normal[0] * LIGHT[0] + normal[1] * LIGHT[1] + normal[2] * LIGHT[2]);
      faces.push({ points, depth: apply(view, centre)[2], light: 0.25 + 0.75 * lit });
    }
  return faces.sort((a, b) => a.depth - b.depth);
}

// ---------- Schwierigkeit und Durchgänge ----------

export const MAX_LEVEL = 12;

export const STAIRCASE: StaircaseConfig = {
  start: 1,
  min: 1,
  max: MAX_LEVEL,
  down: 3,
  steps: [2, 1],
  scale: 'add',
  harder: 'up',
};

export interface RotationState {
  stair: StaircaseState;
}

export const initialState = (): RotationState => ({ stair: initStaircase(STAIRCASE) });
export const levelOf = (state: RotationState): number => Math.round(state.stair.value);

/** Was ein Level bedeutet: mehr Arme, größere Winkel, Drehung erst in der Bildebene, dann in die Tiefe. */
export function paramsFor(level: number) {
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.round(level)));
  const maxAngle = Math.min(180, 45 + 15 * l);
  return {
    level: l,
    arms: l <= 3 ? 3 : l <= 8 ? 4 : 5,
    axes: l <= 2 ? ('picture' as const) : l <= 5 ? ('screen' as const) : ('free' as const),
    minAngle: Math.max(30, maxAngle - 45),
    maxAngle,
  };
}

/** Grundansicht: leicht von schräg oben, damit keine Achse auf den Betrachter zeigt. */
export const BASE_VIEW: Mat3 = mul(axisAngle([1, 0, 0], 24), axisAngle([0, 1, 0], -34));

/** Größter erlaubter z-Anteil einer Figurenachse (0,8 ≙ Arme behalten ≥ 60 % ihrer Länge im Bild). */
export const MAX_TILT = 0.8;

export interface RotationTrial {
  level: number;
  cells: Vec[];
  /** Ansicht des Vorbilds. */
  ref: Mat3;
  /** Ansichten der beiden Antworten. */
  options: [Mat3, Mat3];
  /** Drehwinkel der beiden Antworten gegenüber dem Vorbild (Grad). */
  angles: [number, number];
  /** Index der Antwort, die dieselbe Figur zeigt; die andere zeigt das Spiegelbild. */
  correct: 0 | 1;
}

function optionView(rng: Rng, p: ReturnType<typeof paramsFor>, ref: Mat3): { view: Mat3; angle: number } {
  for (;;) {
    const z = 2 * rng() - 1;
    const phi = 2 * Math.PI * rng();
    const axis: Vec =
      p.axes === 'picture' ? [0, 0, 1]
      : p.axes === 'screen' ? (rng() < 0.5 ? [0, 1, 0] : [1, 0, 0])
      : [Math.sqrt(1 - z * z) * Math.cos(phi), Math.sqrt(1 - z * z) * Math.sin(phi), z];
    const angle = (p.minAngle + rng() * (p.maxAngle - p.minAngle)) * (rng() < 0.5 ? -1 : 1);
    const view = mul(axisAngle(axis, angle), ref);
    // Keine Figurenachse darf steil auf den Betrachter zeigen – sonst schrumpft ein Arm zum Punkt
    // und die Aufgabe wird mehrdeutig statt schwer.
    if (Math.max(Math.abs(view[6]!), Math.abs(view[7]!), Math.abs(view[8]!)) < MAX_TILT) return { view, angle: Math.abs(angle) };
  }
}

export function makeTrial(rng: Rng, level: number): RotationTrial {
  const p = paramsFor(level);
  const cells = generateFigure(rng, p.arms);
  const ref = mul(BASE_VIEW, pick(rng, ROTATIONS_24));
  const same = optionView(rng, p, ref);
  const other = optionView(rng, p, ref);
  const correct = rng() < 0.5 ? 0 : 1;
  const [a, b] = correct === 0 ? [same, other] : [other, same];
  return { level: p.level, cells, ref, options: [a.view, b.view], angles: [a.angle, b.angle], correct };
}

// ---------- Wertung ----------

export function summarize(trials: Trial[], state: RotationState): Summary {
  const base = baseMetrics(trials);
  const right = trials.filter((t) => t.correct);
  const score = right.reduce((sum, t) => sum + 10 * t.difficulty, 0);
  return {
    ...base,
    score,
    level: levelOf(state),
    headline: { label: 'Punkte', value: String(score) },
    extra: [{ label: 'Richtig', value: `${right.length} von ${trials.length}` }],
  };
}
