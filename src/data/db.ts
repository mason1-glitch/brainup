import Dexie, { type Table } from 'dexie';
import type {
  GameStateRecord,
  ProgramRun,
  ReviewRecord,
  Session,
  SettingRecord,
  Trial,
} from './types';

/**
 * Schema. Migrationsregeln (docs/DECISIONS.md, D4):
 * - Eine veröffentlichte `version(n)` wird NIE geändert.
 * - Jede Schemaänderung = neue `version(n + 1)` mit `.upgrade()`, darunter stehen lassen.
 * - Nur indizierte Felder stehen im Schema; neue unindizierte Felder brauchen keine Version,
 *   aber Lesecode muss mit fehlenden Feldern alter Datensätze umgehen.
 */
export const SCHEMA_VERSION = 1;

export class BrainUpDB extends Dexie {
  trials!: Table<Trial, number>;
  sessions!: Table<Session, string>;
  gameState!: Table<GameStateRecord, string>;
  settings!: Table<SettingRecord, string>;
  reviews!: Table<ReviewRecord, string>;
  programRuns!: Table<ProgramRun, string>;

  constructor(name = 'brainup') {
    super(name);
    this.version(1).stores({
      trials: '++id, sessionId, [gameId+ts], [gameId+kind+ts]',
      sessions: 'id, [gameId+startedAt], day, programRunId',
      gameState: 'gameId',
      settings: 'key',
      reviews: 'key, [gameId+due]',
      programRuns: 'id, day',
    });
  }
}
