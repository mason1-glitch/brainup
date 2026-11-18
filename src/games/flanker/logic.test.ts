import { describe, expect, it } from 'vitest';
import { seededRng } from '../../core/rng';
import { initStaircase, updateStaircase } from '../../core/staircase';
import type { Trial } from '../../data/types';
import {
  arrowsOf,
  FORE_MS,
  incongruentShare,
  initialState,
  isCorrect,
  kindOf,
  levelOf,
  makeTrial,
  STAIRCASE,
  summarize,
  type Direction,
  type FlankerState,
} from './logic';

const exact = (ms: number) => ms;
const stateAt = (windowMs: number): FlankerState => ({ stair: { ...initStaircase(STAIRCASE), value: windowMs } });

describe('Pfeilfokus: Reihen', () => {
  it('fünf Pfeile; die vier äußeren zeigen gleich – mit der Mitte (stimmig) oder gegen sie (widersprüchlich)', () => {
    for (let seed = 0; seed < 2000; seed++) {
      const trial = makeTrial(seededRng(seed), stateAt(400 + (seed % 20) * 100), exact);
      const arrows = arrowsOf(trial);
      expect(arrows).toHaveLength(5);
      const [a, b, mid, d, e] = arrows;
      expect(mid).toBe(trial.target);
      expect(a === b && b === d && d === e).toBe(true);
      expect(a === mid).toBe(trial.congruent);
      for (const arrow of arrows) expect(['left', 'right']).toContain(arrow);
    }
  });

  it('richtig ist allein die Richtung des mittleren Pfeils', () => {
    for (let seed = 0; seed < 500; seed++) {
      const trial = makeTrial(seededRng(seed), initialState(), exact);
      // Unabhängig: die Mitte aus der Reihe ablesen, nicht aus `target`.
      const middle = arrowsOf(trial)[2]!;
      const opposite: Direction = middle === 'left' ? 'right' : 'left';
      expect(isCorrect(trial, middle)).toBe(true);
      expect(isCorrect(trial, opposite)).toBe(false);
      // Wer den äußeren Pfeilen folgt, liegt genau bei widersprüchlichen Reihen falsch.
      expect(isCorrect(trial, arrowsOf(trial)[0]!)).toBe(trial.congruent);
      // Keine Antwort (Zeit abgelaufen) ist falsch.
      expect(isCorrect(trial, null)).toBe(false);
    }
  });

  it('links und rechts gleich häufig; der Anteil widersprüchlicher Reihen trifft die Vorgabe', () => {
    for (const windowMs of [STAIRCASE.max, 900, STAIRCASE.min]) {
      const rng = seededRng(windowMs);
      const n = 8000;
      let left = 0;
      let incongruent = 0;
      let leftIncongruent = 0;
      for (let i = 0; i < n; i++) {
        const t = makeTrial(rng, stateAt(windowMs), exact);
        if (t.target === 'left') left++;
        if (!t.congruent) incongruent++;
        if (!t.congruent && t.target === 'left') leftIncongruent++;
      }
      expect(Math.abs(left / n - 0.5)).toBeLessThan(0.02);
      expect(Math.abs(incongruent / n - incongruentShare(windowMs))).toBeLessThan(0.02);
      // Richtung und Widerspruch hängen nicht zusammen.
      expect(Math.abs(leftIncongruent / incongruent - 0.5)).toBeLessThan(0.03);
    }
  });

  it('je kürzer das Antwortfenster, desto mehr widersprüchliche Reihen – nie nur eine Sorte', () => {
    let last = 0;
    for (let ms = STAIRCASE.max; ms >= STAIRCASE.min; ms -= 10) {
      const share = incongruentShare(ms);
      expect(share).toBeGreaterThanOrEqual(last);
      expect(share).toBeGreaterThanOrEqual(0.3);
      expect(share).toBeLessThanOrEqual(0.7);
      last = share;
    }
    expect(incongruentShare(STAIRCASE.min)).toBeGreaterThan(incongruentShare(STAIRCASE.max));
  });

  it('Antwortfenster folgt dem Staircase, auf Frames gerundet und in den Grenzen; Vorlauf schwankt', () => {
    const frame = 1000 / 60;
    const quantize = (ms: number) => Math.round(ms / frame) * frame;
    expect(makeTrial(seededRng(1), stateAt(777), quantize).windowMs).toBeCloseTo(quantize(777));
    expect(makeTrial(seededRng(1), stateAt(1), exact).windowMs).toBe(STAIRCASE.min);
    expect(makeTrial(seededRng(1), stateAt(99_999), exact).windowMs).toBe(STAIRCASE.max);
    const rng = seededRng(4);
    const fores = Array.from({ length: 500 }, () => makeTrial(rng, initialState(), exact).foreMs);
    expect(Math.min(...fores)).toBeGreaterThanOrEqual(FORE_MS[0]);
    expect(Math.max(...fores)).toBeLessThanOrEqual(FORE_MS[1]);
    expect(new Set(fores.map((f) => Math.round(f / 50))).size).toBeGreaterThan(5);
  });
});

