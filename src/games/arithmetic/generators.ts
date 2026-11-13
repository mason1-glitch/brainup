// Kopfrechnen – Aufgabengeneratoren für alle Typen aus PLAN.md.
// Jede Lösung ist ein exakter Bruch (core/fraction); Gleitkomma kommt nirgends vor.
import {
  eq, formatFrac, frac, isInt, mul, parseFrac, pow10, toDecimal, toNumber, withinPercent, div, type Frac,
} from '../../core/fraction';
import { pick, randInt, type Rng } from '../../core/rng';

export const KINDS = ['table', 'add', 'sub', 'mul', 'div', 'percent', 'power', 'fraction', 'pow10', 'estimate'] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_TITLES: Record<Kind, string> = {
  table: 'Einmaleins',
  add: 'Addition',
  sub: 'Subtraktion',
  mul: 'Multiplikation',
  div: 'Division',
  percent: 'Prozent',
  power: 'Quadrate und Wurzeln',
  fraction: 'Brüche und Dezimalzahlen',
  pow10: 'Zehnerpotenzen',
  estimate: 'Überschlag',
};

/** Jeder Typ hat die Level 1–10. Was ein Level bedeutet, steht in den Tabellen unten. */
export const MAX_LEVEL = 10;

/** Antwortformat: steuert die Tasten der Zahlentastatur und die Prüfung. */
export type Format = 'int' | 'decimal' | 'fraction';

/** Rechenvorschrift der Aufgabe – erlaubt Tests, die Lösung unabhängig nachzurechnen. */
export type Op = 'add' | 'sub' | 'mul' | 'div' | 'percent' | 'square' | 'cube' | 'sqrt' | 'cbrt' | 'value';

export interface Task {
  kind: Kind;
  level: number;
  /** Eindeutig je Aufgabe (Wiederholungssperre, Spaced Repetition). */
  key: string;
  /** Anzeige, z. B. „17 × 13“. */
  text: string;
  /** Zusatz über der Aufgabe, z. B. „als Bruch“; sonst ''. */
  hint: string;
  answer: Frac;
  format: Format;
  /** Erlaubte Abweichung in Prozent (Überschlag: 10), sonst 0. */
  tolerance: number;
  expr: { op: Op; args: Frac[] };
}

type Draft = Omit<Task, 'kind' | 'level' | 'key'> & { key?: string };
type Gen = (rng: Rng, level: number) => Draft;

// ---------- Hilfen ----------

const THIN = ' ';

/** Zahl für die Anzeige: Dezimalkomma, ab fünf Stellen in Dreiergruppen. */
export function show(value: Frac | number): string {
  const s = toDecimal(typeof value === 'number' ? frac(value) : value) ?? formatFrac(value as Frac);
  const [int = '', rest] = s.split(',');
  const grouped = int.length >= 5 ? int.replace(/\B(?=(\d{3})+$)/g, THIN) : int;
  return rest === undefined ? grouped : `${grouped},${rest}`;
}

const SUPER: Record<string, string> = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (k: number) => [...String(k)].map((c) => SUPER[c]).join('');

const digits = (rng: Rng, d: number) => randInt(rng, 10 ** (d - 1), 10 ** d - 1);
const at = <T,>(table: readonly T[], level: number): T => table[Math.min(table.length, Math.max(1, level)) - 1]!;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

function draft(text: string, answer: Frac, op: Op, args: (Frac | number)[], extra: Partial<Draft> = {}): Draft {
  return {
    text,
    hint: '',
    answer,
    format: isInt(answer) ? 'int' : 'decimal',
    tolerance: 0,
    expr: { op, args: args.map((a) => (typeof a === 'number' ? frac(a) : a)) },
    ...extra,
  };
}

const product = (factors: number[]) => factors.reduce((p, f) => mul(p, frac(f)), frac(1));

/** Überträge beim schriftlichen Addieren bzw. Entleihen beim Subtrahieren. */
export function carries(a: number, b: number, subtract = false): number {
  let carry = 0;
  let count = 0;
  for (; a > 0 || b > 0; a = Math.floor(a / 10), b = Math.floor(b / 10)) {
    const column = subtract ? (a % 10) - (b % 10) - carry : (a % 10) + (b % 10) + carry;
    carry = (subtract ? column < 0 : column >= 10) ? 1 : 0;
    count += carry;
  }
  return count;
}

// ---------- Die Typen ----------

