// Pfeilfokus (Flanker-Aufgabe): Richtung des mittleren Pfeils angeben, die äußeren ausblenden.
import type { Rng } from '../../core/rng';
import { initStaircase, threshold, type StaircaseConfig, type StaircaseState } from '../../core/staircase';
import type { Summary, Trial } from '../../data/types';
import { baseMetrics, median } from '../metrics';

/** Der Staircase regelt das Antwortfenster in ms; kürzer = schwerer. */
export const STAIRCASE: StaircaseConfig = {
  start: 1500,
  min: 350,
  max: 2000,
  down: 3,
  steps: [1.3, 1.15, 1.08],
  scale: 'mul',
  harder: 'down',
};

export interface FlankerState {
  stair: StaircaseState;
}

export const initialState = (): FlankerState => ({ stair: initStaircase(STAIRCASE) });

export type Direction = 'left' | 'right';

/** Wartezeit vor der Reihe in ms (von–bis): Sie schwankt, damit man nicht im Takt tippt. */
export const FORE_MS = [400, 800] as const;

export interface FlankerTrial {
  /** Richtung des mittleren Pfeils. */
  target: Direction;
  /** true: Die äußeren Pfeile zeigen wie der mittlere. */
  congruent: boolean;
  /** Antwortfenster, bereits auf ganze Frames gerundet. */
  windowMs: number;
  /** Wartezeit vor der Reihe, auf ganze Frames gerundet. */
  foreMs: number;
}

/** Anteil widersprüchlicher Reihen: wächst von 40 % auf 60 %, während das Antwortfenster schrumpft. */
export function incongruentShare(windowMs: number): number {
  if (windowMs > 1000) return 0.4;
  return windowMs > 650 ? 0.5 : 0.6;
}

/** @param quantize `timing.quantize` – rundet auf darstellbare Frame-Vielfache */
export function makeTrial(rng: Rng, state: FlankerState, quantize: (ms: number) => number): FlankerTrial {
  const windowMs = Math.min(STAIRCASE.max, Math.max(STAIRCASE.min, state.stair.value));
  return {
    target: rng() < 0.5 ? 'left' : 'right',
    congruent: rng() >= incongruentShare(windowMs),
    windowMs: quantize(windowMs),
    foreMs: quantize(FORE_MS[0] + rng() * (FORE_MS[1] - FORE_MS[0])),
  };
}

/** Die fünf Pfeile von links nach rechts. */
export function arrowsOf(trial: Pick<FlankerTrial, 'target' | 'congruent'>): Direction[] {
  const flank: Direction = trial.congruent ? trial.target : trial.target === 'left' ? 'right' : 'left';
  return [flank, flank, trial.target, flank, flank];
}

/** @param response null = keine Antwort im Fenster */
export function isCorrect(trial: Pick<FlankerTrial, 'target'>, response: Direction | null): boolean {
  return response === trial.target;
}

const STEPS = [1200, 1000, 850, 720, 610, 520, 450, 400];

/** Level 1–9 nach der Länge des Antwortfensters. */
export function levelOf(state: FlankerState): number {
  return 1 + STEPS.filter((ms) => state.stair.value <= ms).length;
}

export const kindOf = (trial: Pick<FlankerTrial, 'congruent'>): string => (trial.congruent ? 'stimmig' : 'widerspruch');

export function summarize(trials: Trial[], state: FlankerState): Summary {
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
  const plain = rtOf(kindOf({ congruent: true }));
  const conflict = rtOf(kindOf({ congruent: false }));
  const extra = [{ label: 'Längste Serie', value: String(longest) }];
  if (plain !== null && conflict !== null) extra.push({ label: 'Ablenkung kostet', value: `${Math.round(conflict - plain)} ms` });
  return {
    ...baseMetrics(trials),
    score: Math.max(0, 3000 - ms),
    level: levelOf(state),
    headline: { label: 'Antwortfenster an deiner Schwelle', value: `${ms} ms` },
    extra,
  };
}
