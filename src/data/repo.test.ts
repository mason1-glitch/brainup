import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { BrainUpDB } from './db';
import { createRepo, localDay } from './repo';

let n = 0;
const fresh = () => createRepo(new BrainUpDB(`test-${n++}`));

describe('repo', () => {
  it('speichert Sitzung und Durchgänge roh und liest sie in Zeitfolge', async () => {
    const repo = fresh();
    const s = await repo.startSession('rotation', 'standard', null, 1000);
    await repo.addTrial({ sessionId: s.id, gameId: 'rotation', kind: '', ts: 30, task: { a: 1 }, response: 1, rtMs: 500, correct: true, difficulty: 3 });
    await repo.addTrial({ sessionId: s.id, gameId: 'rotation', kind: '', ts: 20, task: { a: 2 }, response: 0, rtMs: null, correct: false, difficulty: 3 });
    await repo.finishSession(s.id, null, true, 2000);
    const trials = await repo.trialsOfSession(s.id);
    expect(trials.map((t) => t.ts)).toEqual([20, 30]);
    expect(trials[1]!.task).toEqual({ a: 1 });
    const [session] = await repo.sessionsOfGame('rotation');
    expect(session).toMatchObject({ completed: true, endedAt: 2000, day: localDay(1000) });
  });

  it('listet Sitzungen je Spiel, neueste zuerst', async () => {
    const repo = fresh();
    await repo.startSession('a', 'm', null, 1);
    await repo.startSession('b', 'm', null, 2);
    await repo.startSession('a', 'm', null, 3);
    expect((await repo.sessionsOfGame('a')).map((s) => s.startedAt)).toEqual([3, 1]);
  });

  it('Spielzustand und Tutorial-Status überschreiben sich nicht gegenseitig', async () => {
    const repo = fresh();
    await repo.markTutorialDone('ufov');
    await repo.saveGameState('ufov', 1, { value: 80 });
    expect(await repo.loadGameState('ufov')).toMatchObject({ tutorialDone: true, state: { value: 80 }, stateVersion: 1 });
  });

  it('Einstellungen mit Rückfallwert', async () => {
    const repo = fresh();
    expect(await repo.getSetting('sound', true)).toBe(true);
    await repo.setSetting('sound', false);
    expect(await repo.getSetting('sound', true)).toBe(false);
  });

  it('liefert nur fällige Wiederholungen des Spiels', async () => {
    const repo = fresh();
    const base = { gameId: 'arithmetic', kind: 'mul', task: null, intervalDays: 1, streak: 0, lapses: 1 };
    await repo.putReview({ ...base, key: 'a', due: 100 });
    await repo.putReview({ ...base, key: 'b', due: 300 });
    await repo.putReview({ ...base, key: 'c', due: 50, gameId: 'other' });
    expect((await repo.dueReviews('arithmetic', 200)).map((r) => r.key)).toEqual(['a']);
  });
});
