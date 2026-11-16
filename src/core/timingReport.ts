// Auswertung des Timing-Protokolls (Soll- gegen Ist-Dauer der Darbietungen).
// Abnahmekriterium aus PLAN.md: über 200 Darbietungen auf ±1 Frame genau.
import type { Presentation } from './timing';

/** Zeitstempel schwanken um Bruchteile einer Millisekunde – so viel Spiel bekommt die Grenze „±1 Frame“. */
export const TOLERANCE_MS = 0.5;

export interface TimingReport {
  count: number;
  frameMs: number;
  /** Darbietungen, deren Ist-Dauer höchstens einen Frame von der Soll-Dauer abweicht. */
  within: number;
  /** Größte Abweichung |Ist − Soll| in ms und in Frames. */
  maxAbsMs: number;
  maxAbsFrames: number;
  /** Mittlere Abweichung Ist − Soll in ms (mit Vorzeichen: positiv = zu lang). */
  meanMs: number;
  /** Je Soll-Dauer: Anzahl und mittlere Ist-Dauer, aufsteigend nach Frames. */
  byFrames: { frames: number; plannedMs: number; count: number; meanActualMs: number }[];
}

export function reportTiming(log: readonly Presentation[], frameMs: number): TimingReport {
  const errors = log.map((p) => p.actualMs - p.plannedMs);
  const maxAbsMs = errors.reduce((max, e) => Math.max(max, Math.abs(e)), 0);
  const groups = new Map<number, Presentation[]>();
  for (const p of log) groups.set(p.frames, [...(groups.get(p.frames) ?? []), p]);
  return {
    count: log.length,
    frameMs,
    within: errors.filter((e) => Math.abs(e) <= frameMs + TOLERANCE_MS).length,
    maxAbsMs,
    maxAbsFrames: maxAbsMs / frameMs,
    meanMs: log.length ? errors.reduce((a, b) => a + b, 0) / log.length : 0,
    byFrames: [...groups.entries()]
      .sort(([a], [b]) => a - b)
      .map(([frames, list]) => ({
        frames,
        plannedMs: list[0]!.plannedMs,
        count: list.length,
        meanActualMs: list.reduce((sum, p) => sum + p.actualMs, 0) / list.length,
      })),
  };
}
