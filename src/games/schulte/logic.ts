// Zahlensuche (Schulte-Tabelle): Zahlen auf einer gemischten Tafel in vorgegebener Reihenfolge antippen.
// Ein Durchgang ist eine ganze Tafel; „richtig“ heißt: in der Zielzeit geschafft.
import { shuffle, type Rng } from '../../core/rng';
import { initStaircase, type StaircaseConfig, type StaircaseState } from '../../core/staircase';
import type { Summary, Trial } from '../../data/types';
import { median } from '../metrics';

/** up: 1, 2, 3 … · down: N, N−1 … · alt: abwechselnd kleinste und größte (1, N, 2, N−1 …). */
export type Order = 'up' | 'down' | 'alt';

export interface BoardParams {
  cols: number;
  rows: number;
  order: Order;
}

/** Level 1–7: die Tafel wächst von 3×3 auf 6×6. Danach bleibt sie groß und die Reihenfolge wird schwerer. */
export const LEVELS: readonly BoardParams[] = [
  { cols: 3, rows: 3, order: 'up' },
  { cols: 3, rows: 4, order: 'up' },
  { cols: 4, rows: 4, order: 'up' },
  { cols: 4, rows: 5, order: 'up' },
  { cols: 5, rows: 5, order: 'up' },
  { cols: 5, rows: 6, order: 'up' },
  { cols: 6, rows: 6, order: 'up' },
  { cols: 6, rows: 6, order: 'down' },
  { cols: 6, rows: 6, order: 'alt' },
];

/** 2-down-1-up, weil ein Lauf nur drei Tafeln hat; anfangs in Zweierschritten. */
export const STAIRCASE: StaircaseConfig = {
  start: 1,
  min: 1,
  max: LEVELS.length,
  down: 2,
  steps: [2, 1],
  scale: 'add',
  harder: 'up',
};

export interface SchulteState {
  stair: StaircaseState;
}

export const initialState = (): SchulteState => ({ stair: initStaircase(STAIRCASE) });
export const levelOf = (s: SchulteState): number => Math.round(s.stair.value);

export interface SchulteTrial extends BoardParams {
  level: number;
  /** Zahlen zeilenweise von links oben. */
  cells: number[];
}

export function makeBoard(rng: Rng, params: BoardParams): Omit<SchulteTrial, 'level'> {
  const count = params.cols * params.rows;
  return { ...params, cells: shuffle(rng, Array.from({ length: count }, (_, i) => i + 1)) };
}

export function makeTrial(rng: Rng, level: number): SchulteTrial {
  const clamped = Math.min(LEVELS.length, Math.max(1, Math.round(level)));
  return { level: clamped, ...makeBoard(rng, LEVELS[clamped - 1]!) };
}

/** Die Zahlen in der Reihenfolge, in der sie anzutippen sind. */
export function sequence(count: number, order: Order): number[] {
  return Array.from({ length: count }, (_, i) => {
    if (order === 'up') return i + 1;
    if (order === 'down') return count - i;
    return i % 2 === 0 ? i / 2 + 1 : count - (i - 1) / 2;
  });
}

/** Die Zahl, die nach `found` gefundenen dran ist; null = Tafel fertig. */
export function nextTarget(trial: BoardParams, found: number): number | null {
  return sequence(trial.cols * trial.rows, trial.order)[found] ?? null;
}

/** Ein Tipp: angetippte Zahl und Zeit seit Erscheinen der Tafel in ms. */
export interface Tap {
  n: number;
  t: number;
}

export interface Replay {
  found: number;
  errors: number;
  done: boolean;
  /** Zeitpunkt des letzten nötigen Tipps; null, solange die Tafel nicht fertig ist. */
  timeMs: number | null;
  /** Zeit je gefundener Zahl (seit der vorigen bzw. seit Erscheinen der Tafel). */
  gaps: number[];
}

/** Spielt die Tipps nach – die einzige Stelle, die entscheidet, was ein Treffer ist. */
export function replay(trial: BoardParams, taps: readonly Tap[]): Replay {
  const order = sequence(trial.cols * trial.rows, trial.order);
  const gaps: number[] = [];
  let errors = 0;
  let last = 0;
  for (const tap of taps) {
    if (gaps.length === order.length) break;
    if (tap.n !== order[gaps.length]) {
      errors++;
      continue;
    }
    gaps.push(tap.t - last);
    last = tap.t;
  }
  const done = gaps.length === order.length;
  return { found: gaps.length, errors, done, timeMs: done ? last : null, gaps };
}

const PAR_PER_NUMBER_MS = 1000;
const PAR_START_MS = 1000;

/**
 * Zielzeit einer Tafel: eine Sekunde je Zahl, plus eine zum Orientieren. Weil die Suche auf großen
 * Tafeln je Zahl länger dauert, wird dasselbe Tempo mit jedem Level schwerer zu halten.
 */
export function parMs(trial: Pick<BoardParams, 'cols' | 'rows'>): number {
  return trial.cols * trial.rows * PAR_PER_NUMBER_MS + PAR_START_MS;
}

export function isPassed(trial: BoardParams, taps: readonly Tap[]): boolean {
  const { timeMs } = replay(trial, taps);
  return timeMs !== null && timeMs <= parMs(trial);
}

/** Punkte einer fertigen Tafel: 10 je Zahl bei Zielzeit, bis doppelt so viele bei doppeltem Tempo. */
export function points(trial: Pick<BoardParams, 'cols' | 'rows'>, timeMs: number): number {
  const pace = Math.min(2, Math.max(0.5, parMs(trial) / timeMs));
  return Math.round(trial.cols * trial.rows * 10 * pace);
}

export const kindOf = (trial: BoardParams): string =>
  `${trial.cols}x${trial.rows}${trial.order === 'up' ? '' : `-${trial.order}`}`;

export const seconds = (ms: number): string => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;

export function summarize(trials: Trial[], state: SchulteState): Summary {
  const boards = trials.map((t) => {
    const task = t.task as SchulteTrial;
    return { task, ...replay(task, (t.response as { taps: Tap[] }).taps) };
  });
  const taps = trials.reduce((sum, t) => sum + (t.response as { taps: Tap[] }).taps.length, 0);
  const errors = boards.reduce((sum, b) => sum + b.errors, 0);
  const score = boards.reduce((sum, b) => sum + (b.timeMs === null ? 0 : points(b.task, b.timeMs)), 0);
  return {
    trials: trials.length,
    // Trefferquote der Tipps, nicht der Tafeln: Eine Tafel über der Zielzeit ist kein Fehler.
    accuracy: taps ? (taps - errors) / taps : 0,
    medianRtMs: median(boards.flatMap((b) => b.gaps)),
    score,
    level: levelOf(state),
    headline: { label: 'Punkte', value: String(score) },
    extra: [
      ...boards.map((b, i) => ({
        label: `Tafel ${i + 1} · ${b.task.cols}×${b.task.rows}`,
        value: b.timeMs === null ? '–' : seconds(b.timeMs),
      })),
      { label: 'Fehltipps', value: String(errors) },
    ],
  };
}
