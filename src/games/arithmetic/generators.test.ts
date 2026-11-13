import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { formatFrac, frac, mul, type Frac } from '../../core/fraction';
import { seededRng } from '../../core/rng';
import { answerInput, carries, check, generate, KINDS, MAX_LEVEL, nextTask, show, type Task } from './generators';

// Unabhängige Nachrechnung: eigene Bruchrechnung nur mit bigint-Kreuzprodukten,
// ohne die Rechenfunktionen aus core/fraction.
type Q = [bigint, bigint];
const q = (f: Frac): Q => [f.n, f.d];
const same = (a: Q, b: Q) => a[0] * b[1] === b[0] * a[1];
const times = (a: Q, b: Q): Q => [a[0] * b[0], a[1] * b[1]];
const plus = (a: Q, b: Q): Q => [a[0] * b[1] + b[0] * a[1], a[1] * b[1]];
const minus = (a: Q, b: Q): Q => plus(a, [-b[0], b[1]]);

function solves(task: Task): boolean {
  const ans = q(task.answer);
  const [a, b] = task.expr.args.map(q) as [Q, Q];
  switch (task.expr.op) {
    case 'add': return same(ans, task.expr.args.map(q).reduce(plus));
    case 'sub': return same(ans, minus(a, b));
    case 'mul': return same(ans, task.expr.args.map(q).reduce(times));
    case 'div': return same(times(ans, b), a);
    case 'percent': return same(times(ans, [100n, 1n]), times(a, b));
    case 'square': return same(ans, times(a, a));
    case 'cube': return same(ans, times(a, times(a, a)));
    case 'sqrt': return ans[0] > 0n && same(times(ans, ans), a);
    case 'cbrt': return same(times(ans, times(ans, ans)), a);
    case 'value': return same(ans, a);
  }
}

const anyTask = fc
  .tuple(fc.integer(), fc.constantFrom(...KINDS), fc.integer({ min: 1, max: MAX_LEVEL }))
  .map(([seed, kind, level]) => generate(seededRng(seed), kind, level));

describe('Generatoren (Property-Tests über 10 000 Aufgaben)', () => {
  it('jede Lösung ist exakt', () => {
    fc.assert(
      fc.property(anyTask, (task) => {
        expect(solves(task), `${task.key} = ${formatFrac(task.answer)}`).toBe(true);
        // Gegenprobe: Die Nachrechnung erkennt eine um 1 im Zähler verschobene Lösung.
        expect(solves({ ...task, answer: { n: task.answer.n + 1n, d: task.answer.d } }), task.key).toBe(false);
      }),
      { numRuns: 10_000 },
    );
  });

  it('jede Aufgabe ist auf der Zahlentastatur lösbar und wird streng geprüft', () => {
    fc.assert(
      fc.property(anyTask, (task) => {
        const input = answerInput(task);
        expect(input, task.key).toMatch(/^[0-9,/]{1,12}$/);
        expect(check(task, input), `${task.key} ← ${input}`).toBe(true);
        expect(check(task, ''), task.key).toBe(false);
        expect(task.answer.n > 0n, task.key).toBe(true);
        if (task.tolerance === 0) {
          const off = { n: task.answer.n + 1n, d: task.answer.d };
          expect(check(task, formatFrac(off)), task.key).toBe(false);
          // Formatregel: Bruch nur als Bruch, Dezimalzahl nur als Dezimalzahl.
          if (task.format === 'fraction') expect(check(task, show(task.answer)), task.key).toBe(false);
          if (task.format === 'decimal' && task.answer.d !== 1n) expect(check(task, formatFrac(task.answer)), task.key).toBe(false);
        } else {
          // Überschlag: genau ±10 % gilt noch, knapp darüber nicht mehr.
          const scaled = (n: number) => formatFrac(mul(task.answer, frac(n, 100)));
          expect(check(task, scaled(110)) && check(task, scaled(90)), task.key).toBe(true);
          expect(check(task, scaled(111)) || check(task, scaled(89)), task.key).toBe(false);
        }
      }),
      { numRuns: 10_000 },
    );
  });

  it('Anzeige und Rechenvorschrift passen zusammen; der Schlüssel bestimmt die Aufgabe', () => {
    const byKey = new Map<string, string>();
    fc.assert(
      fc.property(anyTask, (task) => {
        expect(task.text.length, task.key).toBeGreaterThan(1);
        expect(task.text.length, task.key).toBeLessThanOrEqual(22);
        expect(task.key.startsWith(task.kind + ':')).toBe(true);
        // Gleicher Schlüssel ⇒ gleiche Lösung.
        const answer = formatFrac(task.answer);
        expect(byKey.get(task.key) ?? answer, task.key).toBe(answer);
        byKey.set(task.key, answer);
      }),
      { numRuns: 10_000 },
    );
  });

  it('keine Aufgabe kommt direkt doppelt (10 000 Aufgaben in Folge)', () => {
    const rng = seededRng(42);
    for (const kind of KINDS)
      for (let level = 1; level <= MAX_LEVEL; level++) {
        let previous: string | undefined;
        for (let i = 0; i < 100; i++) {
          const task = nextTask(rng, kind, level, previous);
          expect(task.key).not.toBe(previous);
          expect(task.level).toBe(level);
          previous = task.key;
        }
      }
  });
});

