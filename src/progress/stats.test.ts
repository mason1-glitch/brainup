import { describe, expect, it } from 'vitest';
import type { Session, Trial } from '../data/types';
import { activeDays, addDays, addMonths, bests, history, kindStats, mondayOf, monthGrid, smooth, weekdayOf, weekStatus } from './stats';

const session = (day: string, startedAt: number, over: Partial<Session> = {}, score = 100, level = 1): Session => ({
  id: `${day}-${startedAt}`,
  gameId: 'rotation',
  mode: 'standard',
  day,
  startedAt,
  endedAt: startedAt + 1,
  completed: true,
  programRunId: null,
  summary: { score, level, accuracy: 0.8, medianRtMs: 900, trials: 20, headline: { label: '', value: '' }, extra: [] },
  ...over,
});

describe('Kalender', () => {
  it('Tage zählen über Monats-, Jahres- und Zeitumstellungsgrenzen', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
    // Zeitumstellung in Deutschland: 25.10.2026 und 28.03.2027.
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2027-03-27', 2)).toBe('2027-03-29');
  });

  it('Wochentage: der 16.11.2026 ist ein Montag', () => {
    expect(weekdayOf('2026-11-16')).toBe(0);
    expect(weekdayOf('2026-11-22')).toBe(6);
    expect(weekdayOf('2026-06-15')).toBe(0);
    expect(mondayOf('2026-11-22')).toBe('2026-11-16');
    expect(mondayOf('2026-11-16')).toBe('2026-11-16');
    expect(mondayOf('2027-01-01')).toBe('2026-12-28');
  });

  it('Kalenderblatt November 2026: beginnt an einem Sonntag, sechs Wochenzeilen', () => {
    const grid = monthGrid('2026-11');
    expect(grid).toHaveLength(6);
    for (const week of grid) expect(week).toHaveLength(7);
    expect(grid[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(grid[1]![0]).toBe('2026-11-02');
    expect(grid[5]).toEqual(['2026-11-30', null, null, null, null, null, null]);
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
    // Februar 2027 beginnt an einem Montag und füllt genau vier Zeilen.
    expect(monthGrid('2027-02')).toHaveLength(4);
    expect(monthGrid('2027-02')[0]![0]).toBe('2027-02-01');
    expect(monthGrid('2028-02').flat().filter(Boolean)).toHaveLength(29);
  });

  it('Monate vor und zurück', () => {
    expect(addMonths('2026-11', 1)).toBe('2026-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2027-01', -1)).toBe('2026-12');
    expect(addMonths('2026-11', -11)).toBe('2025-12');
  });
});

describe('Wochenziel', () => {
  const sessions = [
    session('2026-11-15', 1), // Sonntag der Vorwoche
    session('2026-11-16', 2),
    session('2026-11-16', 3),
    session('2026-11-18', 4, { completed: false, summary: null }), // abgebrochen zählt nicht
    session('2026-11-19', 5),
  ];

  it('zählt Tage mit beendeter Sitzung in der laufenden Woche (Montag bis Sonntag)', () => {
    const active = activeDays(sessions);
    expect([...active]).toEqual([['2026-11-15', 1], ['2026-11-16', 2], ['2026-11-19', 1]]);
    const week = weekStatus(active, '2026-11-19', 4);
    expect(week.days.map((d) => d.day)).toEqual(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']);
    expect(week.days.map((d) => d.active)).toEqual([true, false, false, true, false, false, false]);
    expect(week.days.map((d) => d.future)).toEqual([false, false, false, false, true, true, true]);
    expect(week).toMatchObject({ done: 2, goal: 4, reached: false });
    expect(weekStatus(active, '2026-11-19', 2).reached).toBe(true);
  });

  it('eine neue Woche beginnt bei null – ohne Strafe für die alte', () => {
    expect(weekStatus(activeDays(sessions), '2026-11-23', 4)).toMatchObject({ done: 0, reached: false });
  });
});

describe('Verlauf und Bestwerte', () => {
  it('Verlauf: nur beendete Sitzungen, älteste zuerst', () => {
    const points = history([
      session('2026-11-03', 30, {}, 300, 5),
      session('2026-11-01', 10, {}, 100, 2),
      session('2026-11-02', 20, { completed: false, summary: null }),
      session('2026-11-02', 25, {}, 200, 3),
    ]);
    expect(points.map((p) => [p.day, p.level, p.score])).toEqual([['2026-11-01', 2, 100], ['2026-11-02', 3, 200], ['2026-11-03', 5, 300]]);
    expect(points[0]).toMatchObject({ accuracy: 0.8, medianRtMs: 900 });
  });

  it('Glätten: Mittel der letzten drei Werte, am Anfang über das, was da ist', () => {
    expect(smooth([3, 6, 9, 0, 3])).toEqual([3, 4.5, 6, 5, 4]);
    expect(smooth([5])).toEqual([5]);
    expect(smooth([])).toEqual([]);
    expect(smooth([1, 3], 1)).toEqual([1, 3]);
  });

  it('Bestwert je Modus; bei Gleichstand zählt der frühere Tag', () => {
    const best = bests([
      session('2026-11-01', 10, { mode: 'sprint' }, 400),
      session('2026-11-02', 20, { mode: 'sprint' }, 700),
      session('2026-11-03', 30, { mode: 'sprint' }, 700),
      session('2026-11-04', 40, { mode: 'precision' }, 150),
      session('2026-11-05', 50, { mode: 'sprint', completed: false, summary: null }),
    ]);
    expect([...best]).toEqual([['sprint', { score: 700, day: '2026-11-02' }], ['precision', { score: 150, day: '2026-11-04' }]]);
  });

  it('Kennzahlen je Untertyp: Trefferquote, Median-Zeit der richtigen, Schwierigkeit der letzten zehn', () => {
    const trial = (kind: string, ts: number, correct: boolean, rtMs: number | null, difficulty: number): Trial => ({
      sessionId: 's', gameId: 'arithmetic', kind, ts, task: null, response: null, rtMs, correct, difficulty,
    });
    const stats = kindStats([
      trial('mul', 3, true, 3000, 2),
      trial('add', 1, true, 1000, 1),
      trial('add', 2, false, 500, 1),
      trial('add', 4, true, 2000, 3),
      // Zwölf weitere Additionen auf Stufe 5: Die ersten beiden (Stufe 1) fallen aus dem Fenster der letzten zehn.
      ...Array.from({ length: 12 }, (_, i) => trial('add', 10 + i, true, 1500, 5)),
    ]);
    expect(stats.map((s) => s.kind)).toEqual(['add', 'mul']);
    expect(stats[0]).toMatchObject({ trials: 15, medianRtMs: 1500, level: 5 });
    expect(stats[0]!.accuracy).toBeCloseTo(14 / 15);
    expect(stats[1]).toEqual({ kind: 'mul', trials: 1, accuracy: 1, medianRtMs: 3000, level: 2 });
    expect(kindStats([])).toEqual([]);
  });
});
