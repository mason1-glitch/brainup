// Fortschritt (Phase 3): Wochenziel, Kalender, Verläufe und Bestwerte – reine Funktionen über
// Sitzungen und Durchgänge. Tage sind lokale Datumsangaben „YYYY-MM-DD“ (`Session.day`).
import type { Session, Trial } from '../data/types';
import { median } from '../games/metrics';

const pad = (n: number) => String(n).padStart(2, '0');
const parse = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!);
};
const format = (utc: number) => {
  const date = new Date(utc);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

/** Kalendertag plus n Tage – gerechnet ohne Uhrzeit, also unabhängig von der Zeitumstellung. */
export const addDays = (day: string, n: number): string => format(parse(day) + n * 86_400_000);

/** Wochentag 0 = Montag … 6 = Sonntag. */
export const weekdayOf = (day: string): number => (new Date(parse(day)).getUTCDay() + 6) % 7;

export const mondayOf = (day: string): string => addDays(day, -weekdayOf(day));

/** Beendete Sitzungen je Tag. Abgebrochene Läufe zählen nicht. */
export function activeDays(sessions: readonly Session[]): Map<string, number> {
  const days = new Map<string, number>();
  for (const s of sessions) if (s.completed) days.set(s.day, (days.get(s.day) ?? 0) + 1);
  return days;
}

/** Wochenziel in Trainingstagen; Einstellung `weeklyGoal`, solange nichts anderes gewählt ist. */
export const DEFAULT_WEEKLY_GOAL = 4;
export const WEEKLY_GOAL_SETTING = 'weeklyGoal';

export interface WeekStatus {
  /** Montag bis Sonntag der laufenden Woche. */
  days: { day: string; active: boolean; future: boolean }[];
  /** Tage dieser Woche mit mindestens einer beendeten Sitzung. */
  done: number;
  goal: number;
  reached: boolean;
}

/** Wochenziel statt Tages-Serie: Es zählt, an wie vielen Tagen der Woche trainiert wurde – ein Aussetzer kostet nichts. */
export function weekStatus(active: ReadonlyMap<string, number>, today: string, goal: number): WeekStatus {
  const monday = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(monday, i);
    return { day, active: (active.get(day) ?? 0) > 0, future: day > today };
  });
  const done = days.filter((d) => d.active).length;
  return { days, done, goal, reached: done >= goal };
}

/** Kalenderblatt eines Monats („YYYY-MM“): Wochen von Montag bis Sonntag, außerhalb des Monats `null`. */
export function monthGrid(month: string): (string | null)[][] {
  const first = `${month}-01`;
  const cells: (string | null)[] = Array.from({ length: weekdayOf(first) }, () => null);
  for (let day = first; day.startsWith(month); day = addDays(day, 1)) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

/** Monat davor bzw. danach („YYYY-MM“). */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const index = y! * 12 + (m! - 1) + n;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

export interface HistoryPoint {
  day: string;
  level: number;
  accuracy: number;
  medianRtMs: number | null;
  score: number;
}

/** Verlauf eines Spiels: beendete Sitzungen mit Kennzahlen, älteste zuerst. */
export function history(sessions: readonly Session[]): HistoryPoint[] {
  return sessions
    .filter((s) => s.completed && s.summary)
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((s) => ({
      day: s.day,
      level: s.summary!.level,
      accuracy: s.summary!.accuracy,
      medianRtMs: s.summary!.medianRtMs,
      score: s.summary!.score,
    }));
}

/**
 * Gleitendes Mittel über die letzten `window` Werte. Eine einzelne Sitzung streut stark (D10) –
 * Verläufe werden deshalb geglättet gezeigt.
 */
export function smooth(values: readonly number[], window = 3): number[] {
  return values.map((_, i) => {
    const part = values.slice(Math.max(0, i - window + 1), i + 1);
    return part.reduce((a, b) => a + b, 0) / part.length;
  });
}

/** Bestwert je Modus: die Sitzung mit der höchsten Punktzahl (bei Gleichstand die frühere). */
export function bests(sessions: readonly Session[]): Map<string, { score: number; day: string }> {
  const best = new Map<string, { score: number; day: string; at: number }>();
  for (const s of sessions) {
    if (!s.completed || !s.summary) continue;
    const prev = best.get(s.mode);
    if (!prev || s.summary.score > prev.score || (s.summary.score === prev.score && s.startedAt < prev.at)) {
      best.set(s.mode, { score: s.summary.score, day: s.day, at: s.startedAt });
    }
  }
  return new Map([...best].map(([mode, { score, day }]) => [mode, { score, day }]));
}

export interface KindStats {
  kind: string;
  trials: number;
  accuracy: number;
  /** Median-Zeit der richtigen Antworten. */
  medianRtMs: number | null;
  /** Schwierigkeit der letzten Durchgänge (Mittel der jüngsten zehn). */
  level: number;
}

/** Kennzahlen je Untertyp (z. B. je Rechenart), in der Reihenfolge des ersten Auftretens. */
export function kindStats(trials: readonly Trial[]): KindStats[] {
  const groups = new Map<string, Trial[]>();
  for (const t of [...trials].sort((a, b) => a.ts - b.ts)) groups.set(t.kind, [...(groups.get(t.kind) ?? []), t]);
  return [...groups].map(([kind, list]) => {
    const right = list.filter((t) => t.correct);
    const recent = list.slice(-10);
    return {
      kind,
      trials: list.length,
      accuracy: right.length / list.length,
      medianRtMs: median(right.flatMap((t) => (t.rtMs === null ? [] : [t.rtMs]))),
      level: recent.reduce((sum, t) => sum + t.difficulty, 0) / recent.length,
    };
  });
}
