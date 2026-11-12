// Die Schnittstelle, die jedes Spiel erfüllt (docs/DECISIONS.md, D5).
// Der Ablauf drumherum (Tutorial → Countdown → Lauf → Speichern → Ergebnis)
// gehört dem GameHost (src/routes/Play.svelte), nicht dem Spiel.
import type { Component } from 'svelte';
import type { Area, GameId, Summary, Trial } from '../data/types';

/** Umfang eines Laufs. Genau eines von beiden ist gesetzt. */
export type Budget = { trials: number } | { seconds: number };

export interface GameMode {
  id: string;
  title: string;
  budget: Budget;
}

/** Was ein Spiel pro Durchgang meldet; der Host ergänzt sessionId und gameId. */
export type TrialInput = Omit<Trial, 'id' | 'sessionId' | 'gameId'>;

export interface RunProps<S> {
  /** Schwierigkeitszustand zu Beginn des Laufs. */
  state: S;
  mode: GameMode;
  /**
   * true, solange der Spielrahmen pausiert. Das Spiel hält dann Uhren an und
   * verwirft den laufenden Durchgang (er wird nach der Pause neu gestellt).
   */
  paused: boolean;
  /** Jeden abgeschlossenen Durchgang sofort melden. */
  onTrial: (trial: TrialInput) => void;
  /** Fortschritt 0..1 für die Anzeige im Spielrahmen; optional mit Text (z. B. „42 s“). */
  onProgress: (fraction: number, label?: string) => void;
  /** Lauf beendet; liefert den neuen Schwierigkeitszustand. */
  onFinish: (nextState: S) => void;
}

export interface TutorialProps {
  /** Aufrufen, wenn der Spieler das Tutorial geschafft hat. */
  onDone: () => void;
}

export interface GameDefinition<S = unknown> {
  id: GameId;
  area: Area;
  title: string;
  /** Eine Zeile für Listen. */
  tagline: string;
  /** Beschreibungstext; verspricht nur, was belegt ist (später gegen docs/GAMES.md geprüft). */
  description: string;
  /** Erster Eintrag ist der Standardmodus. */
  modes: GameMode[];

  /** Erhöhen, wenn sich die Form von S ändert; dann `migrateState` anpassen. */
  stateVersion: number;
  initialState: () => S;
  /** Alten gespeicherten Zustand übernehmen; ohne Angabe wird neu begonnen. */
  migrateState?: (old: unknown, fromVersion: number) => S;
  /** Anzeige-Level (1 = Einstieg), abgeleitet aus dem Schwierigkeitszustand. */
  level: (state: S) => number;

  /** Interaktives Tutorial (≈ 30 s), kein Textblock. */
  Tutorial: Component<TutorialProps>;
  Run: Component<RunProps<S>>;

  /** Wertung und Kennzahlen – ausschließlich aus den Rohdaten berechnet. */
  summarize: (trials: Trial[], state: S) => Summary;
}

/** Hilfsfunktion, damit `S` je Spiel geprüft wird und die Registry trotzdem homogen ist. */
export function defineGame<S>(def: GameDefinition<S>): GameDefinition<unknown> {
  return def as unknown as GameDefinition<unknown>;
}
