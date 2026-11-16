import { describe, expect, it } from 'vitest';
import { seededRng } from '../../core/rng';
import { initStaircase } from '../../core/staircase';
import type { Trial } from '../../data/types';
import {
  afterBlock,
  BLOCK,
  initialState,
  isCorrect,
  kindOf,
  LEVELS,
  levelOf,
  makeBlock,
  paramsFor,
  POSITIONS,
  rateBlock,
  STAIRCASE,
  summarize,
  TARGETS,
  type NbackState,
} from './logic';

const stateAt = (level: number): NbackState => ({ stair: { ...initStaircase(STAIRCASE), value: level } });

describe('N-Back: Folgen', () => {
  it('Treffer sind genau die Felder, die dem Feld vor n Schritten gleichen – nachgerechnet nur aus den Positionen (600 Seeds je n)', () => {
    for (const n of [1, 2, 3]) {
      for (let seed = 0; seed < 600; seed++) {
        const block = makeBlock(seededRng(seed * 13 + n), n);
        expect(block).toHaveLength(n + BLOCK);
        const positions = block.map((s) => s.position);
        for (const p of positions) expect(Number.isInteger(p) && p >= 0 && p < POSITIONS).toBe(true);
        let targets = 0;
        block.forEach((s, i) => {
          const isTarget = i >= n && positions[i] === positions[i - n];
          expect(s.target).toBe(isTarget);
          expect(s.back).toBe(i >= n ? positions[i - n] : null);
          if (isTarget) targets++;
        });
        expect(targets).toBe(TARGETS);
      }
    }
  });

  it('ein verkürzter Block (nach einer Pause) hat anteilig viele Treffer', () => {
    for (const scored of [1, 2, 5, 10, 19]) {
      for (let seed = 0; seed < 100; seed++) {
        const block = makeBlock(seededRng(seed), 2, scored);
        expect(block).toHaveLength(2 + scored);
        expect(block.filter((s) => s.target)).toHaveLength(Math.round((scored * TARGETS) / BLOCK));
      }
    }
  });

  it('Treffer verteilen sich über den ganzen Block, Felder über das ganze Raster', () => {
    const rng = seededRng(5);
    const rounds = 3000;
    const atIndex = new Array<number>(BLOCK).fill(0);
    const atCell = new Array<number>(POSITIONS).fill(0);
    for (let i = 0; i < rounds; i++) {
      makeBlock(rng, 2).forEach((s, index) => {
        atCell[s.position]!++;
        if (s.target) atIndex[index - 2]!++;
      });
    }
    for (const count of atIndex) expect(Math.abs(count / rounds - TARGETS / BLOCK)).toBeLessThan(0.04);
    for (const count of atCell) expect(Math.abs(count / (rounds * (BLOCK + 2)) - 1 / POSITIONS)).toBeLessThan(0.01);
  });

  it('richtig ist: bei einem Treffer tippen, sonst nicht', () => {
    const [lead, ...rest] = makeBlock(seededRng(1), 1);
    expect(isCorrect(lead!, false)).toBe(true);
    for (const s of rest) {
      expect(isCorrect(s, s.target)).toBe(true);
      expect(isCorrect(s, !s.target)).toBe(false);
    }
  });
});

