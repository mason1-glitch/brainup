import { describe, expect, it } from 'vitest';
import { seededRng } from '../../core/rng';
import { initStaircase, updateStaircase } from '../../core/staircase';
import type { Trial } from '../../data/types';
import {
  answerOf,
  DIGITS,
  FORE_MS,
  initialState,
  isCorrect,
  kindOf,
  LABELS,
  levelOf,
  makeTrial,
  STAIRCASE,
  summarize,
  switchShare,
  type Rule,
  type Side,
  type SwitchState,
} from './logic';

const exact = (ms: number) => ms;
const stateAt = (windowMs: number): SwitchState => ({ stair: { ...initStaircase(STAIRCASE), value: windowMs } });

describe('Wechselspiel: Karten', () => {
  it('Zahlen von 1 bis 9 ohne die 5; die richtige Antwort stimmt mit der Regel in Worten überein', () => {
    expect([...DIGITS].sort()).toEqual([1, 2, 3, 4, 6, 7, 8, 9]);
    // Unabhängig von `answerOf`: die Beschriftung der richtigen Taste gegen die Zahl selbst prüfen.
    const holds: Record<string, (d: number) => boolean> = {
      gerade: (d) => [2, 4, 6, 8].includes(d),
      ungerade: (d) => [1, 3, 7, 9].includes(d),
      kleiner: (d) => [1, 2, 3, 4].includes(d),
      größer: (d) => [6, 7, 8, 9].includes(d),
    };
    let prev: Rule | null = null;
    const rng = seededRng(9);
    for (let i = 0; i < 3000; i++) {
      const trial = makeTrial(rng, stateAt(600 + (i % 20) * 100), prev, exact);
      expect(DIGITS).toContain(trial.digit);
      const right = answerOf(trial);
      const wrong: Side = right === 'left' ? 'right' : 'left';
      expect(holds[LABELS[trial.rule][right]]!(trial.digit)).toBe(true);
      expect(holds[LABELS[trial.rule][wrong]]!(trial.digit)).toBe(false);
      expect(isCorrect(trial, right)).toBe(true);
      expect(isCorrect(trial, wrong)).toBe(false);
      expect(isCorrect(trial, null)).toBe(false);
      prev = trial.rule;
    }
  });

  it('beide Tasten sind je Regel gleich oft richtig; die Tasten heißen je Regel anders', () => {
    for (const rule of ['parity', 'size'] as Rule[]) {
      const left = DIGITS.filter((digit) => answerOf({ rule, digit }) === 'left');
      expect(left).toHaveLength(DIGITS.length / 2);
      expect(LABELS[rule].left).not.toBe(LABELS[rule].right);
    }
    expect(LABELS.parity).toEqual({ left: 'ungerade', right: 'gerade' });
    expect(LABELS.size).toEqual({ left: 'kleiner', right: 'größer' });
  });

  it('die erste Karte hat keine Vorgängerregel; danach ist `switch` genau der Regelwechsel', () => {
    const rng = seededRng(3);
    const first = makeTrial(rng, initialState(), null, exact);
    expect(first.switch).toBeNull();
    let prev: Rule = first.rule;
    for (let i = 0; i < 2000; i++) {
      const trial = makeTrial(rng, initialState(), prev, exact);
      expect(trial.switch).toBe(trial.rule !== prev);
      prev = trial.rule;
    }
  });

  it('Regelwechsel treffen den vorgegebenen Anteil; beide Regeln und alle Zahlen kommen gleich oft', () => {
    for (const windowMs of [STAIRCASE.max, 1200, STAIRCASE.min]) {
      const rng = seededRng(windowMs);
      const n = 12_000;
      let switches = 0;
      let parity = 0;
      const digits = new Map<number, number>();
      let prev: Rule = 'parity';
      for (let i = 0; i < n; i++) {
        const t = makeTrial(rng, stateAt(windowMs), prev, exact);
        if (t.switch) switches++;
        if (t.rule === 'parity') parity++;
        digits.set(t.digit, (digits.get(t.digit) ?? 0) + 1);
        prev = t.rule;
      }
      expect(Math.abs(switches / n - switchShare(windowMs))).toBeLessThan(0.02);
      expect(Math.abs(parity / n - 0.5)).toBeLessThan(0.03);
      for (const count of digits.values()) expect(Math.abs(count / n - 1 / DIGITS.length)).toBeLessThan(0.015);
    }
  });

  it('je kürzer das Antwortfenster, desto häufiger wechselt die Regel – nie immer, nie nie', () => {
    let last = 0;
    for (let ms = STAIRCASE.max; ms >= STAIRCASE.min; ms -= 10) {
      const share = switchShare(ms);
      expect(share).toBeGreaterThanOrEqual(last);
      expect(share).toBeGreaterThanOrEqual(0.2);
      expect(share).toBeLessThanOrEqual(0.5);
      last = share;
    }
    expect(switchShare(STAIRCASE.min)).toBeGreaterThan(switchShare(STAIRCASE.max));
  });

  it('Antwortfenster folgt dem Staircase, auf Frames gerundet und in den Grenzen; Vorlauf schwankt', () => {
    const frame = 1000 / 60;
    const quantize = (ms: number) => Math.round(ms / frame) * frame;
    expect(makeTrial(seededRng(1), stateAt(1234), null, quantize).windowMs).toBeCloseTo(quantize(1234));
    expect(makeTrial(seededRng(1), stateAt(1), null, exact).windowMs).toBe(STAIRCASE.min);
    expect(makeTrial(seededRng(1), stateAt(99_999), null, exact).windowMs).toBe(STAIRCASE.max);
    const rng = seededRng(4);
    const fores = Array.from({ length: 500 }, () => makeTrial(rng, initialState(), null, exact).foreMs);
    expect(Math.min(...fores)).toBeGreaterThanOrEqual(FORE_MS[0]);
    expect(Math.max(...fores)).toBeLessThanOrEqual(FORE_MS[1]);
  });
});