/** Einmaleins bis 20 × 20: [a von, a bis, b von, b bis] */
const TABLE = [
  [2, 5, 2, 10], [2, 9, 2, 9], [6, 9, 6, 9], [2, 9, 11, 15], [2, 9, 11, 20],
  [11, 15, 11, 15], [11, 15, 11, 20], [11, 20, 11, 20], [13, 20, 13, 20], [16, 20, 16, 20],
] as const;

const table: Gen = (rng, level) => {
  const [a0, a1, b0, b1] = at(TABLE, level);
  const a = randInt(rng, a0, a1);
  const b = randInt(rng, b0, b1);
  const [x, y] = rng() < 0.5 ? [a, b] : [b, a];
  // 7 × 13 und 13 × 7 sind dieselbe Tatsache.
  return draft(`${x} × ${y}`, product([x, y]), 'mul', [x, y], { key: `${Math.min(a, b)}×${Math.max(a, b)}` });
};

/** Addition/Subtraktion: [Stellen a, Stellen b, mit Übertrag?] */
const SUMS = [
  [2, 1, false], [2, 1, true], [2, 2, false], [2, 2, true], [3, 2, true],
  [3, 3, false], [3, 3, true], [4, 3, true], [4, 4, true], [5, 4, true],
] as const;

const add: Gen = (rng, level) => {
  const [da, db, carry] = at(SUMS, level);
  for (;;) {
    const a = digits(rng, da);
    const b = digits(rng, db);
    if (carries(a, b) > 0 !== carry) continue;
    const [x, y] = rng() < 0.5 ? [a, b] : [b, a];
    return draft(`${show(x)} + ${show(y)}`, frac(a + b), 'add', [x, y]);
  }
};

const sub: Gen = (rng, level) => {
  const [da, db, borrow] = at(SUMS, level);
  for (;;) {
    let a = digits(rng, da);
    let b = digits(rng, db);
    if (a < b) [a, b] = [b, a];
    if (a === b || carries(a, b, true) > 0 !== borrow) continue;
    return draft(`${show(a)} − ${show(b)}`, frac(a - b), 'sub', [a, b]);
  }
};

/** Mehrstellige Multiplikation: [a von, a bis, b von, b bis] */
const MUL = [
  [2, 5, 21, 50], [2, 9, 21, 99], [2, 9, 101, 300], [2, 9, 101, 999], [11, 20, 21, 50],
  [11, 30, 21, 99], [21, 99, 21, 99], [11, 30, 101, 300], [21, 99, 101, 999], [101, 300, 101, 999],
] as const;

const mult: Gen = (rng, level) => {
  const [a0, a1, b0, b1] = at(MUL, level);
  const a = randInt(rng, a0, a1);
  const b = randInt(rng, b0, b1);
  const [x, y] = rng() < 0.5 ? [a, b] : [b, a];
  return draft(`${show(x)} × ${show(y)}`, product([x, y]), 'mul', [x, y]);
};

/** Division ohne Rest: [Teiler von, bis, Ergebnis von, bis]; Level 9–10 mit Dezimalergebnis. */
const DIV = [
  [2, 9, 2, 9], [2, 9, 11, 30], [2, 9, 31, 99], [2, 9, 101, 300],
  [11, 20, 2, 9], [11, 20, 11, 30], [11, 30, 21, 99], [21, 99, 21, 99],
] as const;

const divide: Gen = (rng, level) => {
  if (level >= 9) {
    const d = pick(rng, level === 9 ? [2, 4, 5, 8] : [4, 8, 16, 20, 25]);
    for (;;) {
      const a = level === 9 ? randInt(rng, 11, 99) : randInt(rng, 101, 999);
      if (a % d === 0) continue;
      return draft(`${a} ÷ ${d}`, frac(a, d), 'div', [a, d]);
    }
  }
  const [d0, d1, q0, q1] = at(DIV, level);
  const d = randInt(rng, d0, d1);
  const q = randInt(rng, q0, q1);
  return draft(`${show(d * q)} ÷ ${d}`, frac(q), 'div', [d * q, d]);
};

