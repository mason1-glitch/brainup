// Kopfrechnen – Spielzustand, Adaptivität je Rechentyp, Wertung.
import { parseFrac, formatFrac } from '../../core/fraction';
import type { Rng } from '../../core/rng';
import { classify, type Outcome } from '../../core/srs';
import { initStaircase, updateStaircase, type StaircaseConfig, type StaircaseState } from '../../core/staircase';
import type { Summary, Trial } from '../../data/types';
import { baseMetrics } from '../metrics';
import { KINDS, MAX_LEVEL, type Format, type Kind, type Task } from './generators';

/**
 * Je Rechentyp ein eigener Staircase über die Level 1–10. 2-down-1-up (≈ 71 %), weil im
 * gemischten Sprint je Typ nur wenige Aufgaben pro Sitzung anfallen.
 */
export const STAIRCASE: StaircaseConfig = {
  start: 1,
  min: 1,
  max: MAX_LEVEL,
  down: 2,
  steps: [1],
  scale: 'add',
  harder: 'up',
};

export interface ArithmeticState {
  stairs: Record<Kind, StaircaseState>;
}

export function initialState(): ArithmeticState {
  return { stairs: Object.fromEntries(KINDS.map((k) => [k, initStaircase(STAIRCASE)])) as Record<Kind, StaircaseState> };
}

export const levelOfKind = (state: ArithmeticState, kind: Kind): number => Math.round(state.stairs[kind].value);

/** Anzeige-Level: Mittel über alle Rechentypen. */
export function levelOf(state: ArithmeticState): number {
  return Math.round(KINDS.reduce((sum, k) => sum + state.stairs[k].value, 0) / KINDS.length);
}

/** Ab dieser Antwortzeit gilt eine richtige Antwort als langsam (Tempo als Schwierigkeitsmaß). */
export function slowMs(kind: Kind, level: number): number {
  return (4000 + 2000 * level) * (kind === 'table' ? 0.5 : 1);
}

export function outcomeOf(task: Task, correct: boolean, rtMs: number | null): Outcome {
  return classify(correct, rtMs, slowMs(task.kind, task.level));
}

/**
 * Schwierigkeit nach einer Antwort: falsch → leichter; richtig und zügig → zählt fürs Aufsteigen;
 * richtig, aber langsam → bleibt (erst wenn es flüssig geht, wird es schwerer).
 */
export function applyAnswer(state: ArithmeticState, task: Task, outcome: Outcome): ArithmeticState {
  if (outcome === 'slow') return state;
  const stair = updateStaircase(STAIRCASE, state.stairs[task.kind], outcome === 'good');
  return { stairs: { ...state.stairs, [task.kind]: stair } };
}

/** Nächster Rechentyp im gemischten Lauf – nie zweimal derselbe hintereinander. */
export function pickKind(rng: Rng, previous?: Kind, kinds: readonly Kind[] = KINDS): Kind {
  const pool = kinds.length > 1 ? kinds.filter((k) => k !== previous) : kinds;
  return pool[Math.floor(rng() * pool.length)]!;
}

/** JSON-Form einer Aufgabe für Rohdaten und Wiederholungsliste (bigint ist nicht JSON-fähig). */
export interface TaskRecord {
  kind: Kind;
  level: number;
  key: string;
  text: string;
  hint: string;
  answer: string;
  format: Format;
  tolerance: number;
}

export function toRecord(task: Task): TaskRecord {
  const { kind, level, key, text, hint, format, tolerance } = task;
  return { kind, level, key, text, hint, answer: formatFrac(task.answer), format, tolerance };
}

/** Gespeicherte Aufgabe wieder spielbar machen (Fehlertraining). */
export function fromRecord(record: TaskRecord): Task {
  const answer = parseFrac(record.answer)!;
  return { ...record, answer, expr: { op: 'value', args: [answer] } };
}

export function summarize(trials: Trial[], state: ArithmeticState): Summary {
  const base = baseMetrics(trials);
  const right = trials.filter((t) => t.correct);
  // Schwerere Aufgaben zählen mehr.
  const score = right.reduce((sum, t) => sum + 10 * t.difficulty, 0);
  return {
    ...base,
    score,
    level: levelOf(state),
    headline: { label: 'Punkte', value: String(score) },
    extra: [{ label: 'Richtig', value: `${right.length} von ${trials.length}` }],
  };
}
