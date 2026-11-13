// Einziger Zugang zu den Daten. UI und Spiele importieren NUR `repo` aus dieser Datei,
// nie Dexie oder `db.ts` direkt.
import Dexie from 'dexie';
import { BrainUpDB } from './db';
import type {
  GameId,
  GameStateRecord,
  ProgramRun,
  ReviewRecord,
  Session,
  Summary,
  Trial,
} from './types';

export function localDay(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function createRepo(db: BrainUpDB) {
  return {
    async startSession(
      gameId: GameId,
      mode: string,
      programRunId: string | null = null,
      now = Date.now(),
    ): Promise<Session> {
      const session: Session = {
        id: crypto.randomUUID(),
        gameId,
        mode,
        day: localDay(now),
        startedAt: now,
        endedAt: null,
        completed: false,
        programRunId,
        summary: null,
      };
      await db.sessions.add(session);
      return session;
    },

    async addTrial(trial: Omit<Trial, 'id'>): Promise<void> {
      await db.trials.add(trial);
    },

    async finishSession(
      id: string,
      summary: Summary | null,
      completed: boolean,
      now = Date.now(),
    ): Promise<void> {
      await db.sessions.update(id, { summary, completed, endedAt: now });
    },

    trialsOfSession(sessionId: string): Promise<Trial[]> {
      return db.trials.where('sessionId').equals(sessionId).sortBy('ts');
    },

    /** Neueste zuerst. */
    sessionsOfGame(gameId: GameId, limit = 50): Promise<Session[]> {
      return db.sessions
        .where('[gameId+startedAt]')
        .between([gameId, Dexie.minKey], [gameId, Dexie.maxKey])
        .reverse()
        .limit(limit)
        .toArray();
    },

    sessionsOfDay(day: string): Promise<Session[]> {
      return db.sessions.where('day').equals(day).toArray();
    },

    loadGameState(gameId: GameId): Promise<GameStateRecord | undefined> {
      return db.gameState.get(gameId);
    },

    async saveGameState(
      gameId: GameId,
      stateVersion: number,
      state: unknown,
      now = Date.now(),
    ): Promise<void> {
      const prev = await db.gameState.get(gameId);
      await db.gameState.put({
        gameId,
        stateVersion,
        state,
        tutorialDone: prev?.tutorialDone ?? false,
        updatedAt: now,
      });
    },

    async markTutorialDone(gameId: GameId, now = Date.now()): Promise<void> {
      const prev = await db.gameState.get(gameId);
      await db.gameState.put({
        gameId,
        stateVersion: prev?.stateVersion ?? 0,
        state: prev?.state ?? null,
        tutorialDone: true,
        updatedAt: now,
      });
    },

    async getSetting<T>(key: string, fallback: T): Promise<T> {
      const rec = await db.settings.get(key);
      return rec === undefined ? fallback : (rec.value as T);
    },

    async setSetting(key: string, value: unknown): Promise<void> {
      await db.settings.put({ key, value });
    },

    /** Fällige Wiederholungen, älteste zuerst. */
    dueReviews(gameId: GameId, now = Date.now()): Promise<ReviewRecord[]> {
      return db.reviews
        .where('[gameId+due]')
        .between([gameId, Dexie.minKey], [gameId, now], true, true)
        .toArray();
    },

    getReview(key: string): Promise<ReviewRecord | undefined> {
      return db.reviews.get(key);
    },

    async putReview(item: ReviewRecord): Promise<void> {
      await db.reviews.put(item);
    },

    async deleteReview(key: string): Promise<void> {
      await db.reviews.delete(key);
    },

    async putProgramRun(run: ProgramRun): Promise<void> {
      await db.programRuns.put(run);
    },

    programRunsOfDay(day: string): Promise<ProgramRun[]> {
      return db.programRuns.where('day').equals(day).toArray();
    },
  };
}

export type Repo = ReturnType<typeof createRepo>;

/** Die eine Instanz der App. */
export const repo: Repo = createRepo(new BrainUpDB());
