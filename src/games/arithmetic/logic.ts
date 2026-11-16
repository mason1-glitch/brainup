// Kopfrechnen – Spielzustand, Adaptivität je Rechentyp, Wertung.
import { parseFrac, formatFrac } from '../../core/fraction';
import type { Rng } from '../../core/rng';
import { classify, type Outcome } from '../../core/srs';
import { initStaircase, updateStaircase, type StaircaseConfig, type StaircaseState } from '../../core/staircase';
import type { Summary, Trial } from '../../data/types';
import { baseMetrics } from '../metrics';
import { KINDS, MAX_LEVEL, type Format, type Kind, type Op, type Task } from './generators';

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
 * Modus-IDs stehen in gespeicherten Sitzungen – nie umbenennen.
 * sprint: 60 s, Tempo zählt · precision: feste Aufgabenzahl ohne Zeitdruck · review: Fehlertraining
 * mit den fälligen Aufgaben der Wiederholungsliste.
 */
export type ModeId = 'sprint' | 'precision' | 'review' | 'placement';

/**
 * Wie eine Antwort im jeweiligen Modus zählt. Ohne Zeitdruck (precision) gibt es kein „langsam“:
 * richtig ist richtig. Im Sprint und im Fehlertraining zählt das Tempo.
 */
export function outcomeIn(mode: ModeId, task: Task, correct: boolean, rtMs: number | null): Outcome {
  if (mode === 'precision') return correct ? 'good' : 'wrong';
  return outcomeOf(task, correct, rtMs);
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

/**
 * Einstufung (Modus `placement`): je Rechenart zwei Aufgaben. Die erste auf Level 4; war sie richtig
 * und zügig, folgt eine auf Level 7, sonst eine auf Level 2.
 * @param firstGood null = erste Aufgabe der Rechenart
 */
export function placementProbe(firstGood: boolean | null): number {
  if (firstGood === null) return 4;
  return firstGood ? 7 : 2;
}

/** Startlevel aus den beiden Einstufungsaufgaben – nie höher als das, was wirklich gelöst wurde. */
export function placedLevel(firstGood: boolean, secondGood: boolean): number {
  if (firstGood) return secondGood ? 7 : 5;
  return secondGood ? 3 : 1;
}

/** Setzt den Staircase einer Rechenart frisch auf das eingestufte Level. */
export function applyPlacement(state: ArithmeticState, kind: Kind, level: number): ArithmeticState {
  return { stairs: { ...state.stairs, [kind]: { ...initStaircase(STAIRCASE), value: level } } };
}

/** Einstellung: welche Rechenarten Sprint und Präzision mischen (Liste von `Kind`). */
export const KINDS_SETTING = 'arithmetic.kinds';

/** Liest die gespeicherte Auswahl; Unbekanntes fällt weg, eine leere oder fehlende Auswahl heißt „alle“. */
export function activeKinds(stored: unknown): Kind[] {
  const chosen = Array.isArray(stored) ? KINDS.filter((k) => stored.includes(k)) : [];
  return chosen.length > 0 ? chosen : [...KINDS];
}

/** Einstellung (boolean, Standard an): nach Fehlern einen Rechentrick zeigen – in den Modi ohne Uhr. */
export const TRICKS_SETTING = 'arithmetic.tricks';

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
  /** Rechenvorschrift (Zahlen als Bruch-Text) – für den Rechentrick; fehlt bei älteren Einträgen. */
  expr?: { op: Op; args: string[] };
}

export function toRecord(task: Task): TaskRecord {
  const { kind, level, key, text, hint, format, tolerance } = task;
  const expr = { op: task.expr.op, args: task.expr.args.map(formatFrac) };
  return { kind, level, key, text, hint, answer: formatFrac(task.answer), format, tolerance, expr };
}

/** Gespeicherte Aufgabe wieder spielbar machen (Fehlertraining). */
export function fromRecord(record: TaskRecord): Task {
  const answer = parseFrac(record.answer)!;
  const expr = record.expr ? { op: record.expr.op, args: record.expr.args.map((a) => parseFrac(a)!) } : { op: 'value' as const, args: [answer] };
  return { ...record, answer, expr };
}

/** Punkte für eine richtige Antwort – schwerere Aufgaben zählen mehr. */
export const pointsFor = (level: number): number => 10 * level;

export function summarize(trials: Trial[], state: ArithmeticState): Summary {
  const base = baseMetrics(trials);
  const right = trials.filter((t) => t.correct);
  const score = right.reduce((sum, t) => sum + pointsFor(t.difficulty), 0);
  return {
    ...base,
    score,
    level: levelOf(state),
    headline: { label: 'Punkte', value: String(score) },
    extra: [{ label: 'Richtig', value: `${right.length} von ${trials.length}` }],
  };
}