describe('Schwierigkeitsparameter', () => {
  const sample = (kind: (typeof KINDS)[number], level: number, n = 300) => {
    const rng = seededRng(level * 31 + 7);
    return Array.from({ length: n }, () => generate(rng, kind, level));
  };
  const num = (f: Frac) => Number(f.n) / Number(f.d);

  it('Einmaleins bleibt bis 20 × 20 und wächst mit dem Level', () => {
    for (let level = 1; level <= MAX_LEVEL; level++)
      for (const t of sample('table', level)) for (const a of t.expr.args) expect(num(a)).toBeLessThanOrEqual(20);
    const max = (level: number) => Math.max(...sample('table', level).map((t) => num(t.answer)));
    expect(max(1)).toBeLessThanOrEqual(50);
    expect(max(10)).toBe(400);
  });

  it('Addition und Subtraktion steuern Stellenzahl und Überträge', () => {
    for (const t of sample('add', 3)) expect(carries(num(t.expr.args[0]!), num(t.expr.args[1]!))).toBe(0);
    for (const t of sample('add', 4)) expect(carries(num(t.expr.args[0]!), num(t.expr.args[1]!))).toBeGreaterThan(0);
    for (const t of sample('sub', 3)) expect(carries(num(t.expr.args[0]!), num(t.expr.args[1]!), true)).toBe(0);
    for (const t of sample('sub', 7)) expect(carries(num(t.expr.args[0]!), num(t.expr.args[1]!), true)).toBeGreaterThan(0);
    for (const t of sample('add', 9)) expect(t.text.replace(/\D/g, '').length).toBe(8);
    expect(carries(58, 67)).toBe(2);
    expect(carries(1000, 1, true)).toBe(3);
  });

  it('Formate: Division ab Level 9 dezimal, Brüche in beide Richtungen, Überschlag mit Toleranz', () => {
    for (const t of sample('div', 5)) expect(t.format).toBe('int');
    for (const t of sample('div', 9)) expect(t.format).toBe('decimal');
    const formats = new Set(sample('fraction', 4).map((t) => t.format));
    expect(formats).toEqual(new Set(['fraction', 'decimal']));
    for (const t of sample('fraction', 1)) expect(t.format).toBe('decimal');
    for (let level = 1; level <= MAX_LEVEL; level++)
      for (const t of sample('estimate', level, 50)) expect(t.tolerance).toBe(10);
    for (const kind of KINDS.filter((k) => k !== 'estimate')) for (const t of sample(kind, 5, 50)) expect(t.tolerance).toBe(0);
  });

  it('höhere Level bringen im Mittel längere Aufgaben', () => {
    for (const kind of ['add', 'sub', 'mul', 'div', 'estimate'] as const) {
      const mean = (level: number) => sample(kind, level).reduce((s, t) => s + t.text.replace(/\D/g, '').length, 0) / 300;
      expect(mean(8), kind).toBeGreaterThan(mean(1));
    }
  });
});
