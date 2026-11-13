import { describe, expect, it } from 'vitest';
import { seededRng } from '../../core/rng';
import { initStaircase, updateStaircase } from '../../core/staircase';
import { toFrames } from '../../core/timing';
import type { Trial } from '../../data/types';
import {
  advance, DIRECTIONS, initialState, isCorrect, kindOf, levelOf, makeTrial, slotPosition, STAGE_UP_MS, STAIRCASE,
  summarize, type Stage, type UfovState,
} from './logic';

const FRAME = 1000 / 60;
const quantize = (ms: number) => toFrames(ms, FRAME) * FRAME;
const at = (stage: Stage, value: number): UfovState => ({ stage, stair: { ...initStaircase(STAIRCASE), value } });

describe('Durchgänge', () => {
  it('Stufe bestimmt, was gezeigt wird; die Dauer ist immer ein Frame-Vielfaches', () => {
    const rng = seededRng(2);
    for (let i = 0; i < 600; i++) {
      const stage = (1 + (i % 3)) as Stage;
      const t = makeTrial(rng, at(stage, 16 + ((i * 7) % 480)), quantize);
      expect(t.stage).toBe(stage);
      expect(t.direction === null).toBe(stage === 1);
      expect(t.distractors).toBe(stage === 3);
      if (t.direction !== null) expect(t.direction).toBeGreaterThanOrEqual(0), expect(t.direction).toBeLessThan(DIRECTIONS);
      expect(t.durationMs / FRAME).toBeCloseTo(Math.round(t.durationMs / FRAME), 9);
      expect(t.durationMs).toBeGreaterThanOrEqual(FRAME - 1e-9);
    }
  });

  it('Formen und Richtungen sind gleichmäßig verteilt', () => {
    const rng = seededRng(9);
    const dirs = new Array<number>(DIRECTIONS).fill(0);
    let squares = 0;
    for (let i = 0; i < 4000; i++) {
      const t = makeTrial(rng, at(2, 100), quantize);
      dirs[t.direction!]!++;
      squares += t.central;
    }
    expect(squares).toBeGreaterThan(1850);
    expect(squares).toBeLessThan(2150);
    for (const n of dirs) expect(n).toBeGreaterThan(400);
  });

  it('richtig nur, wenn Mitte UND Richtung stimmen', () => {
    const t = makeTrial(seededRng(1), at(2, 100), quantize);
    expect(isCorrect(t, { central: t.central, direction: t.direction })).toBe(true);
    expect(isCorrect(t, { central: (1 - t.central) as 0 | 1, direction: t.direction })).toBe(false);
    expect(isCorrect(t, { central: t.central, direction: (t.direction! + 1) % DIRECTIONS })).toBe(false);
    const t1 = makeTrial(seededRng(1), at(1, 100), quantize);
    expect(isCorrect(t1, { central: t1.central, direction: null })).toBe(true);
  });

  it('die 16 Plätze liegen im Feld und überlappen nicht', () => {
    const slots = [0, 1].flatMap((ring) => Array.from({ length: DIRECTIONS }, (_, d) => slotPosition(d, ring)));
    for (const [i, a] of slots.entries()) {
      expect(Math.hypot(a.x, a.y)).toBeLessThan(45);
      for (const b of slots.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(12);
    }
    expect(slotPosition(0, 1)).toMatchObject({ x: 0, y: -40 });
    expect(slotPosition(2, 1).x).toBeCloseTo(40);
  });
});

describe('Schwierigkeit', () => {
  it('drei Treffer verkürzen die Darbietung, ein Fehler verlängert sie', () => {
    let s = initStaircase(STAIRCASE);
    for (let i = 0; i < 3; i++) s = updateStaircase(STAIRCASE, s, true);
    expect(s.value).toBeLessThan(STAIRCASE.start);
    const after = updateStaircase(STAIRCASE, s, false);
    expect(after.value).toBeGreaterThan(s.value);
  });

  it('eine gemeisterte Stufe schaltet die nächste frei und beginnt wieder langsam', () => {
    expect(advance(at(1, STAGE_UP_MS + 5))).toMatchObject({ stage: 1 });
    expect(advance(at(1, STAGE_UP_MS - 5))).toMatchObject({ stage: 2, stair: { value: STAIRCASE.start } });
    expect(advance(at(3, 20)).stage).toBe(3);
  });

  it('Level steigt mit Stufe und kürzerer Zeit', () => {
    expect(levelOf(initialState())).toBe(1);
    expect(levelOf(at(1, 30))).toBe(6);
    expect(levelOf(at(2, 250))).toBe(7);
    expect(levelOf(at(3, 16))).toBe(18);
  });
});

describe('Wertung', () => {
  it('Schwelle aus der zweiten Sitzungshälfte; kürzer und höhere Stufe = mehr Punkte', () => {
    const t = (difficulty: number, stage: Stage): Trial => ({ sessionId: 's', gameId: 'ufov', kind: kindOf(stage), ts: 0, task: null, response: null, rtMs: 800, correct: true, difficulty });
    const slow = summarize([t(250, 1), t(200, 1), t(100, 1), t(100, 1)], at(1, 100));
    expect(slow.headline.value).toBe('100 ms');
    expect(slow.extra).toEqual([{ label: 'Stufe', value: '1 von 3' }]);
    const fast = summarize([t(250, 1), t(200, 1), t(50, 1), t(50, 1)], at(2, 250));
    expect(fast.score).toBeGreaterThan(slow.score);
    expect(fast.extra[1]).toEqual({ label: 'Neu', value: 'Stufe 2 freigeschaltet' });
    expect(summarize([t(100, 2), t(100, 2)], at(2, 100)).score).toBeGreaterThan(slow.score);
  });
});