/** Prozent: je Level [Prozentsatz, Grundwert]. */
const percent: Gen = (rng, level) => {
  const r = (lo: number, hi: number) => randInt(rng, lo, hi);
  const [p, x]: [Frac, number] = at<() => [Frac, number]>(
    [
      () => [frac(pick(rng, [10, 50])), 10 * r(2, 40)],
      () => [frac(pick(rng, [10, 20, 25, 50, 75])), 20 * r(1, 25)],
      () => [frac(5 * r(1, 19)), 20 * r(1, 25)],
      () => [frac(5 * r(1, 19)), 10 * r(2, 99)],
      () => [frac(r(1, 99)), 100 * r(1, 20)],
      () => [frac(5 * r(1, 19)), r(12, 400)],
      () => [frac(r(1, 99)), 10 * r(2, 99)],
      () => [frac(r(1, 99)), r(12, 99)],
      () => [frac(5 * r(21, 50)), 10 * r(2, 99)],
      () => [frac(2 * r(0, 49) + 1, 2), 10 * r(2, 99)],
    ],
    level,
  )();
  return draft(`${show(p)} % von ${show(x)}`, div(mul(p, frac(x)), frac(100)), 'percent', [p, x]);
};

/** Quadrate und Wurzeln: Bereich der Basis; Level 9 Kubikzahlen, Level 10 Quadrate von Dezimalzahlen. */
const POWER = [[2, 10], [11, 15], [16, 20], [21, 30], [31, 50], [51, 75], [76, 99], [101, 125]] as const;

const power: Gen = (rng, level) => {
  const root = rng() < 0.4;
  if (level >= 10) {
    for (;;) {
      const k = randInt(rng, 11, 99);
      if (k % 10 === 0) continue;
      const base = frac(k, 10);
      return draft(`${show(base)}²`, mul(base, base), 'square', [base]);
    }
  }
  if (level === 9) {
    const n = randInt(rng, 2, 10);
    return root ? draft(`∛${show(n ** 3)}`, frac(n), 'cbrt', [n ** 3]) : draft(`${n}³`, frac(n ** 3), 'cube', [n]);
  }
  const [lo, hi] = at(POWER, level);
  const n = randInt(rng, lo, hi);
  return root ? draft(`√${show(n * n)}`, frac(n), 'sqrt', [n * n]) : draft(`${n}²`, frac(n * n), 'square', [n]);
};

/** Brüche ↔ Dezimalzahlen: erlaubte Nenner (nur abbrechende Dezimalbrüche). */
const DENOMINATORS = [
  [2, 4, 5, 10], [2, 4, 5, 10], [5, 8, 10, 20], [8, 20, 25], [8, 20, 25, 50],
  [8, 16, 25, 40], [16, 40, 50], [16, 32, 40], [16, 32, 80, 125], [32, 64, 125, 160],
] as const;

const fraction: Gen = (rng, level) => {
  const den = pick(rng, at(DENOMINATORS, level));
  for (;;) {
    // Ab Level 5 auch unechte Brüche.
    const num = randInt(rng, 1, level >= 5 ? 3 * den - 1 : den - 1);
    if (gcd(num, den) !== 1) continue;
    const value = frac(num, den);
    return level > 1 && rng() < 0.5
      ? draft(show(value), value, 'value', [value], { hint: 'als Bruch', format: 'fraction' })
      : draft(`${num}/${den}`, value, 'value', [value], { hint: 'als Dezimalzahl', format: 'decimal' });
  }
};

/** Zehnerpotenzen: [Nachkommastellen des Faktors, k von, k bis, auch ÷, Schreibweise 10ᵏ] */
const POW10 = [
  [0, 1, 2, false, false], [0, 1, 3, true, false], [1, 1, 3, true, false], [2, 1, 3, true, false],
  [1, 1, 4, true, true], [1, -3, -1, false, true], [2, -3, 4, true, true], [2, -5, 6, true, true],
] as const;

const powersOfTen: Gen = (rng, level) => {
  const exponent = (lo: number, hi: number): number => randInt(rng, lo, hi) || exponent(lo, hi);
  if (level >= 9) {
    // Zwei Zahlen in wissenschaftlicher Schreibweise malnehmen bzw. teilen.
    const [i, j] = [exponent(-3, 4), exponent(-3, 4)];
    const b = randInt(rng, 2, 9);
    const a = level === 9 ? randInt(rng, 2, 9) : b * randInt(rng, 2, 9);
    const [x, y] = [mul(frac(a), pow10(i)), mul(frac(b), pow10(j))];
    const text = (op: string) => `${a} · 10${sup(i)} ${op} ${b} · 10${sup(j)}`;
    return level === 9 ? draft(text('×'), mul(x, y), 'mul', [x, y]) : draft(text('÷'), div(x, y), 'div', [x, y]);
  }
  const [decimals, k0, k1, divides, superscript] = at(POW10, level);
  for (;;) {
    const raw = randInt(rng, decimals === 0 ? 2 : 11, decimals === 2 ? 999 : 99 * 10 ** Math.min(decimals, 1));
    if (decimals > 0 && raw % 10 === 0) continue;
    const m = frac(raw, 10 ** decimals);
    const k = exponent(k0, k1);
    const p = pow10(k);
    const shown = superscript ? `10${sup(k)}` : show(p);
    return divides && rng() < 0.5
      ? draft(`${show(m)} ÷ ${shown}`, div(m, p), 'div', [m, p])
      : draft(`${show(m)} × ${shown}`, mul(m, p), 'mul', [m, p]);
  }
};

