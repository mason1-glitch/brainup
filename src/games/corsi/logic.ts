// Blockfolge (Corsi-Block-Aufgabe): Felder leuchten nacheinander auf, die Folge wird nachgetippt.
import { shuffle, type Rng } from '../../core/rng';
import { initStaircase, type StaircaseConfig, type StaircaseState } from '../../core/staircase';
import type { Summary, Trial } from '../../data/types';
import { baseMetrics } from '../metrics';

export const COLS = 4;
export const CELLS = COLS * COLS;

/**
 * Der Staircase regelt die Länge der Folge. 1-down-1-up: Nach jedem Erfolg wird sie länger
 * (so steht es in der App), nach einem Fehler kürzer – die Länge pendelt um die Merkspanne.
 */
export const STAIRCASE: StaircaseConfig = { start: 3, min: 2, max: 9, down: 1, steps: [1], scale: 'add', harder: 'up' };

/** 1 = vorwärts · 2 = vorwärts, schnell · 3 = rückwärts. */
export type Stage = 1 | 2 | 3;

/** Leuchtdauer je Feld und Pause dazwischen in ms (vor der Rundung auf Frames). */
export const TEMPO: Record<Stage, { onMs: number; gapMs: number }> = {
  1: { onMs: 600, gapMs: 250 },
  2: { onMs: 300, gapMs: 150 },
  3: { onMs: 600, gapMs: 250 },
};

export const STAGE_NAMES: Record<Stage, string> = { 1: 'vorwärts', 2: 'vorwärts, schnell', 3: 'rückwärts' };

export interface CorsiState {
  stage: Stage;
  stair: StaircaseState;
}

export const initialState = (): CorsiState => ({ stage: 1, stair: initStaircase(STAIRCASE) });

export interface CorsiTrial {
  stage: Stage;
  length: number;
  /** Felder in der gezeigten Reihenfolge (0 = links oben, zeilenweise); kein Feld doppelt. */
  sequence: number[];
  /** true: in umgekehrter Reihenfolge nachtippen. */
  backward: boolean;
  /** Leuchtdauer je Feld und Pause, bereits auf ganze Frames gerundet. */
  onMs: number;
  gapMs: number;
}

/** @param quantize `timing.quantize` – rundet auf darstellbare Frame-Vielfache */
export function makeTrial(rng: Rng, state: CorsiState, quantize: (ms: number) => number): CorsiTrial {
  const length = Math.min(STAIRCASE.max, Math.max(STAIRCASE.min, Math.round(state.stair.value)));
  const all = Array.from({ length: CELLS }, (_, i) => i);
  return {
    stage: state.stage,
    length,
    sequence: shuffle(rng, all).slice(0, length),
    backward: state.stage === 3,
    onMs: quantize(TEMPO[state.stage].onMs),
    gapMs: quantize(TEMPO[state.stage].gapMs),
  };
}

/** Die Felder in der Reihenfolge, in der sie anzutippen sind. */
export function expected(trial: Pick<CorsiTrial, 'sequence' | 'backward'>): number[] {
  return trial.backward ? [...trial.sequence].reverse() : [...trial.sequence];
}

/** Stand der Antwort nach den bisherigen Tipps: Der erste falsche Tipp entscheidet. */
export function judge(trial: Pick<CorsiTrial, 'sequence' | 'backward'>, taps: readonly number[]): 'open' | 'correct' | 'wrong' {
  const want = expected(trial);
  if (taps.some((cell, i) => cell !== want[i])) return 'wrong';
  return taps.length >= want.length ? 'correct' : 'open';
}

/** Ab dieser Länge ist eine Stufe gemeistert. */
export const UNLOCK_LENGTH = 7;

/** Nach einer Sitzung: nächste Stufe freischalten, wenn die Folge lang genug geworden ist. */
export function advance(state: CorsiState): CorsiState {
  if (state.stage < 3 && state.stair.value >= UNLOCK_LENGTH) {
    return { stage: (state.stage + 1) as Stage, stair: initStaircase(STAIRCASE) };
  }
  return state;
}

const LENGTHS = STAIRCASE.max - STAIRCASE.min + 1;

/** Level 1–24: je Stufe acht Längen. */
export function levelOf(state: CorsiState): number {
  const length = Math.min(STAIRCASE.max, Math.max(STAIRCASE.min, Math.round(state.stair.value)));
  return (state.stage - 1) * LENGTHS + length - STAIRCASE.min + 1;
}

export const kindOf = (stage: Stage): string => `stufe-${stage}`;

export function summarize(trials: Trial[], state: CorsiState): Summary {
  const base = baseMetrics(trials);
  const stage = Number(trials[0]?.kind.split('-')[1] ?? state.stage) as Stage;
  const right = trials.filter((t) => t.correct);
  const longest = Math.max(0, ...right.map((t) => t.difficulty));
  const extra = [
    { label: 'Richtig', value: `${right.length} von ${trials.length}` },
    { label: 'Stufe', value: STAGE_NAMES[stage] },
  ];
  if (state.stage > stage) extra.push({ label: 'Neu', value: `Stufe „${STAGE_NAMES[state.stage]}“ freigeschaltet` });
  return {
    ...base,
    score: longest === 0 ? 0 : (stage - 1) * 1000 + longest * 100 + right.length * 10,
    level: levelOf(state),
    headline: { label: 'Längste Folge', value: longest === 0 ? '–' : `${longest} Felder` },
    extra,
  };
}
