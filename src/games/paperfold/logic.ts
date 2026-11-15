// Papierfalten – reine Logik: Blatt falten, lochen, entfalten, Antwortmöglichkeiten bauen.
//
// Modell: Das Blatt ist das Quadrat [0, SIZE]². Gefaltet wird nur an Linien des 4er-Rasters
// (x = 4k, y = 4k, x + y = 4k, x − y = 4k). Lochungen liegen auf einem Punktgitter (LATTICE),
// das jede dieser Spiegelungen in sich überführt und keine Faltlinie berührt – ein Loch liegt
// also nie auf einer Kante, und alle Koordinaten bleiben ganzzahlig (exakte Rechnung).
import { pick, randInt, shuffle, type Rng } from '../../core/rng';
import { initStaircase, type StaircaseConfig, type StaircaseState } from '../../core/staircase';
import type { Summary, Trial } from '../../data/types';
import { baseMetrics } from '../metrics';

export type Point = readonly [number, number];

/** Kantenlänge des Blatts. */
export const SIZE = 16;
/** Abstand der Faltlinien. */
export const GRID = 4;

/**
 * Faltung an der Linie a·x + b·y = c. Umgeklappt wird die Seite, auf der
 * side · (a·x + b·y − c) > 0 gilt; die andere bleibt liegen. y wächst nach unten.
 */
export interface Fold {
  a: 0 | 1;
  b: -1 | 0 | 1;
  c: number;
  side: 1 | -1;
}

const DIRECTIONS: { a: 0 | 1; b: -1 | 0 | 1 }[] = [{ a: 1, b: 0 }, { a: 0, b: 1 }, { a: 1, b: 1 }, { a: 1, b: -1 }];
const isDiagonal = (f: { a: number; b: number }): boolean => f.a !== 0 && f.b !== 0;
const offset = (f: Fold, p: Point): number => f.a * p[0] + f.b * p[1] - f.c;

/** Spiegelbild eines Punkts an der Faltlinie. */
export function reflect(f: Fold, p: Point): Point {
  const k = (2 * offset(f, p)) / (f.a * f.a + f.b * f.b);
  return [p[0] - k * f.a, p[1] - k * f.b];
}

/** Alle möglichen Lochpositionen: je Rasterfeld vier Punkte, jeweils mitten in einem Randdreieck. */
export const LATTICE: Point[] = (() => {
  const points: Point[] = [];
  for (let cy = 0; cy < SIZE; cy += GRID)
    for (let cx = 0; cx < SIZE; cx += GRID)
      for (const [dx, dy] of [[2, 1], [1, 2], [3, 2], [2, 3]] as const) points.push([cx + dx, cy + dy]);
  return points;
})();

// ---------- Blatt und Lagen ----------

/** Gefaltetes Blatt: Lagen (konvexe Vielecke) von unten nach oben. */
export interface Sheet {
  layers: Point[][];
  /** So viele der obersten Lagen wurden bei der letzten Faltung umgeklappt. */
  flap: number;
}

export const flatSheet = (): Sheet => ({ layers: [[[0, 0], [SIZE, 0], [SIZE, SIZE], [0, SIZE]]], flap: 0 });

function area(poly: readonly Point[]): number {
  let twice = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    twice += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(twice) / 2;
}

/** Teil des Vielecks auf der Seite sign · offset ≥ 0 (Sutherland–Hodgman). */
function clip(poly: readonly Point[], f: Fold, sign: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    const vp = sign * offset(f, p);
    const vq = sign * offset(f, q);
    if (vp >= 0) out.push(p);
    if ((vp > 0 && vq < 0) || (vp < 0 && vq > 0)) {
      const t = vp / (vp - vq);
      // Schnittpunkte von Rasterlinien sind ganzzahlig – Runden entfernt nur Gleitkomma-Rauschen.
      out.push([Math.round(p[0] + t * (q[0] - p[0])), Math.round(p[1] + t * (q[1] - p[1]))]);
    }
  }
  return out;
}

