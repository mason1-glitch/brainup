import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { seededRng } from '../../core/rng';
import { DAY, MINUTE } from '../../core/srs';
import { BrainUpDB } from '../../data/db';
import { createRepo } from '../../data/repo';
import type { Trial } from '../../data/types';
import { answerInput, check, generate, KINDS } from './generators';
import { applyAnswer, fromRecord, initialState, levelOf, levelOfKind, outcomeOf, pickKind, slowMs, summarize, toRecord } from './logic';
import { dueTasks, recordReview } from './reviews';

describe('Adaptivität je Rechentyp', () => {
  const task = generate(seededRng(1), 'mul', 1);

  it('zwei zügige Treffer → schwerer, ein Fehler → leichter, nur im betroffenen Typ', () => {
    let s = initialState();
    s = applyAnswer(s, task, 'good');
    expect(levelOfKind(s, 'mul')).toBe(1);
    s = applyAnswer(s, task, 'good');
    expect(levelOfKind(s, 'mul')).toBe(2);
    expect(levelOfKind(s, 'add')).toBe(1);
    s = applyAnswer(s, task, 'wrong');
    expect(levelOfKind(s, 'mul')).toBe(1);
  });

  it('langsame richtige Antworten ändern nichts (Tempo zählt)', () => {
    const s = applyAnswer(initialState(), task, 'good');
    expect(applyAnswer(s, task, 'slow')).toBe(s);
    expect(outcomeOf(task, true, slowMs('mul', 1) + 1)).toBe('slow');
    expect(outcomeOf(task, true, slowMs('mul', 1) - 1)).toBe('good');
    expect(outcomeOf(task, false, 100)).toBe('wrong');
    expect(slowMs('table', 3)).toBeLessThan(slowMs('mul', 3));
    expect(slowMs('mul', 8)).toBeGreaterThan(slowMs('mul', 2));
  });

  it('Anzeige-Level ist das Mittel der Typen', () => {
    let s = initialState();
    expect(levelOf(s)).toBe(1);
    for (const kind of KINDS) for (let i = 0; i < 4; i++) s = applyAnswer(s, generate(seededRng(i), kind, 1), 'good');
    expect(levelOf(s)).toBe(3);
  });

  it('gemischter Lauf: nie derselbe Typ direkt hintereinander, alle Typen kommen vor', () => {
    const rng = seededRng(4);
    const seen = new Set<string>();
    let prev = pickKind(rng);
    for (let i = 0; i < 500; i++) {
      const k = pickKind(rng, prev);
      expect(k).not.toBe(prev);
      seen.add(k);
      prev = k;
    }
    expect(seen.size).toBe(KINDS.length);
    expect(pickKind(rng, 'add', ['add'])).toBe('add');
  });
});

describe('Speicherform und Wiederholungen', () => {
  it('Aufgabe → JSON → Aufgabe bleibt prüfbar', () => {
    const rng = seededRng(8);
    for (const kind of KINDS)
      for (let level = 1; level <= 10; level++) {
        const task = generate(rng, kind, level);
        const back = fromRecord(JSON.parse(JSON.stringify(toRecord(task))));
        expect(check(back, answerInput(task)), task.key).toBe(true);
        expect(back).toMatchObject({ key: task.key, text: task.text, hint: task.hint, format: task.format });
      }
  });

  it('falsch → bald wieder fällig; gut beantwortet → später; gelernt → entfernt', async () => {
    const repo = createRepo(new BrainUpDB('arith-reviews'));
    const [a, b] = [generate(seededRng(1), 'table', 6), generate(seededRng(2), 'percent', 3)];
    await recordReview(repo, a, 'good', 0); // nie falsch gewesen → kein Eintrag
    expect(await dueTasks(repo, 10 * DAY)).toHaveLength(0);

    await recordReview(repo, a, 'wrong', 0);
    await recordReview(repo, b, 'slow', 0);
    expect(await dueTasks(repo, 5 * MINUTE)).toHaveLength(0);
    expect((await dueTasks(repo, 10 * MINUTE)).map((t) => t.key)).toEqual([a.key]);
    expect((await dueTasks(repo, DAY)).map((t) => t.key)).toEqual([a.key, b.key]);

    let now = 10 * MINUTE;
    for (let i = 0; i < 4; i++) {
      await recordReview(repo, a, 'good', now);
      now += 30 * DAY;
    }
    expect((await dueTasks(repo, now)).map((t) => t.key)).toEqual([b.key]);
  });
});

describe('Wertung', () => {
  it('schwerere Aufgaben zählen mehr', () => {
    const t = (correct: boolean, difficulty: number): Trial => ({ sessionId: 's', gameId: 'arithmetic', kind: 'add', ts: 0, task: null, response: '', rtMs: 2000, correct, difficulty });
    const s = summarize([t(true, 1), t(true, 4), t(false, 9)], initialState());
    expect(s).toMatchObject({ score: 50, trials: 3, medianRtMs: 2000 });
    expect(s.headline).toEqual({ label: 'Punkte', value: '50' });
    expect(s.extra[0]!.value).toBe('2 von 3');
  });
});
