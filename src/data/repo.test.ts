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
  it('Sitzungen eines Zeitraums über alle Spiele; Durchgänge eines Spiels ab einem Zeitpunkt in Zeitfolge', async () => {
    const repo = fresh();
    const at = (day: number) => new Date(2026, 10, day, 12).getTime();
    for (const [game, day] of [['a', 14], ['b', 15], ['a', 16], ['b', 17]] as const) await repo.startSession(game, 'm', null, at(day));
    const days = (await repo.sessionsBetweenDays('2026-11-15', '2026-11-16')).map((s) => `${s.gameId}:${s.day}`).sort();
    expect(days).toEqual(['a:2026-11-16', 'b:2026-11-15']);
    expect(await repo.sessionsBetweenDays('2027-01-01', '2027-12-31')).toEqual([]);

    const trial = (gameId: string, ts: number) => ({ sessionId: 's', gameId, kind: '', ts, task: null, response: null, rtMs: 1, correct: true, difficulty: 1 });
    for (const [game, ts] of [['a', 30], ['b', 20], ['a', 10], ['a', 20]] as const) await repo.addTrial(trial(game, ts));
    expect((await repo.trialsOfGame('a')).map((t) => t.ts)).toEqual([10, 20, 30]);
    expect((await repo.trialsOfGame('a', 20)).map((t) => t.ts)).toEqual([20, 30]);
    expect(await repo.trialsOfGame('c')).toEqual([]);
  });

  it('Tagesprogramm: Durchlauf speichern, überschreiben, per ID und je Tag lesen', async () => {
    const repo = fresh();
    const run = { id: 'r1', day: '2026-11-15', startedAt: 1, finishedAt: null, steps: [{ gameId: 'rotation', mode: 'standard', sessionId: null }] };
    await repo.putProgramRun(run);
    await repo.putProgramRun({ ...run, id: 'r2', day: '2026-11-14' });
    await repo.putProgramRun({ ...run, finishedAt: 9, steps: [{ ...run.steps[0]!, sessionId: 's1' }] });
    expect(await repo.getProgramRun('r1')).toMatchObject({ finishedAt: 9, steps: [{ sessionId: 's1' }] });
    expect(await repo.getProgramRun('nope')).toBeUndefined();
    expect((await repo.programRunsOfDay('2026-11-15')).map((r) => r.id)).toEqual(['r1']);
  });
});
