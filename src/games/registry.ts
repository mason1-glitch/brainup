import { rotation } from './rotation';
import type { GameDefinition } from './types';

/** Alle Spiele der App. Neue Spiele hier eintragen (siehe docs/ADDING_A_GAME.md). */
export const games: GameDefinition[] = [rotation];

export function findGame(id: string): GameDefinition | undefined {
  return games.find((g) => g.id === id);
}
