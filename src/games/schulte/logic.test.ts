import { describe, expect, it } from 'vitest';
import { seededRng } from '../../core/rng';
import { updateStaircase } from '../../core/staircase';
import type { Trial } from '../../data/types';
import {
  initialState,
  isPassed,
  kindOf,
  LEVELS,
  levelOf,
  makeBoard,
  makeTrial,
  nextTarget,
  parMs,
  points,
  replay,
  sequence,
  STAIRCASE,
  summarize,
  type Order,
  type SchulteTrial,
  type Tap,
} from './logic';

const ALL_LEVELS = LEVELS.map((_, i) => i + 1);

/**
 * Unabhängiger Spieler: kennt nur die Regel in Worten und sucht die Zahlen selbst auf der Tafel –
 * ohne `sequence` oder `nextTarget` aus der Logik.
 */
function solve(trial: SchulteTrial, msPerTap = 500): Tap[] {
  const left = [...trial.cells].sort((a, b) => a - b);
  const taps: Tap[] = [];
  let low = true;
  while (left.length > 0) {
    const n = trial.order === 'up' || (trial.order === 'alt' && low) ? left.shift()! : left.pop()!;
    low = !low;
    taps.push({ n, t: (taps.length + 1) * msPerTap });
  }
  return taps;
}

describe('Zahlensuche: Tafeln', () => {
  it('jede Tafel enthält jede Zahl von 1 bis N genau einmal (600 Seeds je Level)', () => {
    for (const level of ALL_LEVELS) {
      for (let seed = 0; seed < 600; seed++) {
        const trial = makeTrial(seededRng(seed * 31 + level), level);
        const n = trial.cols * trial.rows;
        expect(trial.level).toBe(level);
        expect(trial.cells).toHaveLength(n);
        const seen = new Array<number>(n + 1).fill(0);
        for (const c of trial.cells) seen[c]!++;
        expect(seen.slice(1).every((count) => count === 1)).toBe(true);
      }
    }
  });

  it('die Tafel ist gemischt: Jede Zahl landet auf jedem Feld etwa gleich oft', () => {
    const rng = seededRng(7);
    const rounds = 9000;
    const hits = Array.from({ length: 9 }, () => new Array<number>(9).fill(0));
    for (let i = 0; i < rounds; i++) makeTrial(rng, 1).cells.forEach((n, pos) => hits[n - 1]![pos]!++);
    for (const row of hits) for (const count of row) expect(Math.abs(count - rounds / 9)).toBeLessThan(150);
  });

  it('zwei Tafeln hintereinander sind verschieden', () => {
    const rng = seededRng(3);
    for (const level of ALL_LEVELS) expect(makeTrial(rng, level).cells).not.toEqual(makeTrial(rng, level).cells);
  });

  it('Level werden schwerer: mehr Zahlen, dann andere Reihenfolgen; Grenzen halten', () => {
    const sizes = LEVELS.map((l) => l.cols * l.rows);
    expect(sizes[0]).toBe(9);
    expect(Math.max(...sizes)).toBe(36);
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]!).toBeGreaterThanOrEqual(sizes[i - 1]!);
    // Bis 6×6 aufwärts, danach bleiben die Tafeln groß und die Reihenfolge ändert sich.
    const firstMixed = LEVELS.findIndex((l) => l.order !== 'up');
    expect(LEVELS.slice(0, firstMixed).every((l) => l.order === 'up')).toBe(true);
    expect(sizes[firstMixed - 1]).toBe(36);
    expect(LEVELS.slice(firstMixed).map((l) => l.order)).toEqual(['down', 'alt']);
    // Hochkant: nie breiter als hoch, höchstens sechs Spalten (Touchflächen).
    for (const l of LEVELS) expect(l.cols <= l.rows && l.cols <= 6).toBe(true);
    expect(makeTrial(seededRng(1), 0).level).toBe(1);
    expect(makeTrial(seededRng(1), 99).level).toBe(LEVELS.length);
    expect(STAIRCASE.max).toBe(LEVELS.length);
  });
});

describe('Zahlensuche: Reihenfolge', () => {
  it('Beispiele', () => {
    expect(sequence(4, 'up')).toEqual([1, 2, 3, 4]);
    expect(sequence(4, 'down')).toEqual([4, 3, 2, 1]);
    expect(sequence(4, 'alt')).toEqual([1, 4, 2, 3]);
    expect(sequence(9, 'alt')).toEqual([1, 9, 2, 8, 3, 7, 4, 6, 5]);
  });

  it('jede Reihenfolge nennt jede Zahl genau einmal', () => {
    for (const order of ['up', 'down', 'alt'] as Order[]) {
      for (const n of [1, 2, 9, 12, 25, 36]) {
        expect([...sequence(n, order)].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i + 1));
      }
    }
  });

  it('der unabhängige Spieler löst jede Tafel fehlerfrei – in genau N Tipps', () => {
    for (const level of ALL_LEVELS) {
      for (let seed = 0; seed < 500; seed++) {
        const trial = makeTrial(seededRng(seed + 1000 * level), level);
        const taps = solve(trial);
        const result = replay(trial, taps);
        expect(result).toMatchObject({ found: taps.length, errors: 0, done: true, timeMs: taps.length * 500 });
        // Schritt für Schritt: Das nächste Ziel ist immer die Zahl, die der Spieler als Nächstes tippt.
        taps.forEach((tap, i) => expect(nextTarget(trial, i)).toBe(tap.n));
        expect(nextTarget(trial, taps.length)).toBeNull();
      }
    }
  });
});

