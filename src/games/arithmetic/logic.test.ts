import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { seededRng } from '../../core/rng';
import { DAY, MINUTE } from '../../core/srs';
import { BrainUpDB } from '../../data/db';
import { createRepo } from '../../data/repo';
import type { Trial } from '../../data/types';
import { answerInput, check, generate, KINDS } from './generators';
import { arithmetic } from './index';
import { activeKinds, applyAnswer, fromRecord, initialState, levelOf, levelOfKind, outcomeIn, outcomeOf, pickKind, slowMs, summarize, toRecord } from './logic';
import { dueTasks, recordReview } from './reviews';
import { trickFor } from './tricks';

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

  it('die Rechenvorschrift übersteht das Speichern: Der Rechentrick ist danach derselbe; alte Einträge ohne sie bleiben spielbar', () => {
    const rng = seededRng(31);
    let withTrick = 0;
    for (const kind of KINDS)
      for (let level = 1; level <= 10; level++)
        for (let i = 0; i < 20; i++) {
          const task = generate(rng, kind, level);
          const record = JSON.parse(JSON.stringify(toRecord(task)));
          expect(trickFor(fromRecord(record)), task.key).toEqual(trickFor(task));
          if (trickFor(task)) withTrick++;
          const { expr: _expr, ...old } = record;
          expect(check(fromRecord(old), answerInput(task)), task.key).toBe(true);
        }
    expect(withTrick).toBeGreaterThan(1200);
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

describe('Auswahl der Rechenarten', () => {
  it('gespeicherte Auswahl in fester Reihenfolge; Unbekanntes fällt weg; leer oder kaputt heißt alle', () => {
    expect(activeKinds(['percent', 'table'])).toEqual(['table', 'percent']);
    expect(activeKinds(['table', 'table', 'gibtsnicht', 7])).toEqual(['table']);
    for (const broken of [undefined, null, [], ['gibtsnicht'], 'table', { table: true }]) expect(activeKinds(broken)).toEqual([...KINDS]);
  });

  it('der gemischte Lauf bleibt in der Auswahl – auch mit nur einer Rechenart', () => {
    const rng = seededRng(12);
    let previous: (typeof KINDS)[number] | undefined;
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const kind = pickKind(rng, previous, activeKinds(['div', 'power', 'estimate']));
      expect(kind).not.toBe(previous);
      seen.add(kind);
      previous = kind;
    }
    expect([...seen].sort()).toEqual(['div', 'estimate', 'power']);
    expect(pickKind(rng, 'add', activeKinds(['add']))).toBe('add');
  });
});

describe('Modi', () => {
  it('die Modus-IDs stehen in gespeicherten Sitzungen und bleiben, wie sie sind', () => {
    expect(arithmetic.modes.map((m) => m.id)).toEqual(['sprint', 'precision', 'review']);
    expect(arithmetic.modes.map((m) => m.budget)).toEqual([{ seconds: 60 }, { trials: 15 }, { trials: 10 }]);
  });

  it('Präzision kennt kein „langsam“; Sprint und Fehlertraining werten das Tempo', () => {
    const task = generate(seededRng(3), 'mul', 4);
    const slow = slowMs('mul', 4) + 1;
    expect(outcomeIn('precision', task, true, slow)).toBe('good');
    expect(outcomeIn('precision', task, true, null)).toBe('good');
    expect(outcomeIn('precision', task, false, 100)).toBe('wrong');
    for (const mode of ['sprint', 'review'] as const) {
      expect(outcomeIn(mode, task, true, slow)).toBe('slow');
      expect(outcomeIn(mode, task, true, slow - 2)).toBe('good');
      expect(outcomeIn(mode, task, false, 100)).toBe('wrong');
    }
  });

  it('Fehlertraining: nur fällige Aufgaben dieses Spiels, die am längsten fälligen zuerst, höchstens so viele wie die Sitzung fasst', async () => {
    const db = new BrainUpDB('arith-due');
    const repo = createRepo(db);
    const rng = seededRng(21);
    const tasks = KINDS.map((kind) => generate(rng, kind, 3));
    // Fälligkeit bewusst nicht in der Reihenfolge des Anlegens: Aufgabe i ist bei (7·i mod 10) + 1 Stunden fällig.
    const HOUR = 60 * MINUTE;
    const dueAt = (i: number) => (((7 * i) % 10) + 1) * HOUR;
    for (const [i, task] of tasks.entries()) {
      await repo.putReview({ key: task.key, gameId: 'arithmetic', kind: task.kind, task: toRecord(task), due: dueAt(i), intervalDays: 0, streak: 0, lapses: 1 });
    }
    await repo.putReview({ key: 'fremd', gameId: 'other', kind: 'x', task: null, due: 1, intervalDays: 0, streak: 0, lapses: 1 });

    const byDue = tasks.map((t, i) => ({ key: t.key, due: dueAt(i) })).sort((a, b) => a.due - b.due).map((x) => x.key);
    expect((await dueTasks(repo, 0)).map((t) => t.key)).toEqual([]);
    expect((await dueTasks(repo, 4 * HOUR)).map((t) => t.key)).toEqual(byDue.slice(0, 4));
    expect((await dueTasks(repo, 4 * HOUR - 1)).map((t) => t.key)).toEqual(byDue.slice(0, 3));
    expect((await dueTasks(repo, DAY)).map((t) => t.key)).toEqual(byDue);
    expect((await dueTasks(repo, DAY, 3)).map((t) => t.key)).toEqual(byDue.slice(0, 3));
    // Jede geladene Aufgabe ist spielbar: Die gespeicherte Lösung wird als richtig erkannt.
    for (const task of await dueTasks(repo, DAY)) expect(check(task, answerInput(task)), task.key).toBe(true);

    // Nach der Antwort ist die Aufgabe in dieser Sitzung nicht mehr fällig – auch nicht nach einem Fehler.
    const [first, second] = await dueTasks(repo, DAY, 2);
    await recordReview(repo, first!, 'wrong', DAY);
    await recordReview(repo, second!, 'good', DAY);
    const left = (await dueTasks(repo, DAY + MINUTE)).map((t) => t.key);
    expect(left).toEqual(byDue.slice(2));
    expect((await dueTasks(repo, DAY + 10 * MINUTE)).map((t) => t.key)).toContain(first!.key);
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
