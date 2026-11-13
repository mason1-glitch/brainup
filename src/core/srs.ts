// Spaced-Repetition-Warteschlange für Rechenfehler: falsche und langsame Aufgaben
// kommen wieder – erst bald, dann in wachsenden Abständen, bis sie sitzen.
// Rein funktional; gespeichert wird über repo.putReview / repo.deleteReview.

export type Outcome = 'wrong' | 'slow' | 'good';

/** Die Planungsfelder eines Eintrags (Teilmenge von ReviewRecord). */
export interface SrsState {
  /** Epoch-ms, ab wann die Aufgabe fällig ist. */
  due: number;
  intervalDays: number;
  /** Schnelle richtige Antworten in Folge. */
  streak: number;
  lapses: number;
}

export const MINUTE = 60_000;
export const DAY = 86_400_000;

/** Nach so vielen schnellen richtigen Antworten in Folge gilt eine Aufgabe als gelernt. */
export const GRADUATE_STREAK = 4;
const GROWTH = 2.5;

export function classify(correct: boolean, rtMs: number | null, slowMs: number): Outcome {
  if (!correct) return 'wrong';
  return rtMs === null || rtMs > slowMs ? 'slow' : 'good';
}

/**
 * Nächster Zustand eines Eintrags nach einer Antwort.
 * @param prev undefined = Aufgabe steht noch nicht in der Warteschlange
 * @returns null = gehört nicht (mehr) in die Warteschlange (nie falsch gewesen oder gelernt)
 *
 * - falsch: in 10 min wieder (also noch in dieser oder der nächsten Sitzung), Abstand zurück auf 0
 * - langsam: morgen wieder, Serie zurück auf 0
 * - gut: Abstand 1 Tag → ×2,5 (1, 3, 8 Tage); nach 4-mal gut in Folge entfernt
 */
export function schedule(prev: SrsState | undefined, outcome: Outcome, now: number): SrsState | null {
  if (outcome === 'wrong') {
    return { due: now + 10 * MINUTE, intervalDays: 0, streak: 0, lapses: (prev?.lapses ?? 0) + 1 };
  }
  if (outcome === 'slow') {
    return { due: now + DAY, intervalDays: 1, streak: 0, lapses: prev?.lapses ?? 0 };
  }
  if (!prev) return null;
  const streak = prev.streak + 1;
  if (streak >= GRADUATE_STREAK) return null;
  const intervalDays = prev.intervalDays < 1 ? 1 : Math.round(prev.intervalDays * GROWTH);
  return { due: now + intervalDays * DAY, intervalDays, streak, lapses: prev.lapses };
}

/**
 * Wählt die nächste fällige Aufgabe: die am längsten fällige, die nicht unter den
 * letzten `minGap` gezeigten ist (kein direktes Wiederholen aus dem Kurzzeitgedächtnis).
 */
export function pickDue<T extends { key: string; due: number }>(
  items: readonly T[],
  now: number,
  recentKeys: readonly string[],
  minGap = 3,
): T | undefined {
  const blocked = new Set(recentKeys.slice(-minGap));
  return items
    .filter((i) => i.due <= now && !blocked.has(i.key))
    .sort((a, b) => a.due - b.due)[0];
}
