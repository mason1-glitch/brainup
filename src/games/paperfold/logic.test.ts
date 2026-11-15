import { describe, expect, it } from 'vitest';
import { seededRng } from '../../core/rng';
import type { Trial } from '../../data/types';
import {
  flatSheet, foldSheet, holesBySheet, initialState, keyOf, LATTICE, layersAt, levelOf, makeTrial, MAX_LEVEL, paramsFor, reflect, sheetsOf,
  SIZE, summarize, unfold, type Fold, type Point,
} from './logic';

// ---------- Unabhängige Referenz: jeden Punkt des Blatts vorwärts falten ----------
// Der Generator entfaltet rückwärts (Löcher spiegeln, wo Papier lag). Hier der andere Weg:
// Ein Punkt des Blatts wandert durch alle Faltungen; er bekommt ein Loch, wenn er am Ende
// genau unter einer Lochung liegt. Eigene Spiegelformeln, keine Polygone, keine Lagen.

function foldPoint(folds: readonly Fold[], q: Point): Point {
  let [x, y] = q;
  for (const f of folds) {
    if (f.side * (f.a * x + f.b * y - f.c) <= 0) continue; // liegt auf der ruhenden Seite
    if (f.b === 0) x = 2 * f.c - x; // senkrechte Linie x = c
    else if (f.a === 0) y = 2 * f.c - y; // waagerechte Linie y = c
    else if (f.b === 1) [x, y] = [f.c - y, f.c - x]; // Diagonale x + y = c
    else [x, y] = [y + f.c, x - f.c]; // Diagonale x − y = c
  }
  return [x, y];
}

/** Alle ganzzahligen Punkte des Blatts, die nach dem Falten unter einer Lochung liegen. */
function holesByFolding(folds: readonly Fold[], punches: readonly Point[]): string {
  const hit = new Set(punches.map((p) => `${p[0]},${p[1]}`));
  const holes: Point[] = [];
  for (let y = 0; y <= SIZE; y++)
    for (let x = 0; x <= SIZE; x++) if (hit.has(foldPoint(folds, [x, y]).join(','))) holes.push([x, y]);
  return keyOf(holes);
}

const area = (poly: readonly Point[]) =>
  Math.abs(poly.reduce((sum, p, i) => sum + p[0] * poly[(i + 1) % poly.length]![1] - poly[(i + 1) % poly.length]![0] * p[1], 0)) / 2;

