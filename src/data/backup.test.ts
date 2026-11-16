import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { BackupError, type Backup } from './backup';
import { BrainUpDB, SCHEMA, SCHEMA_VERSION, type SchemaStep } from './db';
import { createRepo } from './repo';
import type { GameStateRecord, ProgramRun, ReviewRecord, Session, SettingRecord, Trial } from './types';

let n = 0;
const freshDb = (schema: readonly SchemaStep[] = SCHEMA) => new BrainUpDB(`backup-${n++}`, schema);

/** Die Datei, wie sie auf der Platte liegt: als Text und zurück. */
const viaFile = (backup: Backup): unknown => JSON.parse(JSON.stringify(backup));
const tablesOf = async (db: BrainUpDB) => (await createRepo(db).exportAll(0)).tables;

// ---------- Musterdaten: von Hand geschrieben, nicht aus einem Export gewonnen ----------

const session = (id: string, over: Partial<Session> = {}): Session => ({
  id,
  gameId: 'ufov',
  mode: 'standard',
  day: '2026-11-15',
  startedAt: 1000,
  endedAt: 2000,
  completed: true,
  programRunId: null,
  summary: {
    score: 12.5,
    level: 3,
    accuracy: 0.75,
    medianRtMs: null,
    trials: 2,
    headline: { label: 'Schwelle', value: '83 ms' },
    extra: [{ label: 'Treffer', value: '3 von 4' }],
  },
  ...over,
});

const trial = (sessionId: string, ts: number, over: Partial<Trial> = {}): Omit<Trial, 'id'> => ({
  sessionId,
  gameId: 'ufov',
  kind: '',
  ts,
  task: { shape: 'car', spot: 3, timing: { targetMs: 83.33, actualMs: 83.4 }, list: [1, [2, null]], text: 'äöü „ß“  ' },
  response: { shape: 'truck', spot: null },
  rtMs: null,
  correct: false,
  difficulty: 83.33,
  ...over,
});

const SESSIONS: Session[] = [
  session('s-a'),
  session('s-b', { gameId: 'arithmetic', mode: 'sprint', programRunId: 'run-1', startedAt: 5000, endedAt: 9000 }),
  session('s-c', { endedAt: null, completed: false, summary: null, startedAt: 9500 }),
];
const TRIALS: Omit<Trial, 'id'>[] = [
  trial('s-a', 1100),
  trial('s-a', 1500, { rtMs: 412.3, correct: true, response: { shape: 'car', spot: 3 } }),
  trial('s-b', 5100, { gameId: 'arithmetic', kind: 'fraction', task: { text: '3/4 = ?', answer: '3/4' }, response: '0,75', rtMs: 1900, correct: true, difficulty: 4 }),
  trial('s-c', 9600, { difficulty: 0 }),
];
const GAME_STATE: GameStateRecord[] = [
  { gameId: 'arithmetic', stateVersion: 2, state: { levels: { mul: 4, add: 7 } }, tutorialDone: true, updatedAt: 9000 },
  { gameId: 'ufov', stateVersion: 1, state: { stage: 2, value: 83.33, reversals: [100, 66.7] }, tutorialDone: false, updatedAt: 2000 },
];
const SETTINGS: SettingRecord[] = [
  { key: 'daily', value: { warmup: 1, training: 2, arithmetic: 1 } },
  { key: 'theme', value: 'dark' },
];
const REVIEWS: ReviewRecord[] = [
  { key: 'mul:7x13', gameId: 'arithmetic', kind: 'mul', task: { text: '7 × 13', answer: '91' }, due: 123456, intervalDays: 3, streak: 2, lapses: 1 },
];
const RUNS: ProgramRun[] = [
  {
    id: 'run-1',
    day: '2026-11-15',
    startedAt: 900,
    finishedAt: null,
    steps: [
      { gameId: 'ufov', mode: 'standard', sessionId: null },
      { gameId: 'arithmetic', mode: 'sprint', sessionId: 's-b' },
    ],
  },
];

async function seeded(): Promise<BrainUpDB> {
  const db = freshDb();
  await db.sessions.bulkAdd(SESSIONS);
  await db.trials.bulkAdd(TRIALS);
  await db.gameState.bulkAdd(GAME_STATE);
  await db.settings.bulkAdd(SETTINGS);
  await db.reviews.bulkAdd(REVIEWS);
  await db.programRuns.bulkAdd(RUNS);
  return db;
}