/** Faltet alle Lagen: Was auf der bewegten Seite liegt, klappt gespiegelt obenauf. */
export function foldSheet(sheet: Sheet, f: Fold): Sheet {
  const stay = sheet.layers.map((l) => clip(l, f, -f.side)).filter((l) => area(l) > 0);
  const moved = sheet.layers
    .map((l) => clip(l, f, f.side))
    .filter((l) => area(l) > 0)
    .map((l) => l.map((p) => reflect(f, p)))
    .reverse(); // beim Umklappen kehrt sich die Reihenfolge der Lagen um
  return { layers: [...stay, ...moved], flap: moved.length };
}

/** Zustände des Blatts: [flach, nach Faltung 1, nach Faltung 2, …]. */
export function sheetsOf(folds: readonly Fold[]): Sheet[] {
  const sheets = [flatSheet()];
  for (const f of folds) sheets.push(foldSheet(sheets.at(-1)!, f));
  return sheets;
}

function inside(poly: readonly Point[], p: Point): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (cross === 0) return false;
    if (sign !== 0 && Math.sign(cross) !== sign) return false;
    sign = Math.sign(cross);
  }
  return true;
}

/** Zahl der Papierlagen an einem Punkt. */
export const layersAt = (sheet: Sheet, p: Point): number => sheet.layers.filter((l) => inside(l, p)).length;

// ---------- Entfalten ----------

const byPosition = (p: Point, q: Point): number => p[1] - q[1] || p[0] - q[0];

/** Eindeutiger Schlüssel eines Lochmusters (Reihenfolge egal). */
export const keyOf = (holes: readonly Point[]): string => [...holes].sort(byPosition).map((p) => p.join(',')).join(' ');

type Slip = { fold: number; only: 'stay' | 'move' };

/**
 * Rückwärts durch die Faltungen: Ein Loch bleibt, wo beim Aufklappen Papier liegen bleibt, und
 * entsteht gespiegelt dort, wohin die Lasche zurückklappt. Liefert das Lochmuster in jedem
 * Zustand: [aufgeklappt, nach Faltung 1, …, ganz gefaltet].
 */
function trace(folds: readonly Fold[], sheets: readonly Sheet[], punches: readonly Point[], slip?: Slip): Point[][] {
  const states: Point[][] = [[...punches].sort(byPosition)];
  for (let k = folds.length - 1; k >= 0; k--) {
    const before = sheets[k]!;
    const next: Point[] = [];
    for (const h of states[0]!) {
      const mirrored = reflect(folds[k]!, h);
      const only = slip?.fold === k ? slip.only : null;
      if (only !== 'move' && layersAt(before, h) > 0) next.push(h);
      if (only !== 'stay' && layersAt(before, mirrored) > 0) next.push(mirrored);
    }
    states.unshift(next.sort(byPosition));
  }
  return states;
}

/**
 * Lochmuster des aufgeklappten Blatts.
 *
 * @param sheets Zustände aus `sheetsOf(folds)`
 * @param slip   für Distraktoren: bei dieser Faltung nur die liegende (`stay`) oder nur die
 *               umgeklappte (`move`) Lage lochen – der typische Denkfehler.
 */
export const unfold = (folds: readonly Fold[], sheets: readonly Sheet[], punches: readonly Point[], slip?: Slip): Point[] =>
  trace(folds, sheets, punches, slip)[0]!;

/** Für die Auflösung: die Löcher in jedem Faltzustand, passend zu `sheetsOf(folds)`. */
export const holesBySheet = (folds: readonly Fold[], sheets: readonly Sheet[], punches: readonly Point[]): Point[][] =>
  trace(folds, sheets, punches);

// ---------- Schwierigkeit ----------

export const MAX_LEVEL = 10;