/** Überschlag: krumme Zahlen, Ergebnis zählt bei höchstens ±10 % Abweichung. */
const estimate: Gen = (rng, level) => {
  const r = (lo: number, hi: number) => randInt(rng, lo, hi);
  const times = (...f: number[]) => draft(f.map(show).join(' × '), product(f), 'mul', f);
  const over = (a: number, b: number) => draft(`${show(a)} ÷ ${show(b)}`, frac(a, b), 'div', [a, b]);
  const d = at<() => Draft>(
    [
      () => times(r(11, 99), r(2, 9)),
      () => times(r(11, 99), r(11, 99)),
      () => times(r(101, 999), r(11, 99)),
      () => times(r(101, 999), r(101, 999)),
      () => times(r(1001, 9999), r(11, 99)),
      () => over(r(1001, 9999), r(11, 99)),
      () => over(r(10001, 99999), r(11, 999)),
      () => {
        const [p, x] = [r(3, 97), r(1001, 9999)];
        return draft(`${p} % von ${show(x)}`, frac(p * x, 100), 'percent', [p, x]);
      },
      () => {
        const [a, b] = [frac(r(101, 999), 10), frac(r(11, 99), 100)];
        return draft(`${show(a)} × ${show(b)}`, mul(a, b), 'mul', [a, b]);
      },
      () => times(r(11, 99), r(11, 99), r(11, 99)),
    ],
    level,
  )();
  return { ...d, hint: 'Überschlag · ±10 %', format: 'decimal', tolerance: 10 };
};

const GENERATORS: Record<Kind, Gen> = {
  table, add, sub, mul: mult, div: divide, percent, power, fraction, pow10: powersOfTen, estimate,
};

// ---------- Öffentliche Funktionen ----------

export function generate(rng: Rng, kind: Kind, level: number): Task {
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.round(level)));
  const d = GENERATORS[kind](rng, l);
  return { ...d, kind, level: l, key: `${kind}:${d.key ?? d.text}` };
}

/** Wie `generate`, aber nie dieselbe Aufgabe zweimal direkt hintereinander. */
export function nextTask(rng: Rng, kind: Kind, level: number, previousKey?: string): Task {
  for (;;) {
    const task = generate(rng, kind, level);
    if (task.key !== previousKey) return task;
  }
}

/** Prüft eine Eingabe der Zahlentastatur – exakt, bei Überschlag mit exakter Toleranzgrenze. */
export function check(task: Pick<Task, 'answer' | 'format' | 'tolerance'>, input: string): boolean {
  const value = parseFrac(input);
  if (!value) return false;
  if (task.tolerance > 0) return withinPercent(value, task.answer, task.tolerance);
  // „0,75 als Bruch“ darf nicht mit 0,75 beantwortet werden – und umgekehrt.
  if (input.includes('/') !== (task.format === 'fraction') && !isInt(value)) return false;
  return eq(value, task.answer);
}

/** Eine Eingabe, die als richtig gilt (Auflösung nach Fehlern, Tests, E2E-Bot). */
export function answerInput(task: Pick<Task, 'answer' | 'format' | 'tolerance'>): string {
  // Überschlag: auf drei Stellen gerundet. Die Rundung ist nur Anzeige; geprüft wird exakt.
  if (task.tolerance > 0) return String(Number(toNumber(task.answer).toPrecision(3))).replace('.', ',');
  return task.format === 'fraction' ? formatFrac(task.answer) : toDecimal(task.answer)!;
}

export function solutionText(task: Pick<Task, 'answer' | 'format' | 'tolerance'>): string {
  return (task.tolerance > 0 ? '≈ ' : '') + answerInput(task);
}
