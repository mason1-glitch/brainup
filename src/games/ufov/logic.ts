// Verarbeitungsgeschwindigkeit nach dem UFOV-Prinzip (Useful Field of View):
// Form in der Mitte erkennen und zugleich einen Punkt am Rand orten – bei immer kürzerer Darbietung.
import { randInt, type Rng } from '../../core/rng';
import { initStaircase, threshold, type StaircaseConfig, type StaircaseState } from '../../core/staircase';
import type { Summary, Trial } from '../../data/types';
import { baseMetrics } from '../metrics';

/** Der Staircase regelt die Darbietungszeit in ms; kürzer = schwerer. */
export const STAIRCASE: StaircaseConfig = {
  start: 250,
  min: 16,
  max: 500,
  down: 3,
  steps: [1.5, 1.25, 1.12],
  scale: 'mul',
  harder: 'down',
};

/**
 * Stufen wie die UFOV-Untertests:
 * 1 = nur Mitte · 2 = Mitte + Punkt am Rand · 3 = zusätzlich Ablenker.
 */
export type Stage = 1 | 2 | 3;

export interface UfovState {
  stage: Stage;
  stair: StaircaseState;
}

export const initialState = (): UfovState => ({ stage: 1, stair: initStaircase(STAIRCASE) });

export const DIRECTIONS = 8;
/** Radien der beiden Ringe in Prozent der halben Feldbreite. */
export const RINGS = [24, 40] as const;

export interface UfovTrial {
  stage: Stage;
  /** Form in der Mitte: 0 = Kreis, 1 = Quadrat. */
  central: 0 | 1;
  /** Richtung des Punkts (0 = oben, im Uhrzeigersinn); null in Stufe 1. */
  direction: number | null;
  ring: 0 | 1;
  distractors: boolean;
  /** Darbietungszeit, bereits auf ganze Frames gerundet. */
  durationMs: number;
}

export interface UfovResponse {
  central: 0 | 1;
  direction: number | null;
}

/** @param quantize `timing.quantize` – rundet auf darstellbare Frame-Vielfache */
export function makeTrial(rng: Rng, state: UfovState, quantize: (ms: number) => number): UfovTrial {
  return {
    stage: state.stage,
    central: rng() < 0.5 ? 0 : 1,
    direction: state.stage === 1 ? null : randInt(rng, 0, DIRECTIONS - 1),
    ring: rng() < 0.5 ? 0 : 1,
    distractors: state.stage === 3,
    durationMs: quantize(state.stair.value),
  };
}

export function isCorrect(trial: UfovTrial, response: UfovResponse): boolean {
  return response.central === trial.central && response.direction === trial.direction;
}

/** Position eines Platzes im Feld (Koordinaten −50…50, y nach unten). */
export function slotPosition(direction: number, ring: number): { x: number; y: number } {
  const a = (direction / DIRECTIONS) * 2 * Math.PI;
  const r = RINGS[ring]!;
  return { x: r * Math.sin(a), y: -r * Math.cos(a) };
}

/** Unter dieser Schwelle (ms) ist eine Stufe gemeistert. */
export const STAGE_UP_MS = 60;

/** Nach einer Sitzung: nächste Stufe freischalten, wenn die Darbietungszeit kurz genug ist. */
export function advance(state: UfovState): UfovState {
  if (state.stage < 3 && state.stair.value <= STAGE_UP_MS) {
    return { stage: (state.stage + 1) as Stage, stair: initStaircase(STAIRCASE) };
  }
  return state;
}

const STEPS = [200, 140, 100, 70, 45];

/** Level 1–18: je Stufe sechs Schritte nach Darbietungszeit. */
export function levelOf(state: UfovState): number {
  const step = 1 + STEPS.filter((ms) => state.stair.value <= ms).length;
  return (state.stage - 1) * 6 + step;
}

export const kindOf = (stage: Stage): string => `stufe-${stage}`;

export function summarize(trials: Trial[], state: UfovState): Summary {
  const base = baseMetrics(trials);
  const stage = Number(trials[0]?.kind.split('-')[1] ?? state.stage) as Stage;
  // Erste Hälfte = Einschwingen; die Schwelle kommt aus der zweiten.
  const settled = trials.slice(trials.length >> 1).map((t) => t.difficulty);
  const ms = threshold(STAIRCASE, settled) ?? STAIRCASE.start;
  const extra = [{ label: 'Stufe', value: `${stage} von 3` }];
  if (state.stage > stage) extra.push({ label: 'Neu', value: `Stufe ${state.stage} freigeschaltet` });
  return {
    ...base,
    score: Math.round((stage - 1) * 500 + Math.max(0, 500 - ms)),
    level: levelOf(state),
    headline: { label: 'Darbietungszeit an deiner Schwelle', value: `${Math.round(ms)} ms` },
    extra,
  };
}