/** 2-down-1-up: je Lauf gibt es nur zwölf Durchgänge. */
export const STAIRCASE: StaircaseConfig = {
  start: 1,
  min: 1,
  max: MAX_LEVEL,
  down: 2,
  steps: [2, 1],
  scale: 'add',
  harder: 'up',
};

export interface PaperState {
  stair: StaircaseState;
}

export const initialState = (): PaperState => ({ stair: initStaircase(STAIRCASE) });
export const levelOf = (state: PaperState): number => Math.round(state.stair.value);

const LEVELS = [
  { folds: 1, diagonal: false, halves: true, punches: 1, subtle: false },
  { folds: 1, diagonal: false, halves: false, punches: 1, subtle: false },
  { folds: 1, diagonal: true, halves: false, punches: 1, subtle: false },
  { folds: 2, diagonal: false, halves: false, punches: 1, subtle: false },
  { folds: 2, diagonal: false, halves: false, punches: 2, subtle: false },
  { folds: 2, diagonal: true, halves: false, punches: 1, subtle: true },
  { folds: 2, diagonal: true, halves: false, punches: 2, subtle: true },
  { folds: 3, diagonal: false, halves: false, punches: 1, subtle: true },
  { folds: 3, diagonal: true, halves: false, punches: 1, subtle: true },
  { folds: 3, diagonal: true, halves: false, punches: 2, subtle: true },
] as const;

/**
 * Was ein Level bedeutet: mehr Faltungen, dann Diagonalen, dann zwei Lochungen.
 * `halves` = nur Faltungen genau zur Hälfte; `subtle` = falsche Antworten weichen nur wenig ab.
 */
export function paramsFor(level: number) {
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.round(level)));
  return { level: l, ...LEVELS[l - 1]! };
}

// ---------- Durchgänge ----------

export interface PaperTrial {
  level: number;
  folds: Fold[];
  /** Lochungen im gefalteten Blatt. */
  punches: Point[];
  /** Vier Lochmuster des aufgeklappten Blatts. */
  options: Point[][];
  /** Index des richtigen Musters. */
  correct: number;
}

/** Mehr Löcher machen das Vergleichen mühsam, nicht das Falten schwerer. */
const MAX_HOLES = 8;

/**
 * Erlaubte Faltungen: Die Linie teilt das Papier, bewegt wird höchstens die Hälfte und mindestens
 * ein Sechzehntel, und die Lasche bleibt im Umriss des Blatts.
 */
function possibleFolds(sheet: Sheet, kind: 'straight' | 'diagonal', halves: boolean): Fold[] {
  const total = SIZE * SIZE;
  const out: Fold[] = [];
  for (const d of DIRECTIONS) {
    if (isDiagonal(d) !== (kind === 'diagonal')) continue;
    for (let c = -SIZE; c <= 2 * SIZE; c += GRID)
      for (const side of [1, -1] as const) {
        const f: Fold = { ...d, c, side };
        const moving = sheet.layers.reduce((sum, l) => sum + area(clip(l, f, side)), 0);
        if (moving < total / 16 || moving > total / 2 || (halves && moving !== total / 2)) continue;
        const fits = foldSheet(sheet, f).layers.every((l) => l.every(([x, y]) => x >= 0 && x <= SIZE && y >= 0 && y <= SIZE));
        if (fits) out.push(f);
      }
  }
  return out;
}

function makeFolds(rng: Rng, p: ReturnType<typeof paramsFor>): Fold[] | null {
  // Auf Diagonal-Leveln ist eine zufällige Faltung sicher diagonal, die übrigen sind frei.
  const forced = p.diagonal ? randInt(rng, 0, p.folds - 1) : -1;
  const folds: Fold[] = [];
  let sheet = flatSheet();
  for (let i = 0; i < p.folds; i++) {
    const kind = i === forced || (p.diagonal && rng() < 0.3) ? 'diagonal' : 'straight';
    const choices = possibleFolds(sheet, kind, p.halves);
    if (choices.length === 0) return null;
    const f = pick(rng, choices);
    folds.push(f);
    sheet = foldSheet(sheet, f);
  }
  return folds;
}

