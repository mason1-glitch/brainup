import { describe, expect, it } from 'vitest';
import { classify, DAY, GRADUATE_STREAK, MINUTE, pickDue, schedule, type SrsState } from './srs';

describe('classify', () => {
  it('unterscheidet falsch, langsam, gut', () => {
    expect(classify(false, 500, 4000)).toBe('wrong');
    expect(classify(true, 4500, 4000)).toBe('slow');
    expect(classify(true, null, 4000)).toBe('slow');
    expect(classify(true, 1200, 4000)).toBe('good');
  });
});

describe('schedule', () => {
  it('nimmt nur falsche und langsame Aufgaben auf', () => {
    expect(schedule(undefined, 'good', 0)).toBeNull();
    expect(schedule(undefined, 'wrong', 0)).toEqual({ due: 10 * MINUTE, intervalDays: 0, streak: 0, lapses: 1 });
    expect(schedule(undefined, 'slow', 0)).toEqual({ due: DAY, intervalDays: 1, streak: 0, lapses: 0 });
  });

  it('wachsende Abstände bei richtigen Antworten, dann gelernt', () => {
    let s: SrsState | null = schedule(undefined, 'wrong', 0);
    const intervals: number[] = [];
    let now = 0;
    for (let i = 0; s && i < 10; i++) {
      now = s.due;
      s = schedule(s, 'good', now);
      if (s) intervals.push(s.intervalDays);
    }
    expect(intervals).toEqual([1, 3, 8]);
    expect(s).toBeNull();
    expect(intervals.length).toBe(GRADUATE_STREAK - 1);
  });

  it('ein Fehler setzt Abstand und Serie zurück und zählt mit', () => {
    const learned: SrsState = { due: 0, intervalDays: 8, streak: 3, lapses: 1 };
    expect(schedule(learned, 'wrong', 1000)).toEqual({ due: 1000 + 10 * MINUTE, intervalDays: 0, streak: 0, lapses: 2 });
    expect(schedule(learned, 'slow', 1000)).toMatchObject({ intervalDays: 1, streak: 0, lapses: 1 });
  });
});

describe('pickDue', () => {
  const items = [
    { key: 'a', due: 100 },
    { key: 'b', due: 50 },
    { key: 'c', due: 900 },
  ];
  it('älteste fällige zuerst, nicht Fälliges nie', () => {
    expect(pickDue(items, 500, [])?.key).toBe('b');
    expect(pickDue(items, 10, [])).toBeUndefined();
  });
  it('wiederholt nicht innerhalb des Mindestabstands', () => {
    expect(pickDue(items, 500, ['b'])?.key).toBe('a');
    expect(pickDue(items, 500, ['b', 'x', 'y', 'z'])?.key).toBe('b');
    expect(pickDue(items, 500, ['a', 'b'])).toBeUndefined();
  });
});
