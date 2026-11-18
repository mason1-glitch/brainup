// Wechselspiel (Aufgabenwechsel): dieselbe Zahl, zwei Regeln – der Hinweis auf der Karte sagt, welche gilt.
import { pick, type Rng } from '../../core/rng';
import { initStaircase, threshold, type StaircaseConfig, type StaircaseState } from '../../core/staircase';
import type { Summary, Trial } from '../../data/types';
import { baseMetrics, median } from '../metrics';

/** Der Staircase regelt das Antwortfenster in ms; kürzer = schwerer. */
export const STAIRCASE: StaircaseConfig = {
  start: 2500,
  min: 450,
  max: 3000,
  down: 3,
  steps: [1.3, 1.15, 1.08],
  scale: 'mul',
  harder: 'down',
};

export interface SwitchState {
  stair: StaircaseState;
}

export const initialState = (): SwitchState => ({ stair: initStaircase(STAIRCASE) });

/** parity: gerade oder ungerade? · size: kleiner oder größer als 5? */
export type Rule = 'parity' | 'size';
export type Side = 'left' | 'right';

export const DIGITS: readonly number[] = [1, 2, 3, 4, 6, 7, 8, 9];

/** Frage auf der Karte und Beschriftung der beiden Tasten je Regel. */
export const QUESTIONS: Record<Rule, string> = { parity: 'gerade oder ungerade?', size: 'kleiner oder größer als 5?' };
export const LABELS: Record<Rule, Record<Side, string>> = {
  parity: { left: 'ungerade', right: 'gerade' },
  size: { left: 'kleiner', right: 'größer' },
};

/** Wartezeit vor der Karte in ms (von–bis): Sie schwankt, damit man nicht im Takt tippt. */
export const FORE_MS = [400, 800] as const;

export interface SwitchTrial {
  rule: Rule;
  digit: number;
  /** true: andere Regel als bei der Karte davor; null: erste Karte (keine davor). */
  switch: boolean | null;
  /** Antwortfenster, bereits auf ganze Frames gerundet. */
  windowMs: number;
  /** Wartezeit vor der Karte, auf ganze Frames gerundet. */
  foreMs: number;
}

/** Anteil der Regelwechsel: wächst von 25 % auf 50 %, während das Antwortfenster schrumpft. */
export function switchShare(windowMs: number): number {
  if (windowMs > 1500) return 0.25;
  return windowMs > 900 ? 0.35 : 0.5;
}

/**
 * @param previous Regel der Karte davor; null bei der ersten Karte (auch nach einer Pause)
 * @param quantize `timing.quantize` – rundet auf darstellbare Frame-Vielfache
 */
export function makeTrial(rng: Rng, state: SwitchState, previous: Rule | null, quantize: (ms: number) => number): SwitchTrial {
  const windowMs = Math.min(STAIRCASE.max, Math.max(STAIRCASE.min, state.stair.value));
  const other = (rule: Rule): Rule => (rule === 'parity' ? 'size' : 'parity');
  const change = previous === null ? null : rng() < switchShare(windowMs);
  const rule = previous === null ? pick(rng, ['parity', 'size'] as const) : change ? other(previous) : previous;
  return {
    rule,
    digit: pick(rng, DIGITS),
    switch: change,
    windowMs: quantize(windowMs),
    foreMs: quantize(FORE_MS[0] + rng() * (FORE_MS[1] - FORE_MS[0])),
  };
}

/** Die richtige Taste: links = ungerade bzw. kleiner, rechts = gerade bzw. größer. */
export function answerOf(trial: Pick<SwitchTrial, 'rule' | 'digit'>): Side {
  const right = trial.rule === 'parity' ? trial.digit % 2 === 0 : trial.digit > 5;
  return right ? 'right' : 'left';
}

/** @param response null = keine Antwort im Fenster */
export function isCorrect(trial: Pick<SwitchTrial, 'rule' | 'digit'>, response: Side | null): boolean {
  return response === answerOf(trial);
}

const STEPS = [2000, 1600, 1300, 1050, 850, 700, 580, 500];

/** Level 1–9 nach der Länge des Antwortfensters. */
export function levelOf(state: SwitchState): number {
  return 1 + STEPS.filter((ms) => state.stair.value <= ms).length;
}

export const kindOf = (trial: Pick<SwitchTrial, 'switch'>): string =>
  trial.switch === null ? 'start' : trial.switch ? 'wechsel' : 'gleich';

export function summarize(trials: Trial[], state: SwitchState): Summary {
  // Erste Hälfte = Einschwingen; die Schwelle kommt aus der zweiten.
  const settled = trials.slice(trials.length >> 1).map((t) => t.difficulty);
  const ms = Math.round(threshold(STAIRCASE, settled) ?? STAIRCASE.start);
  let streak = 0;
  let longest = 0;
  for (const t of trials) {
    streak = t.correct ? streak + 1 : 0;
    longest = Math.max(longest, streak);
  }
  const rtOf = (kind: string) => median(trials.flatMap((t) => (t.correct && t.kind === kind && t.rtMs !== null ? [t.rtMs] : [])));
  const repeat = rtOf('gleich');
  const change = rtOf('wechsel');
  const extra = [{ label: 'Längste Serie', value: String(longest) }];
  if (repeat !== null && change !== null) extra.push({ label: 'Wechsel kostet', value: `${Math.round(change - repeat)} ms` });
  return {
    ...baseMetrics(trials),
    score: Math.max(0, 4000 - ms),
    level: levelOf(state),
    headline: { label: 'Antwortfenster an deiner Schwelle', value: `${ms} ms` },
    extra,
  };
}