describe('Zahlensuche: Tipps auswerten', () => {
  const trial: SchulteTrial = { level: 1, cols: 2, rows: 2, order: 'up', cells: [3, 1, 4, 2] };

  it('Fehltipps zählen als Fehler und bringen nicht weiter', () => {
    const taps: Tap[] = [{ n: 2, t: 300 }, { n: 1, t: 700 }, { n: 4, t: 900 }, { n: 1, t: 950 }, { n: 2, t: 1500 }];
    expect(replay(trial, taps)).toEqual({ found: 2, errors: 3, done: false, timeMs: null, gaps: [700, 800] });
    expect(nextTarget(trial, 2)).toBe(3);
  });

  it('fertig ist die Tafel mit der letzten Zahl; Zeit = Zeitpunkt dieses Tipps, spätere Tipps zählen nicht', () => {
    const taps: Tap[] = [{ n: 1, t: 400 }, { n: 2, t: 900 }, { n: 3, t: 1500 }, { n: 4, t: 2600 }, { n: 1, t: 9000 }];
    expect(replay(trial, taps)).toEqual({ found: 4, errors: 0, done: true, timeMs: 2600, gaps: [400, 500, 600, 1100] });
  });

  it('Zielzeit: eine Sekunde je Zahl plus eine zum Orientieren; genau auf der Zielzeit gilt als geschafft', () => {
    expect(parMs(trial)).toBe(5000);
    expect(parMs({ cols: 6, rows: 6 })).toBe(37_000);
    const at = (t: number): Tap[] => [{ n: 1, t: 1 }, { n: 2, t: 2 }, { n: 3, t: 3 }, { n: 4, t }];
    expect(isPassed(trial, at(5000))).toBe(true);
    expect(isPassed(trial, at(5001))).toBe(false);
    expect(isPassed(trial, at(5000).slice(0, 3))).toBe(false);
  });

  it('Punkte: Zahlen × 10 × Tempo gegen die Zielzeit, begrenzt auf halbes bis doppeltes Tempo', () => {
    expect(points(trial, 5000)).toBe(40);
    expect(points(trial, 2500)).toBe(80);
    expect(points(trial, 100)).toBe(80);
    expect(points(trial, 10_000)).toBe(20);
    expect(points(trial, 60_000)).toBe(20);
    expect(points(trial, 4000)).toBe(50);
  });
});

describe('Zahlensuche: Schwierigkeit und Wertung', () => {
  it('zwei Tafeln in der Zielzeit machen es schwerer, eine darüber leichter', () => {
    let s = initialState();
    expect(levelOf(s)).toBe(1);
    s = { stair: updateStaircase(STAIRCASE, s.stair, true) };
    expect(levelOf(s)).toBe(1);
    s = { stair: updateStaircase(STAIRCASE, s.stair, true) };
    expect(levelOf(s)).toBe(3);
    // Die erste Umkehr geht noch im Zweierschritt zurück, danach in Einerschritten.
    s = { stair: updateStaircase(STAIRCASE, s.stair, false) };
    expect(levelOf(s)).toBe(1);
    s = { stair: updateStaircase(STAIRCASE, s.stair, true) };
    s = { stair: updateStaircase(STAIRCASE, s.stair, true) };
    expect(levelOf(s)).toBe(2);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it('Untertyp nennt Tafelgröße und Reihenfolge', () => {
    expect(kindOf({ cols: 3, rows: 4, order: 'up' })).toBe('3x4');
    expect(kindOf({ cols: 6, rows: 6, order: 'down' })).toBe('6x6-down');
    expect(kindOf({ cols: 6, rows: 6, order: 'alt' })).toBe('6x6-alt');
  });

  it('summarize rechnet nur aus den Rohdaten', () => {
    const small: SchulteTrial = { level: 1, cols: 2, rows: 2, order: 'up', cells: [3, 1, 4, 2] };
    const big = makeBoard(seededRng(5), { cols: 3, rows: 3, order: 'up' });
    const stored = (task: SchulteTrial, taps: Tap[], correct: boolean): Trial => ({
      sessionId: 's', gameId: 'schulte', kind: kindOf(task), ts: 0, task, response: { taps }, rtMs: taps.at(-1)!.t, correct, difficulty: task.level,
    });
    const trials = [
      // 4 Zahlen in 4 s, ein Fehltipp: 50 Punkte.
      stored(small, [{ n: 1, t: 1000 }, { n: 4, t: 1500 }, { n: 2, t: 2000 }, { n: 3, t: 3000 }, { n: 4, t: 4000 }], true),
      // 9 Zahlen in 20 s (Zielzeit 10 s): 45 Punkte.
      stored({ ...big, level: 1 }, solve({ ...big, level: 1 }, 20_000 / 9), false),
    ];
    const state = initialState();
    const summary = summarize(trials, state);
    expect(summary).toMatchObject({
      trials: 2,
      score: 95,
      level: 1,
      headline: { label: 'Punkte', value: '95' },
      extra: [
        { label: 'Tafel 1 · 2×2', value: '4,0 s' },
        { label: 'Tafel 2 · 3×3', value: '20,0 s' },
        { label: 'Fehltipps', value: '1' },
      ],
    });
    // 13 richtige von 14 Tipps; Median der Zeit je gefundener Zahl.
    expect(summary.accuracy).toBeCloseTo(13 / 14);
    expect(summary.medianRtMs).toBeCloseTo(20_000 / 9);
    expect(summarize([], state)).toMatchObject({ trials: 0, score: 0, accuracy: 0, medianRtMs: null });
  });
});
