// Sicherung als JSON (D2, D4, D15): alles exportieren, beim Import zusammenführen.
// Der Import löscht nie etwas: Rohdaten werden vereinigt, bei Zuständen gilt der neuere Stand.
import { BrainUpDB } from './db';
import type { GameStateRecord, ProgramRun, ReviewRecord, Session, SettingRecord, Trial } from './types';

export interface Backup {
  app: 'brainup';
  /** Schema-Version, in der die Tabellen vorliegen. */
  schemaVersion: number;
  exportedAt: number;
  tables: {
    /** In Speicherreihenfolge, ohne die lokale laufende Nummer `id`. */
    trials: Omit<Trial, 'id'>[];
    sessions: Session[];
    gameState: GameStateRecord[];
    settings: SettingRecord[];
    reviews: ReviewRecord[];
    programRuns: ProgramRun[];
  };
}

/** Was ein Import neu hinzugefügt hat. */
export interface ImportReport {
  sessions: number;
  trials: number;
}

/** Fehler mit einem Text, den die Oberfläche zeigen kann. */
export class BackupError extends Error {}

const withoutId = ({ id: _id, ...rest }: Trial): Omit<Trial, 'id'> => rest;

export async function exportAll(db: BrainUpDB, now = Date.now()): Promise<Backup> {
  return db.transaction('r', db.tables, async () => ({
    app: 'brainup' as const,
    schemaVersion: db.schema.length,
    exportedAt: now,
    tables: {
      trials: (await db.trials.toArray()).map(withoutId),
      sessions: await db.sessions.toArray(),
      gameState: await db.gameState.toArray(),
      settings: await db.settings.toArray(),
      reviews: await db.reviews.toArray(),
      programRuns: await db.programRuns.toArray(),
    },
  }));
}

/** JSON mit sortierten Schlüsseln – gleicher Inhalt ergibt denselben Text. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)))
      : v,
  );
}

/**
 * Bringt die Tabellen einer Sicherung auf den aktuellen Schema-Stand: in eine Hilfsdatenbank
 * im Stand der Sicherung schreiben, mit dem aktuellen Schema öffnen (Dexie führt die
 * `upgrade`-Schritte aus `db.ts` aus) und wieder auslesen.
 */
async function upgraded(db: BrainUpDB, data: unknown): Promise<Backup['tables']> {
  const file = data as { app?: unknown; schemaVersion?: unknown; tables?: unknown } | null;
  if (typeof file !== 'object' || file === null || file.app !== 'brainup') {
    throw new BackupError('Das ist keine BrainUp-Sicherung.');
  }
  const version = file.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new BackupError('Die Sicherung ist beschädigt.');
  }
  if (version > db.schema.length) {
    throw new BackupError('Die Sicherung stammt aus einer neueren Version der App. Bitte zuerst die App aktualisieren.');
  }
  const tables = file.tables as Record<string, unknown> | null;
  const name = `${db.name}-import-${crypto.randomUUID()}`;
  const old = new BrainUpDB(name, db.schema, version);
  try {
    const names = old.tables.map((t) => t.name);
    if (
      typeof tables !== 'object' ||
      tables === null ||
      Object.keys(tables).length !== names.length ||
      !names.every((n) => Array.isArray(tables[n]))
    ) {
      throw new BackupError('Die Sicherung ist beschädigt.');
    }
    try {
      await old.transaction('rw', old.tables, async () => {
        for (const table of old.tables) await table.bulkAdd(tables[table.name] as unknown[]);
      });
    } catch {
      throw new BackupError('Die Sicherung ist beschädigt.');
    }
    old.close();
    const current = new BrainUpDB(name, db.schema);
    try {
      return (await exportAll(current)).tables;
    } finally {
      current.close();
    }
  } finally {
    old.close();
    await BrainUpDB.delete(name);
  }
}

/**
 * Führt eine Sicherung mit den vorhandenen Daten zusammen (D15). Alles oder nichts:
 * Schlägt etwas fehl, bleibt die Datenbank unverändert.
 */
export async function importAll(db: BrainUpDB, data: unknown): Promise<ImportReport> {
  const incoming = await upgraded(db, data);
  return db.transaction('rw', db.tables, async () => {
    const report: ImportReport = { sessions: 0, trials: 0 };

    // Sitzungen: unbekannte dazu; eine beendete ersetzt dieselbe unbeendete.
    for (const session of incoming.sessions) {
      const local = await db.sessions.get(session.id);
      if (!local) report.sessions++;
      if (!local || (local.endedAt === null && session.endedAt !== null)) await db.sessions.put(session);
    }

    // Durchgänge: Vereinigung. Gleich ist nur, was in allen Feldern übereinstimmt.
    const sessionIds = [...new Set(incoming.trials.map((t) => t.sessionId))];
    const known = new Map<string, number>();
    await db.trials.where('sessionId').anyOf(sessionIds).each((t) => {
      const key = canonical(withoutId(t));
      known.set(key, (known.get(key) ?? 0) + 1);
    });
    const fresh = incoming.trials.filter((t) => {
      const key = canonical(t);
      const count = known.get(key) ?? 0;
      if (count > 0) known.set(key, count - 1);
      return count === 0;
    });
    await db.trials.bulkAdd(fresh);
    report.trials = fresh.length;

    // Spielzustand: der zuletzt gespeicherte gilt; ein gespieltes Tutorial bleibt gespielt.
    for (const state of incoming.gameState) {
      const local = await db.gameState.get(state.gameId);
      const winner = local && local.updatedAt >= state.updatedAt ? local : state;
      await db.gameState.put({ ...winner, tutorialDone: state.tutorialDone || (local?.tutorialDone ?? false) });
    }

    // Einstellungen und Wiederholungen tragen keinen Zeitstempel: Vorhandenes bleibt, Fehlendes kommt dazu.
    for (const setting of incoming.settings) {
      if (!(await db.settings.get(setting.key))) await db.settings.add(setting);
    }
    for (const review of incoming.reviews) {
      if (!(await db.reviews.get(review.key))) await db.reviews.add(review);
    }

    // Tagesprogramm: derselbe Durchlauf wird Schritt für Schritt ergänzt.
    for (const run of incoming.programRuns) {
      const local = await db.programRuns.get(run.id);
      if (!local) {
        await db.programRuns.add(run);
        continue;
      }
      await db.programRuns.put({
        ...local,
        finishedAt: local.finishedAt ?? run.finishedAt,
        steps: local.steps.map((step, i) => {
          const other = run.steps[i];
          const same = other && other.gameId === step.gameId && other.mode === step.mode;
          return step.sessionId === null && same ? { ...step, sessionId: other.sessionId } : step;
        }),
      });
    }
    return report;
  });
}
