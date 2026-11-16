import { describe, expect, it } from 'vitest';
import { seededRng } from '../../core/rng';
import { initStaircase, updateStaircase } from '../../core/staircase';
import type { Trial } from '../../data/types';
import {
  advance,
  CELLS,
  expected,
  initialState,
  judge,
  kindOf,
  levelOf,
  makeTrial,
  STAIRCASE,
  summarize,
  TEMPO,
  UNLOCK_LENGTH,
  type CorsiState,
  type Stage,
} from './logic';

const exact = (ms: number) => ms;
const stateAt = (stage: Stage, length: number): CorsiState => ({ stage, stair: { ...initStaircase(STAIRCASE), value: length } });

describe('Blockfolge: Folgen', () => {
  it('jede Folge hat die verlangte Länge, bleibt auf dem Feld und nennt kein Feld zweimal (600 Seeds je Länge)', () => {
    for (let length = STAIRCASE.min; length <= STAIRCASE.max; length++) {
      for (let seed = 0; seed < 600; seed++) {
        const trial = makeTrial(seededRng(seed * 17 + length), stateAt(1, length), exact);
        expect(trial.length).toBe(length);
        expect(trial.sequence).toHaveLength(length);
        const seen = new Array<boolean>(CELLS).fill(false);
        for (const cell of trial.sequence) {
          expect(Number.isInteger(cell) && cell >= 0 && cell < CELLS).toBe(true);
          expect(seen[cell]).toBe(false);
          seen[cell] = true;
        }
      }
    }
  });

  it('jedes Feld kommt an jeder Stelle der Folge etwa gleich oft vor', () => {
    const rng = seededRng(11);
    const rounds = 16_000;
    const hits = Array.from({ length: 4 }, () => new Array<number>(CELLS).fill(0));
    for (let i = 0; i < rounds; i++) makeTrial(rng, stateAt(1, 4), exact).sequence.forEach((cell, pos) => hits[pos]![cell]!++);
    for (const row of hits) for (const count of row) expect(Math.abs(count - rounds / CELLS)).toBeLessThan(150);
  });

  it('zwei Folgen hintereinander sind verschieden', () => {
    const rng = seededRng(2);
    for (let i = 0; i < 200; i++) {
      expect(makeTrial(rng, stateAt(1, 5), exact).sequence).not.toEqual(makeTrial(rng, stateAt(1, 5), exact).sequence);
    }
  });

  it('Stufen: 2 ist schneller als 1, 3 läuft rückwärts im ruhigen Tempo; Zeiten sind auf Frames gerundet', () => {
    const frame = 1000 / 60;
    const quantize = (ms: number) => Math.round(ms / frame) * frame;
    const trials = ([1, 2, 3] as Stage[]).map((stage) => makeTrial(seededRng(stage), stateAt(stage, 4), quantize));
    expect(trials.map((t) => t.backward)).toEqual([false, false, true]);
    expect(trials[1]!.onMs).toBeLessThan(trials[0]!.onMs);
    expect(trials[1]!.gapMs).toBeLessThan(trials[0]!.gapMs);
    expect(trials[2]!.onMs).toBe(trials[0]!.onMs);
    for (const t of trials) {
      expect(t.onMs).toBeCloseTo(quantize(TEMPO[t.stage].onMs));
      expect(t.gapMs).toBeCloseTo(quantize(TEMPO[t.stage].gapMs));
      expect((t.onMs / frame) % 1).toBeCloseTo(0);
    }
  });

  it('die Länge folgt dem Staircase und bleibt in seinen Grenzen', () => {
    expect(makeTrial(seededRng(1), stateAt(1, 0), exact).length).toBe(STAIRCASE.min);
    expect(makeTrial(seededRng(1), stateAt(1, 99), exact).length).toBe(STAIRCASE.max);
    expect(STAIRCASE.max).toBeLessThanOrEqual(CELLS);
  });
});

describe('Blockfolge: Antwort prüfen', () => {
  it('vorwärts: genau die gezeigte Reihenfolge ist richtig; rückwärts: genau die umgekehrte', () => {
    for (let seed = 0; seed < 500; seed++) {
      const rng = seededRng(seed);
      for (const stage of [1, 2, 3] as Stage[]) {
        const trial = makeTrial(rng, stateAt(stage, 2 + (seed % 7)), exact);
        // Unabhängig von `expected`: die Regel direkt hingeschrieben.
        const wanted = trial.sequence.map((_, i) => trial.sequence[stage === 3 ? trial.sequence.length - 1 - i : i]!);
        expect(expected(trial)).toEqual(wanted);
        expect(judge(trial, wanted)).toBe('correct');
        // Jedes echte Anfangsstück ist noch offen.
        for (let n = 0; n < wanted.length; n++) expect(judge(trial, wanted.slice(0, n))).toBe('open');
        // Ein falsches Feld an beliebiger Stelle macht die Antwort sofort falsch – auch ohne die restlichen Tipps.
        const at = seed % wanted.length;
        const other = (wanted[at]! + 1 + (seed % (CELLS - 1))) % CELLS;
        expect(other).not.toBe(wanted[at]);
        expect(judge(trial, [...wanted.slice(0, at), other])).toBe('wrong');
        expect(judge(trial, [...wanted.slice(0, at), other, ...wanted.slice(at + 1)])).toBe('wrong');
        // Die falsche Richtung ist falsch (außer die Folge liest sich in beiden Richtungen gleich – ohne Wiederholungen nie).
        expect(judge(trial, [...wanted].reverse())).toBe('wrong');
      }
    }
  });
});