describe('N-Back: Schwierigkeit', () => {
  it('Level: n steigt von 1 auf 3, bei gleichem n wird das Tempo schneller', () => {
    expect(LEVELS[0]!.n).toBe(1);
    expect(Math.max(...LEVELS.map((l) => l.n))).toBe(3);
    for (let i = 1; i < LEVELS.length; i++) {
      const [a, b] = [LEVELS[i - 1]!, LEVELS[i]!];
      expect(b.n).toBeGreaterThanOrEqual(a.n);
      if (b.n === a.n) expect(b.soaMs).toBeLessThan(a.soaMs);
    }
    expect(STAIRCASE.max).toBe(LEVELS.length);
    expect(paramsFor(0)).toEqual(LEVELS[0]);
    expect(paramsFor(99)).toEqual(LEVELS.at(-1));
    expect(levelOf(initialState())).toBe(1);
  });

  it('ein Block wird nach seinen Fehlern bewertet: sicher → schwerer, viele Fehler → leichter, dazwischen bleibt es', () => {
    // 6 Treffer, 14 andere Felder.
    const block = (misses: number, falseAlarms: number) => [
      ...Array.from({ length: TARGETS }, (_, i) => ({ target: true, pressed: i >= misses })),
      ...Array.from({ length: BLOCK - TARGETS }, (_, i) => ({ target: false, pressed: i < falseAlarms })),
    ];
    expect(rateBlock(block(0, 0))).toEqual({ hits: 6, misses: 0, falseAlarms: 0, verdict: 'up' });
    expect(rateBlock(block(1, 0)).verdict).toBe('up');
    expect(rateBlock(block(0, 1)).verdict).toBe('up');
    expect(rateBlock(block(1, 1))).toEqual({ hits: 5, misses: 1, falseAlarms: 1, verdict: 'stay' });
    expect(rateBlock(block(2, 2)).verdict).toBe('stay');
    expect(rateBlock(block(3, 2)).verdict).toBe('down');
    // Nie tippen und immer tippen lohnen sich nicht.
    expect(rateBlock(block(6, 0)).verdict).toBe('down');
    expect(rateBlock(block(0, 14)).verdict).toBe('down');
  });

  it('der Staircase folgt dem Urteil und hält die Grenzen', () => {
    expect(levelOf(afterBlock(stateAt(2), 'up'))).toBe(3);
    expect(levelOf(afterBlock(stateAt(2), 'down'))).toBe(1);
    expect(afterBlock(stateAt(2), 'stay')).toEqual(stateAt(2));
    expect(levelOf(afterBlock(stateAt(1), 'down'))).toBe(1);
    expect(levelOf(afterBlock(stateAt(LEVELS.length), 'up'))).toBe(LEVELS.length);
    expect(JSON.parse(JSON.stringify(initialState()))).toEqual(initialState());
  });
});

describe('N-Back: Wertung', () => {
  it('summarize rechnet nur aus den Rohdaten', () => {
    const stored = (n: number, block: number, target: boolean, pressed: boolean, rtMs: number | null): Trial => ({
      sessionId: 's', gameId: 'nback', kind: kindOf(n), ts: 0, task: { n, block, target }, response: { pressed }, rtMs, correct: target === pressed, difficulty: n,
    });
    const trials = [
      // Block 0 (1-Back): 2 von 2 Treffern, kein Fehlalarm → 100 Punkte.
      stored(1, 0, true, true, 400),
      stored(1, 0, false, false, null),
      stored(1, 0, true, true, 600),
      stored(1, 0, false, false, null),
      // Block 1 (2-Back): 1 von 2 Treffern, 1 Fehlalarm bei 2 anderen → 2 × 100 × (0,5 − 0,5) = 0 Punkte.
      stored(2, 1, true, true, 500),
      stored(2, 1, true, false, null),
      stored(2, 1, false, true, 700),
      stored(2, 1, false, false, null),
    ];
    const summary = summarize(trials, stateAt(2));
    expect(summary).toMatchObject({
      trials: 8,
      accuracy: 6 / 8,
      medianRtMs: 500,
      score: 100,
      level: 2,
      headline: { label: 'Treffer erkannt', value: '3 von 4' },
      extra: [
        { label: 'Fehlalarme', value: '1' },
        { label: 'Gespielt', value: '1-Back, 2-Back' },
      ],
    });
    expect(summarize([], initialState())).toMatchObject({ trials: 0, score: 0, accuracy: 0, medianRtMs: null, headline: { value: '0 von 0' } });
  });
});