describe('Pfeilfokus: Schwierigkeit und Wertung', () => {
  it('drei richtige in Folge verkürzen das Antwortfenster, ein Fehler verlängert es', () => {
    let stair = initStaircase(STAIRCASE);
    const start = stair.value;
    stair = updateStaircase(STAIRCASE, updateStaircase(STAIRCASE, stair, true), true);
    expect(stair.value).toBe(start);
    stair = updateStaircase(STAIRCASE, stair, true);
    expect(stair.value).toBeLessThan(start);
    const shorter = stair.value;
    stair = updateStaircase(STAIRCASE, stair, false);
    expect(stair.value).toBeGreaterThan(shorter);
  });

  it('Level steigt, wenn das Fenster kürzer wird; Level 1 am Anfang', () => {
    expect(levelOf(initialState())).toBe(1);
    let last = 1;
    for (let ms = STAIRCASE.max; ms >= STAIRCASE.min; ms -= 5) {
      const level = levelOf(stateAt(ms));
      expect(level).toBeGreaterThanOrEqual(last);
      last = level;
    }
    expect(last).toBeGreaterThanOrEqual(8);
    expect(JSON.parse(JSON.stringify(initialState()))).toEqual(initialState());
  });

  it('summarize rechnet nur aus den Rohdaten: Schwelle, Serie, Kosten der Ablenkung', () => {
    const stored = (congruent: boolean, correct: boolean, rtMs: number | null, windowMs: number): Trial => ({
      sessionId: 's', gameId: 'flanker', kind: kindOf({ congruent }), ts: 0, task: { congruent }, response: null, rtMs, correct, difficulty: windowMs,
    });
    const trials = [
      stored(true, true, 400, 1000),
      stored(false, true, 520, 1000),
      stored(true, true, 420, 1000),
      stored(false, false, 300, 800),
      stored(true, true, 380, 1000),
      stored(false, true, 480, 1000),
      stored(false, true, 500, 1000),
      stored(true, false, null, 640),
    ];
    const summary = summarize(trials, stateAt(800));
    expect(summary.trials).toBe(8);
    expect(summary.accuracy).toBe(6 / 8);
    // Schwelle: geometrisches Mittel der zweiten Hälfte (1000, 1000, 1000, 640).
    const ms = Math.round(Math.exp((3 * Math.log(1000) + Math.log(640)) / 4));
    expect(summary.headline).toEqual({ label: 'Antwortfenster an deiner Schwelle', value: `${ms} ms` });
    expect(summary.score).toBe(3000 - ms);
    expect(summary.extra).toEqual([
      { label: 'Längste Serie', value: '3' },
      // Median richtig & widersprüchlich (500) minus Median richtig & stimmig (400).
      { label: 'Ablenkung kostet', value: '100 ms' },
    ]);
    expect(summary.level).toBe(levelOf(stateAt(800)));
    // Ohne beide Sorten keine Aussage über die Ablenkung.
    expect(summarize(trials.filter((t) => t.kind === 'stimmig'), stateAt(800)).extra).toEqual([{ label: 'Längste Serie', value: '3' }]);
    expect(summarize([], initialState())).toMatchObject({ trials: 0, accuracy: 0, medianRtMs: null });
  });
});
