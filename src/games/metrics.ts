import type { Trial } from '../data/types';

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Gemeinsame Basiskennzahlen aller Spiele. */
export function baseMetrics(trials: Trial[]) {
  const correct = trials.filter((t) => t.correct);
  return {
    trials: trials.length,
    accuracy: trials.length ? correct.length / trials.length : 0,
    medianRtMs: median(correct.flatMap((t) => (t.rtMs === null ? [] : [t.rtMs]))),
  };
}