describe('Falten', () => {
  it('ein Beispiel von Hand: rechte Hälfte nach links, Loch bei (6,5) → Löcher bei (6,5) und (10,5)', () => {
    const fold: Fold = { a: 1, b: 0, c: 8, side: 1 };
    const sheets = sheetsOf([fold]);
    expect(sheets[1]!.layers).toHaveLength(2);
    expect(layersAt(sheets[1]!, [6, 5])).toBe(2);
    expect(layersAt(sheets[1]!, [10, 5])).toBe(0);
    expect(unfold([fold], sheets, [[6, 5]])).toEqual([[6, 5], [10, 5]]);
  });

  it('zwei Faltungen von Hand: rechts nach links, dann oben nach unten → vier Löcher', () => {
    const folds: Fold[] = [{ a: 1, b: 0, c: 8, side: 1 }, { a: 0, b: 1, c: 8, side: -1 }];
    expect(keyOf(unfold(folds, sheetsOf(folds), [[2, 9]]))).toBe(keyOf([[2, 7], [14, 7], [2, 9], [14, 9]]));
  });

  it('Diagonale von Hand: Dreieck oben rechts über die Hauptdiagonale → Loch und sein Spiegelbild', () => {
    // y wächst nach unten; x − y > 0 ist das Dreieck oben rechts, es klappt nach unten links.
    const fold: Fold = { a: 1, b: -1, c: 0, side: 1 };
    expect(unfold([fold], sheetsOf([fold]), [[2, 5]])).toEqual([[5, 2], [2, 5]]);
  });

  it('Papier geht nicht verloren, bleibt im Blatt und auf geraden Gitterpunkten', () => {
    const rng = seededRng(4);
    for (let i = 0; i < 300; i++) {
      const t = makeTrial(rng, 1 + (i % MAX_LEVEL));
      for (const sheet of sheetsOf(t.folds)) {
        expect(sheet.layers.reduce((sum, l) => sum + area(l), 0)).toBe(SIZE * SIZE);
        for (const [x, y] of sheet.layers.flat()) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(SIZE);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(SIZE);
          expect(x % 2 === 0 && y % 2 === 0).toBe(true);
        }
      }
    }
  });

  it('Lochgitter: 64 Punkte, keiner auf einer Faltlinie, unter jeder Faltung in sich abgebildet', () => {
    expect(new Set(LATTICE.map((p) => p.join())).size).toBe(64);
    const onLattice = new Set(LATTICE.map((p) => p.join()));
    for (const [x, y] of LATTICE) {
      expect(x % 4).not.toBe(0);
      expect(y % 4).not.toBe(0);
      expect((x - y) % 4).not.toBe(0);
      expect((x + y) % 4).not.toBe(0);
    }
    const lines: Fold[] = [
      { a: 1, b: 0, c: 8, side: 1 }, { a: 0, b: 1, c: 4, side: 1 }, { a: 1, b: 1, c: 16, side: 1 }, { a: 1, b: -1, c: 0, side: 1 },
    ];
    for (const f of lines)
      for (const p of LATTICE) {
        const m = reflect(f, p);
        if (m[0] > 0 && m[0] < SIZE && m[1] > 0 && m[1] < SIZE) expect(onLattice.has(m.join())).toBe(true);
      }
  });
});