describe('Sicherung', () => {
  it('exportiert alle Tabellen mit Schema-Version, Durchgänge ohne lokale Nummer', async () => {
    const backup = await createRepo(await seeded()).exportAll(777);
    expect(backup).toEqual({
      app: 'brainup',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: 777,
      tables: { trials: TRIALS, sessions: SESSIONS, gameState: GAME_STATE, settings: SETTINGS, reviews: REVIEWS, programRuns: RUNS },
    });
  });

  it('Export → Import → Export ist verlustfrei', async () => {
    const first = await createRepo(await seeded()).exportAll(1);
    const target = createRepo(freshDb());
    expect(await target.importAll(viaFile(first))).toEqual({ sessions: 3, trials: 4 });
    const second = await target.exportAll(1);
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    // Unabhängig vom ersten Export: Es steht genau das in der Datenbank, was oben von Hand steht.
    expect(second.tables.trials).toEqual(TRIALS);
    expect(second.tables.sessions).toEqual(SESSIONS);
  });

  it('zweimal dieselbe Sicherung importieren ändert nichts', async () => {
    const db = await seeded();
    const repo = createRepo(db);
    const before = await repo.exportAll(1);
    expect(await repo.importAll(viaFile(before))).toEqual({ sessions: 0, trials: 0 });
    expect(await repo.exportAll(1)).toEqual(before);
    // Die lokalen Nummern der Durchgänge bleiben dieselben – es wurde nichts neu geschrieben.
    expect(await db.trials.toCollection().primaryKeys()).toEqual([1, 2, 3, 4]);
  });

  it('führt zusammen: Vorhandenes bleibt vollständig erhalten, Neues kommt dazu', async () => {
    const db = freshDb();
    const local = createRepo(db);
    const mine = session('s-local', { startedAt: 20_000, endedAt: 21_000 });
    await db.sessions.add(mine);
    await db.trials.bulkAdd([trial('s-local', 20_100), trial('s-local', 20_200, { correct: true, rtMs: 300 })]);
    await db.settings.add({ key: 'theme', value: 'light' });
    await db.reviews.add({ ...REVIEWS[0]!, due: 999, lapses: 5 });

    const report = await local.importAll(viaFile(await createRepo(await seeded()).exportAll()));
    expect(report).toEqual({ sessions: 3, trials: 4 });
    const after = await tablesOf(db);
    expect(after.sessions.map((s) => s.id).sort()).toEqual(['s-a', 's-b', 's-c', 's-local']);
    expect(after.sessions).toContainEqual(mine);
    expect(after.trials).toHaveLength(6);
    expect(after.trials.slice(0, 2)).toEqual([trial('s-local', 20_100), trial('s-local', 20_200, { correct: true, rtMs: 300 })]);
    for (const t of TRIALS) expect(after.trials).toContainEqual(t);
    // Ohne Zeitstempel gilt, was auf dem Gerät steht; Fehlendes wird ergänzt.
    expect(after.settings).toEqual([SETTINGS[0], { key: 'theme', value: 'light' }]);
    expect(after.reviews).toEqual([{ ...REVIEWS[0]!, due: 999, lapses: 5 }]);
  });

  it('dieselbe Sitzung auf beiden Seiten: Durchgänge werden vereinigt, nicht verdoppelt', async () => {
    const db = freshDb();
    const shared = trial('s-a', 1100);
    const onlyLocal = trial('s-a', 1300, { correct: true });
    // Gleicher Zeitpunkt, anderer Inhalt: zählt als eigener Durchgang und geht nicht verloren.
    const sameTsOtherContent = trial('s-a', 1500, { response: { shape: 'truck', spot: 1 } });
    await db.sessions.add(session('s-a', { endedAt: null, completed: false, summary: null }));
    await db.trials.bulkAdd([shared, onlyLocal, sameTsOtherContent]);

    const report = await createRepo(db).importAll(viaFile(await createRepo(await seeded()).exportAll()));
    expect(report).toEqual({ sessions: 2, trials: 3 });
    const mine = (await tablesOf(db)).trials.filter((t) => t.sessionId === 's-a');
    expect(mine).toEqual([shared, onlyLocal, sameTsOtherContent, TRIALS[1]]);
    // Die beendete Fassung der Sitzung ersetzt die unbeendete – nie umgekehrt.
    expect(await db.sessions.get('s-a')).toEqual(SESSIONS[0]);
    const back = createRepo(await seeded());
    await back.importAll(viaFile(await createRepo(db).exportAll()));
    expect((await back.exportAll()).tables.sessions.find((s) => s.id === 's-a')).toEqual(SESSIONS[0]);
  });

  it('gleiche Durchgänge werden auch dann erkannt, wenn die Felder anders sortiert sind', async () => {
    const db = await seeded();
    const backup = await createRepo(db).exportAll();
    const reversed = (v: unknown): unknown =>
      Array.isArray(v) ? v.map(reversed) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).reverse().map(([k, x]) => [k, reversed(x)])) : v;
    expect(await createRepo(db).importAll(reversed(viaFile(backup)))).toEqual({ sessions: 0, trials: 0 });
  });

  it('Spielzustand: der zuletzt gespeicherte gilt, ein gespieltes Tutorial bleibt gespielt', async () => {
    const db = freshDb();
    await db.gameState.bulkAdd([
      { gameId: 'arithmetic', stateVersion: 2, state: { levels: { mul: 9 } }, tutorialDone: false, updatedAt: 9001 },
      { gameId: 'ufov', stateVersion: 1, state: { stage: 1 }, tutorialDone: true, updatedAt: 1999 },
    ]);
    await createRepo(db).importAll(viaFile(await createRepo(await seeded()).exportAll()));
    expect(await db.gameState.get('arithmetic')).toEqual({ gameId: 'arithmetic', stateVersion: 2, state: { levels: { mul: 9 } }, tutorialDone: true, updatedAt: 9001 });
    expect(await db.gameState.get('ufov')).toEqual({ ...GAME_STATE[1]!, tutorialDone: true });
  });

  it('Tagesprogramm: derselbe Durchlauf wird ergänzt, gespielte Schritte bleiben', async () => {
    const db = freshDb();
    await db.programRuns.add({
      ...RUNS[0]!,
      finishedAt: 9999,
      steps: [
        { gameId: 'ufov', mode: 'standard', sessionId: 's-x' },
        { gameId: 'arithmetic', mode: 'sprint', sessionId: null },
      ],
    });
    await createRepo(db).importAll(viaFile(await createRepo(await seeded()).exportAll()));
    expect(await db.programRuns.get('run-1')).toEqual({
      ...RUNS[0]!,
      finishedAt: 9999,
      steps: [
        { gameId: 'ufov', mode: 'standard', sessionId: 's-x' },
        { gameId: 'arithmetic', mode: 'sprint', sessionId: 's-b' },
      ],
    });
  });

  it('lehnt fremde, beschädigte und zu neue Dateien ab und lässt die Daten unberührt', async () => {
    const db = await seeded();
    const repo = createRepo(db);
    const before = await repo.exportAll(1);
    const good = viaFile(before) as Backup;
    const bad: unknown[] = [
      null,
      'text',
      [],
      { ...good, app: 'other' },
      { ...good, schemaVersion: SCHEMA_VERSION + 1 },
      { ...good, schemaVersion: 0 },
      { ...good, schemaVersion: '1' },
      { ...good, tables: undefined },
      { ...good, tables: { ...good.tables, trials: undefined } },
      { ...good, tables: { ...good.tables, extra: [] } },
      // Datensatz ohne Schlüssel: Der ganze Import wird verworfen, auch die gültige neue Sitzung davor.
      { ...good, tables: { ...good.tables, sessions: [session('s-new'), { gameId: 'x' }] } },
    ];
    for (const data of bad) await expect(repo.importAll(data)).rejects.toBeInstanceOf(BackupError);
    expect(await repo.exportAll(1)).toEqual(before);
  });

  it('räumt die Hilfsdatenbank des Imports wieder weg', async () => {
    const db = await seeded();
    const repo = createRepo(db);
    await repo.importAll(viaFile(await repo.exportAll()));
    await expect(repo.importAll({ app: 'brainup', schemaVersion: 1, tables: {} })).rejects.toBeInstanceOf(BackupError);
    const names = (await indexedDB.databases()).map((d) => d.name ?? '');
    expect(names.filter((name) => name.includes('-import-'))).toEqual([]);
  });

  it('eine ältere Sicherung läuft beim Import durch dieselben Upgrade-Schritte wie die Datenbank', async () => {
    // Gedachte Version 2: Sitzungen bekommen einen Index auf ein neues Feld, das der Upgrade-Schritt füllt.
    const v2: SchemaStep[] = [
      ...SCHEMA,
      {
        stores: { sessions: 'id, [gameId+startedAt], day, programRunId, device' },
        upgrade: (tx) => tx.table('sessions').toCollection().modify((s: Record<string, unknown>) => { s.device = 'alt'; }),
      },
    ];
    const old = await createRepo(await seeded()).exportAll(1);
    expect(old.schemaVersion).toBe(1);

    const db = freshDb(v2);
    await db.sessions.add({ ...session('s-v2'), device: 'neu' } as Session);
    expect(await createRepo(db).importAll(viaFile(old))).toEqual({ sessions: 3, trials: 4 });
    const after = await createRepo(db).exportAll(1);
    expect(after.schemaVersion).toBe(2);
    expect(after.tables.sessions).toEqual([
      ...SESSIONS.map((s) => ({ ...s, device: 'alt' })),
      { ...session('s-v2'), device: 'neu' },
    ]);
    expect(after.tables.trials).toEqual(TRIALS);
    // Eine Sicherung im neuen Stand wird nicht noch einmal umgebaut.
    const again = freshDb(v2);
    await createRepo(again).importAll(viaFile(after));
    expect((await createRepo(again).exportAll(1)).tables).toEqual(after.tables);
  });
});
