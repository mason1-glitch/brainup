// Datenmodell (siehe docs/DECISIONS.md, D4). Rohdaten sind die Wahrheit,
// Kennzahlen werden daraus berechnet.

export type GameId = string;
export type Area = 'training' | 'arithmetic' | 'warmup';

/** Ein Durchgang – roh und unveränderlich. */
export interface Trial {
  id?: number;
  sessionId: string;
  gameId: GameId;
  /** Untertyp innerhalb eines Spiels, z. B. Rechentyp `mul-table`; sonst ''. */
  kind: string;
  /** Epoch-ms beim Reizbeginn. */
  ts: number;
  /** JSON: alles, um die Aufgabe zu rekonstruieren. */
  task: unknown;
  /** JSON: die Antwort des Spielers. */
  response: unknown;
  /** Reaktionszeit in ms; null = keine Antwort (Zeit abgelaufen). */
  rtMs: number | null;
  correct: boolean;
  /** Spielspezifischer Skalar, i. d. R. der Staircase-Wert dieses Durchgangs. */
  difficulty: number;
}

/** Kennzahlen einer Sitzung, berechnet aus ihren Durchgängen. */
export interface Summary {
  /** Punktzahl für Bestwerte – höher ist besser. */
  score: number;
  /** Anzeige-Level nach der Sitzung. */
  level: number;
  /** Trefferquote 0..1. */
  accuracy: number;
  /** Median-RT der richtigen Durchgänge. */
  medianRtMs: number | null;
  trials: number;
  /** Die eine Zahl, die der Ergebnisbildschirm groß zeigt. */
  headline: { label: string; value: string };
  /** Weitere spielspezifische Kennzahlen. */
  extra: { label: string; value: string }[];
}

/** Eine Sitzung = ein Lauf eines Spiels in einem Modus. */
export interface Session {
  id: string;
  gameId: GameId;
  mode: string;
  /** Lokales Datum YYYY-MM-DD (für Kalender und Wochenziel). */
  day: string;
  startedAt: number;
  endedAt: number | null;
  /** false = abgebrochen. */
  completed: boolean;
  /** Gesetzt, wenn die Sitzung Teil eines Tagesprogramms ist. */
  programRunId: string | null;
  summary: Summary | null;
}

/** Spielzustand je Spiel: Schwierigkeitszustand + Tutorial-Status. */
export interface GameStateRecord {
  gameId: GameId;
  /** Version des spielspezifischen Zustands (GameDefinition.stateVersion). */
  stateVersion: number;
  /** JSON-serialisierbar; Form bestimmt das Spiel. */
  state: unknown;
  tutorialDone: boolean;
  updatedAt: number;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

/** Eintrag der Spaced-Repetition-Warteschlange (Rechenfehler). */
export interface ReviewRecord {
  /** Eindeutig je Aufgabe, z. B. `mul-table:7x13`. */
  key: string;
  gameId: GameId;
  kind: string;
  task: unknown;
  /** Epoch-ms, ab wann die Aufgabe wieder fällig ist. */
  due: number;
  intervalDays: number;
  /** Richtige Antworten in Folge. */
  streak: number;
  lapses: number;
}

export interface ProgramStep {
  gameId: GameId;
  mode: string;
  /** Gesetzt, sobald der Schritt gespielt wurde. */
  sessionId: string | null;
}

/** Ein Durchlauf des Tagesprogramms. */
export interface ProgramRun {
  id: string;
  day: string;
  startedAt: number;
  finishedAt: number | null;
  steps: ProgramStep[];
}