describe('Durchgänge', () => {
  it('die richtige Antwort stimmt mit dem Vorwärtsfalten überein; Distraktoren sind falsch und verschieden (3000 Aufgaben)', () => {
    const rng = seededRng(21);
    for (let i = 0; i < 3000; i++) {
      const level = 1 + (i % MAX_LEVEL);
      const t = makeTrial(rng, level);
      const expected = holesByFolding(t.folds, t.punches);
      const keys = t.options.map(keyOf);
      expect(keys[t.correct]).toBe(expected);
      expect(new Set(keys).size).toBe(4);
      expect(keys.filter((k) => k === expected)).toHaveLength(1);
      for (const option of t.options) {
        expect(option.length).toBeGreaterThan(0);
        for (const [x, y] of option) {
          expect(x > 0 && x < SIZE && y > 0 && y < SIZE).toBe(true);
          expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true);
        }
        expect(new Set(option.map((p) => p.join())).size).toBe(option.length);
      }
    }
  });

  it('jedes Loch zählt eine Lage: Zahl der Löcher = Lagen unter den Lochungen; mindestens eine Lochung trifft mehrere', () => {
    const rng = seededRng(8);
    for (let i = 0; i < 1000; i++) {
      const t = makeTrial(rng, 1 + (i % MAX_LEVEL));
      const folded = sheetsOf(t.folds).at(-1)!;
      const layers = t.punches.map((p) => layersAt(folded, p));
      expect(t.options[t.correct]!).toHaveLength(layers.reduce((a, b) => a + b, 0));
      expect(Math.max(...layers)).toBeGreaterThanOrEqual(2);
      expect(Math.min(...layers)).toBeGreaterThanOrEqual(1);
      expect(t.options[t.correct]!.length).toBeLessThanOrEqual(8);
      expect(new Set(t.punches.map((p) => p.join())).size).toBe(t.punches.length);
    }
  });

  it('Auflösung: die Löcher in jedem Faltzustand sind die vorwärts gefalteten Löcher des aufgeklappten Blatts', () => {
    const rng = seededRng(13);
    for (let i = 0; i < 500; i++) {
      const t = makeTrial(rng, 1 + (i % MAX_LEVEL));
      const steps = holesBySheet(t.folds, sheetsOf(t.folds), t.punches);
      expect(steps).toHaveLength(t.folds.length + 1);
      expect(keyOf(steps[0]!)).toBe(keyOf(t.options[t.correct]!));
      expect(keyOf(steps.at(-1)!)).toBe(keyOf(t.punches));
      for (let k = 0; k < steps.length; k++) {
        const folded = new Set(t.options[t.correct]!.map((q) => foldPoint(t.folds.slice(0, k), q).join(',')));
        expect(new Set(steps[k]!.map((p) => p.join(',')))).toEqual(folded);
      }
    }
  });

  it('Level bestimmen Faltungen, Diagonalen und Lochungen; es wird nie mehr als die Hälfte des Papiers bewegt', () => {
    expect(paramsFor(1)).toMatchObject({ folds: 1, diagonal: false, halves: true, punches: 1 });
    expect(paramsFor(MAX_LEVEL)).toMatchObject({ folds: 3, diagonal: true, punches: 2 });
    expect(paramsFor(99).level).toBe(MAX_LEVEL);
    expect(paramsFor(-3).level).toBe(1);
    const rng = seededRng(2);
    let lastFolds = 0;
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const p = paramsFor(level);
      expect(p.folds).toBeGreaterThanOrEqual(lastFolds);
      lastFolds = p.folds;
      for (let i = 0; i < 60; i++) {
        const t = makeTrial(rng, level);
        expect(t.level).toBe(level);
        expect(t.folds).toHaveLength(p.folds);
        expect(t.punches).toHaveLength(p.punches);
        const diagonals = t.folds.filter((f) => f.a !== 0 && f.b !== 0).length;
        if (p.diagonal) expect(diagonals).toBeGreaterThanOrEqual(1);
        else expect(diagonals).toBe(0);
        // Bewegte Papiermenge je Faltung, unabhängig über Lagenflächen links/rechts der Linie.
        let sheet = flatSheet();
        for (const f of t.folds) {
          const next = foldSheet(sheet, f);
          const moved = next.layers.slice(next.layers.length - next.flap).reduce((sum, l) => sum + area(l), 0);
          expect(moved).toBeGreaterThanOrEqual((SIZE * SIZE) / 16);
          expect(moved).toBeLessThanOrEqual((SIZE * SIZE) / 2);
          if (p.halves) expect(moved).toBe((SIZE * SIZE) / 2);
          sheet = next;
        }
      }
    }
  });

  it('die richtige Antwort liegt an allen vier Stellen etwa gleich oft', () => {
    const rng = seededRng(5);
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 2000; i++) counts[makeTrial(rng, 1 + (i % MAX_LEVEL)).correct]!++;
    for (const c of counts) {
      expect(c).toBeGreaterThan(430);
      expect(c).toBeLessThan(570);
    }
  });

  it('Aufgaben wiederholen sich nicht ständig: viele verschiedene Faltfolgen je Level', () => {
    const rng = seededRng(9);
    for (const level of [1, 4, 9]) {
      const seen = new Set<string>();
      for (let i = 0; i < 100; i++) seen.add(JSON.stringify(makeTrial(rng, level).folds));
      expect(seen.size).toBeGreaterThanOrEqual(level === 1 ? 4 : 20);
    }
  });
});

describe('Wertung', () => {
  it('Punkte = 10 × Level je richtiger Antwort', () => {
    const trial = (correct: boolean, difficulty: number): Trial => ({
      sessionId: 's', gameId: 'paperfold', kind: '', ts: 0, task: null, response: 0, rtMs: 4000, correct, difficulty,
    });
    const state = initialState();
    expect(levelOf(state)).toBe(1);
    const s = summarize([trial(true, 1), trial(true, 3), trial(false, 4)], state);
    expect(s.score).toBe(40);
    expect(s.headline).toEqual({ label: 'Punkte', value: '40' });
    expect(s.extra).toEqual([{ label: 'Richtig', value: '2 von 3' }]);
    expect(s.accuracy).toBeCloseTo(2 / 3);
  });
});
