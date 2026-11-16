import { arithmetic } from './arithmetic';
import { corsi } from './corsi';
import { flanker } from './flanker';
import { nback } from './nback';
import { paperfold } from './paperfold';
import { rotation } from './rotation';
import { schulte } from './schulte';
import { sections } from './sections';
import { taskswitch } from './taskswitch';
import type { GameDefinition } from './types';
import { ufov } from './ufov';

/** Alle Spiele der App. Neue Spiele hier eintragen (siehe docs/ADDING_A_GAME.md). */
export const games: GameDefinition[] = [rotation, ufov, paperfold, sections, arithmetic, schulte, corsi, flanker, nback, taskswitch];

export function findGame(id: string): GameDefinition | undefined {
  return games.find((g) => g.id === id);
}