describe('Blockfolge: Schwierigkeit und Wertung', () => {
  it('nach jedem Erfolg wird die Folge länger, nach einem Fehler kürzer', () => {
    let stair = initStaircase(STAIRCASE);
    expect(stair.value).toBe(3);
    stair = updateStaircase(STAIRCASE, stair, true);
    expect(stair.value).toBe(4);
    stair = updateStaircase(STAIRCASE, stair, true);
    expect(stair.value).toBe(5);
    stair = updateStaircase(STAIRCASE, stair, false);
    expect(stair.value).toBe(4);
    for (let i = 0; i < 20; i++) stair = updateStaircase(STAIRCASE, stair, false);
    expect(stair.value).toBe(STAIRCASE.min);
    for (let i = 0; i < 20; i++) stair = updateStaircase(STAIRCASE, stair, true);
    expect(stair.value).toBe(STAIRCASE.max);
  });

  it('wer die Freischalt-Länge erreicht, kommt nach dem Lauf in die nächste Stufe und beginnt dort wieder kurz', () => {
    expect(advance(stateAt(1, UNLOCK_LENGTH - 1))).toEqual(stateAt(1, UNLOCK_LENGTH - 1));
    expect(advance(stateAt(1, UNLOCK_LENGTH))).toEqual({ stage: 2, stair: initStaircase(STAIRCASE) });
    expect(advance(stateAt(2, UNLOCK_LENGTH + 1))).toEqual({ stage: 3, stair: initStaircase(STAIRCASE) });
    expect(advance(stateAt(3, STAIRCASE.max))).toEqual(stateAt(3, STAIRCASE.max));
  });

  it('Level steigt mit Länge und Stufe; Zustand ist JSON', () => {
    expect(levelOf(initialState())).toBe(2);
    expect(levelOf(stateAt(1, STAIRCASE.min))).toBe(1);
    const levels = ([1, 2, 3] as Stage[]).flatMap((stage) =>
      Array.from({ length: STAIRCASE.max - STAIRCASE.min + 1 }, (_, i) => levelOf(stateAt(stage, STAIRCASE.min + i))),
    );
    expect(levels).toEqual(levels.map((_, i) => i + 1));
    expect(JSON.parse(JSON.stringify(initialState()))).toEqual(initialState());
  });

  it('summarize rechnet nur aus den Rohdaten', () => {
    const stored = (length: number, correct: boolean, rtMs: number): Trial => ({
      sessionId: 's', gameId: 'corsi', kind: kindOf(1), ts: 0, task: { stage: 1, length }, response: { taps: [] }, rtMs, correct, difficulty: length,
    });
    const trials = [stored(3, true, 2000), stored(4, true, 3000), stored(5, false, 1000), stored(4, true, 4000), stored(5, true, 5000), stored(6, false, 900)];
    const summary = summarize(trials, stateAt(1, 5));
    expect(summary).toMatchObject({
      trials: 6,
      accuracy: 4 / 6,
      medianRtMs: 3500,
      score: 540,
      level: 4,
      headline: { label: 'Längste Folge', value: '5 Felder' },
      extra: [
        { label: 'Richtig', value: '4 von 6' },
        { label: 'Stufe', value: 'vorwärts' },
      ],
    });
    // Nach dem Lauf freigeschaltet: Die Zeile nennt die neue Stufe; gewertet wird die gespielte.
    const unlocked = summarize(trials.map((t) => ({ ...t, kind: kindOf(2), task: { stage: 2, length: (t.task as { length: number }).length } })), stateAt(3, 3));
    expect(unlocked.extra).toEqual([
      { label: 'Richtig', value: '4 von 6' },
      { label: 'Stufe', value: 'vorwärts, schnell' },
      { label: 'Neu', value: 'Stufe „rückwärts“ freigeschaltet' },
    ]);
    expect(unlocked.score).toBe(1540);
    expect(summarize([stored(3, false, 500)], stateAt(1, 2))).toMatchObject({ score: 0, headline: { value: '–' } });
    expect(summarize([], initialState())).toMatchObject({ trials: 0, score: 0, accuracy: 0, medianRtMs: null });
  });
});