function makePunches(rng: Rng, folded: Sheet, count: number): Point[] | null {
  const spots = LATTICE.filter((p) => layersAt(folded, p) > 0);
  for (let attempt = 0; attempt < 20; attempt++) {
    const punches = shuffle(rng, spots).slice(0, count);
    const layers = punches.map((p) => layersAt(folded, p));
    const holes = layers.reduce((a, b) => a + b, 0);
    // Mindestens eine Lochung geht durch mehrere Lagen – sonst spielt das Falten keine Rolle.
    if (punches.length === count && Math.max(...layers) >= 2 && holes <= MAX_HOLES) return punches;
  }
  return null;
}

/** Die sieben Spiegelungen und Drehungen des Blatts (ohne die Identität). */
const SYMMETRIES: ((p: Point) => Point)[] = [
  ([x, y]) => [SIZE - x, y],
  ([x, y]) => [x, SIZE - y],
  ([x, y]) => [SIZE - x, SIZE - y],
  ([x, y]) => [y, x],
  ([x, y]) => [SIZE - y, SIZE - x],
  ([x, y]) => [y, SIZE - x],
  ([x, y]) => [SIZE - y, x],
];

/** Ein Loch wandert auf einen freien Gitterpunkt in der Nähe. */
function nudge(rng: Rng, holes: readonly Point[]): Point[] {
  const taken = new Set(holes.map((p) => p.join(',')));
  const index = randInt(rng, 0, holes.length - 1);
  const from = holes[index]!;
  const near = LATTICE.filter((p) => !taken.has(p.join(',')) && Math.max(Math.abs(p[0] - from[0]), Math.abs(p[1] - from[1])) <= 3);
  return holes.map((p, i) => (i === index ? pick(rng, near) : p));
}

/**
 * Drei falsche Muster – jedes ungleich der Lösung und ungleich den anderen (Vergleich über `keyOf`).
 * Quellen: eine Faltung nur halb mitgedacht, das ganze Muster falsch gespiegelt, ein Loch versetzt.
 */
function distractors(rng: Rng, folds: Fold[], sheets: Sheet[], punches: Point[], answer: Point[], subtle: boolean): Point[][] {
  const slips = folds.flatMap((_, fold) => (['stay', 'move'] as const).map((only) => unfold(folds, sheets, punches, { fold, only })));
  const flips = SYMMETRIES.map((s) => answer.map(s));
  const plausible = shuffle(rng, [...slips, ...flips]);
  // Auf hohen Leveln zuerst zwei Muster, die sich nur in einem Loch unterscheiden.
  const pool = subtle ? [nudge(rng, answer), nudge(rng, answer), ...plausible] : plausible;
  const seen = new Set([keyOf(answer)]);
  const out: Point[][] = [];
  for (let i = 0; out.length < 3; i++) {
    const candidate = pool[i] ?? nudge(rng, answer);
    const key = keyOf(candidate);
    if (candidate.length === 0 || seen.has(key)) continue;
    seen.add(key);
    out.push([...candidate].sort(byPosition));
  }
  return out;
}

export function makeTrial(rng: Rng, level: number): PaperTrial {
  const p = paramsFor(level);
  for (;;) {
    const folds = makeFolds(rng, p);
    if (!folds) continue;
    const sheets = sheetsOf(folds);
    const punches = makePunches(rng, sheets.at(-1)!, p.punches);
    if (!punches) continue;
    const answer = unfold(folds, sheets, punches);
    const options = distractors(rng, folds, sheets, punches, answer, p.subtle);
    const correct = randInt(rng, 0, 3);
    options.splice(correct, 0, answer);
    return { level: p.level, folds, punches, options, correct };
  }
}

// ---------- Wertung ----------

export function summarize(trials: Trial[], state: PaperState): Summary {
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
