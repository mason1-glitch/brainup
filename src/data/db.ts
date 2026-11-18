import Dexie, { type Table, type Transaction } from 'dexie';
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
 * - Ein veröffentlichter Eintrag von `SCHEMA` (= `version(n)`) wird NIE geändert.
 * - Jede Schemaänderung = neuer Eintrag am Ende (`version(n + 1)`) mit `upgrade`, die alten bleiben stehen.
 * - Nur indizierte Felder stehen im Schema; neue unindizierte Felder brauchen keine Version,
 *   aber Lesecode muss mit fehlenden Feldern alter Datensätze umgehen.
 * - Der Import einer Sicherung läuft durch dieselben `upgrade`-Schritte (`backup.ts`).
 */
export interface SchemaStep {
  stores: Record<string, string | null>;
  upgrade?: (tx: Transaction) => PromiseLike<unknown> | void;
}

/** Eintrag i ist `version(i + 1)`. */
export const SCHEMA: readonly SchemaStep[] = [
  {
    stores: {
      trials: '++id, sessionId, [gameId+ts], [gameId+kind+ts]',
      sessions: 'id, [gameId+startedAt], day, programRunId',
      gameState: 'gameId',
      settings: 'key',
      reviews: 'key, [gameId+due]',
      programRuns: 'id, day',
    },
  },
];

export const SCHEMA_VERSION = SCHEMA.length;

export class BrainUpDB extends Dexie {
  trials!: Table<Trial, number>;
  sessions!: Table<Session, string>;
  gameState!: Table<GameStateRecord, string>;
  settings!: Table<SettingRecord, string>;
  reviews!: Table<ReviewRecord, string>;
  programRuns!: Table<ProgramRun, string>;

  /**
   * @param schema nur Tests übergeben ein eigenes
   * @param upTo öffnet die Datenbank im Stand einer älteren Version (Import alter Sicherungen)
   */
  constructor(
    name = 'brainup',
    readonly schema: readonly SchemaStep[] = SCHEMA,
    upTo = schema.length,
  ) {
    super(name);
    schema.slice(0, upTo).forEach((step, i) => {
      const version = this.version(i + 1).stores(step.stores);
      if (step.upgrade) version.upgrade(step.upgrade);
    });
  }
}
