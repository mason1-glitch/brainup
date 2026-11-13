import { arithmetic } from './arithmetic';
import { rotation } from './rotation';
import type { GameDefinition } from './types';
import { ufov } from './ufov';

/** Alle Spiele der App. Neue Spiele hier eintragen (siehe docs/ADDING_A_GAME.md). */
export const games: GameDefinition[] = [rotation, ufov, arithmetic];

export function findGame(id: string): GameDefinition | undefined {
  return games.find((g) => g.id === id);
}