describe('Wechselspiel: Schwierigkeit und Wertung', () => {
  it('drei richtige in Folge verkürzen das Antwortfenster, ein Fehler verlängert es', () => {
    let stair = initStaircase(STAIRCASE);
    const start = stair.value;
    for (let i = 0; i < 3; i++) stair = updateStaircase(STAIRCASE, stair, true);
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

  it('summarize rechnet nur aus den Rohdaten: Schwelle, Serie, Kosten des Wechsels', () => {
    const stored = (change: boolean | null, correct: boolean, rtMs: number | null, windowMs: number): Trial => ({
      sessionId: 's', gameId: 'taskswitch', kind: kindOf({ switch: change }), ts: 0, task: {}, response: null, rtMs, correct, difficulty: windowMs,
    });
    const trials = [
      stored(null, true, 2000, 2000),
      stored(false, true, 700, 2000),
      stored(true, true, 950, 2000),
      stored(false, true, 800, 1500),
      stored(true, false, 400, 1500),
      stored(false, true, 900, 2000),
      stored(true, true, 1150, 2000),
      stored(false, false, null, 2000),
    ];
    const summary = summarize(trials, stateAt(1500));
    const ms = Math.round(Math.exp((Math.log(1500) + 3 * Math.log(2000)) / 4));
    expect(summary.headline).toEqual({ label: 'Antwortfenster an deiner Schwelle', value: `${ms} ms` });
    expect(summary.score).toBe(4000 - ms);
    expect(summary.accuracy).toBe(6 / 8);
    expect(summary.extra).toEqual([
      { label: 'Längste Serie', value: '4' },
      // Median richtig nach Wechsel (1050) minus Median richtig ohne Wechsel (800); die erste Karte zählt nicht.
      { label: 'Wechsel kostet', value: '250 ms' },
    ]);
    expect(summarize(trials.filter((t) => t.kind !== 'wechsel'), stateAt(1500)).extra).toHaveLength(1);
    expect(summarize([], initialState())).toMatchObject({ trials: 0, accuracy: 0, medianRtMs: null });
  });
});
