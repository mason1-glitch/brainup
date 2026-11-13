// Tagesprogramm: Aufwärmen → Training → Kopfrechnen (docs/DECISIONS.md, D6).
// Reine Planung ohne Datenzugriff; die UI speichert das Ergebnis als ProgramRun.
import type { Area, GameId, ProgramStep } from '../data/types';

export interface DailyConfig {
  /** Anzahl Spiele je Bereich, in Programmreihenfolge. */
  warmup: number;
  training: number;
  arithmetic: number;
}

export const DEFAULT_DAILY: DailyConfig = { warmup: 1, training: 2, arithmetic: 1 };

const ORDER: Area[] = ['warmup', 'training', 'arithmetic'];

export interface PlannableGame {
  id: GameId;
  area: Area;
  modes: { id: string }[];
}

/**
 * Wählt je Bereich die am längsten nicht gespielten Spiele (Abwechslung ohne Zufall).
 * @param recent zuletzt gespielte Spiel-IDs, neueste zuerst
 */
export function planDaily(
  games: PlannableGame[],
  recent: GameId[],
  config: DailyConfig = DEFAULT_DAILY,
): ProgramStep[] {
  const lastPlayed = (id: GameId) => {
    const i = recent.indexOf(id);
    return i === -1 ? Infinity : i;
  };
  return ORDER.flatMap((area) =>
    games
      .filter((g) => g.area === area)
      .map((g, index) => ({ g, index }))
      .sort((a, b) => lastPlayed(b.g.id) - lastPlayed(a.g.id) || a.index - b.index)
      .slice(0, config[area])
      .map(({ g }) => ({ gameId: g.id, mode: g.modes[0]!.id, sessionId: null })),
  );
}
