import { describe, expect, it } from 'vitest';
import { add, div, eq, frac, mul, parseFrac, sub, withinPercent, cmp, type Frac } from '../../core/fraction';
import { seededRng } from '../../core/rng';
import { generate, KINDS, type Kind, type Task } from './generators';
import { trickFor } from './tricks';

// ---------- Eigener Rechner für die Zeilen eines Tricks (unabhängig von tricks.ts) ----------

type Token = { type: 'num'; value: Frac } | { type: 'op'; value: string };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let rest = text.trim();
  while (rest.length > 0) {
    const number = /^\d[\d   ]*(,\d+)?/.exec(rest);
    if (number) {
      const value = parseFrac(number[0].replace(/[   ]/g, ''));
      if (!value) throw new Error(`Zahl nicht lesbar: ${number[0]}`);
      tokens.push({ type: 'num', value });
      rest = rest.slice(number[0].length).trimStart();
      continue;
    }
    const op = /^(von|[+−×÷/²³%√])/.exec(rest);
    if (!op) throw new Error(`Unbekanntes Zeichen in „${text}“ bei „${rest}“`);
    tokens.push({ type: 'op', value: op[0] });
    rest = rest.slice(op[0].length).trimStart();
  }
  return tokens;
}

/** Punkt vor Strich, von links nach rechts; ² ³ % hinter der Zahl, √ davor. */
function evaluate(text: string): Frac {
  const tokens = tokenize(text);
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (...ops: string[]) => peek()?.type === 'op' && ops.includes((peek() as { value: string }).value);
  const take = () => (tokens[pos++] as { value: string }).value;

  function factor(): Frac {
    if (isOp('√')) {
      take();
      const inner = factor();
      if (inner.d !== 1n) throw new Error('Wurzel aus Bruch');
      let r = 0n;
      while (r * r < inner.n) r++;
      if (r * r !== inner.n) throw new Error(`keine Quadratzahl: ${inner.n}`);
      return frac(r);
    }
    const t = tokens[pos++];
    if (!t || t.type !== 'num') throw new Error(`Zahl erwartet in „${text}“`);
    let value = t.value;
    while (isOp('²', '³', '%')) {
      const op = take();
      value = op === '²' ? mul(value, value) : op === '³' ? mul(mul(value, value), value) : div(value, frac(100));
    }
    return value;
  }
  function term(): Frac {
    let value = factor();
    while (isOp('×', '÷', '/', 'von')) {
      const op = take();
      const right = factor();
      value = op === '×' || op === 'von' ? mul(value, right) : div(value, right);
    }
    return value;
  }
  let value = term();
  while (isOp('+', '−')) {
    const op = take();
    const right = term();
    value = op === '+' ? add(value, right) : sub(value, right);
  }
  if (pos !== tokens.length) throw new Error(`Rest nicht gelesen in „${text}“`);
  return value;
}

/** Prüft eine Zeile; liefert die Werte ihrer Seiten (leer bei einem Satz ohne Gleichung). */
function checkLine(line: string): Frac[] {
  if (!/[=≈]/.test(line)) return [];
  const [left, approx] = line.split(' ≈ ');
  const exact = (approx ?? left!).split(' = ').map(evaluate);
  for (const side of exact) expect(eq(side, exact[0]!), line).toBe(true);
  if (approx === undefined) return exact;
  const target = evaluate(left!);
  expect(withinPercent(exact[0]!, target, 10), line).toBe(true);
  return [target, ...exact];
}

const task = (kind: Kind, level: number, seed: number): Task => generate(seededRng(seed), kind, level);

describe('Der Prüfrechner selbst', () => {
  it('rechnet Punkt vor Strich, Potenzen, Prozent, Wurzeln und Tausendergruppen', () => {
    expect(eq(evaluate('7 × 10 − 7'), frac(63))).toBe(true);
    expect(eq(evaluate('40 ÷ 2 ÷ 2'), frac(10))).toBe(true);
    expect(eq(evaluate('44 × 50 + 3²'), frac(2209))).toBe(true);
    expect(eq(evaluate('35 % von 240'), frac(84))).toBe(true);
    expect(eq(evaluate('30 % + 5 %'), frac(35, 100))).toBe(true);
    expect(eq(evaluate('√1600 × 10'), frac(400))).toBe(true);
    expect(eq(evaluate('375/1000'), frac(3, 8))).toBe(true);
    expect(eq(evaluate('12 345 + 0,5'), frac(24691, 2))).toBe(true);
    expect(() => evaluate('3 +')).toThrow();
    expect(() => checkLine('2 + 2 = 5')).toThrow();
  });
});

describe('Rechentricks', () => {
  it('Beispiele von Hand', () => {
    const by = (text: string, expr: Task['expr'], answer: Frac, extra: Partial<Task> = {}): Task => ({
      kind: 'mul', level: 1, key: text, text, hint: '', answer, format: 'int', tolerance: 0, expr, ...extra,
    });
    const f = (...n: number[]) => n.map((x) => frac(x));
    expect(trickFor(by('17 × 13', { op: 'mul', args: f(17, 13) }, frac(221)))).toEqual(['17 × 13 = 17 × 10 + 17 × 3 = 170 + 51 = 221']);
    expect(trickFor(by('7 × 9', { op: 'mul', args: f(7, 9) }, frac(63)))).toEqual(['7 × 9 = 7 × 10 − 7 = 70 − 7 = 63']);
    expect(trickFor(by('23 × 49', { op: 'mul', args: f(23, 49) }, frac(1127)))).toEqual(['23 × 49 = 23 × 50 − 23 × 1 = 1150 − 23 = 1127']);
    expect(trickFor(by('345 × 7', { op: 'mul', args: f(345, 7) }, frac(2415)))).toEqual(['7 × 345 = 7 × 300 + 7 × 40 + 7 × 5 = 2100 + 280 + 35 = 2415']);
    expect(trickFor(by('47 + 38', { op: 'add', args: f(47, 38) }, frac(85)))).toEqual(['47 + 38 = 47 + 30 + 8 = 77 + 8 = 85']);
    expect(trickFor(by('8 + 47', { op: 'add', args: f(8, 47) }, frac(55)))).toEqual(['47 + 8 = 47 + 3 + 5 = 50 + 5 = 55']);
    expect(trickFor(by('83 − 47', { op: 'sub', args: f(83, 47) }, frac(36)))).toEqual(['83 − 47 = 83 − 40 − 7 = 43 − 7 = 36']);
    expect(trickFor(by('52 − 7', { op: 'sub', args: f(52, 7) }, frac(45)))).toEqual(['52 − 7 = 52 − 2 − 5 = 50 − 5 = 45']);
    expect(trickFor(by('96 ÷ 4', { op: 'div', args: f(96, 4) }, frac(24)))).toEqual(['96 = 80 + 16', '96 ÷ 4 = 80 ÷ 4 + 16 ÷ 4 = 20 + 4 = 24']);
    expect(trickFor(by('37 ÷ 4', { op: 'div', args: f(37, 4) }, frac(37, 4)))).toEqual(['37 ÷ 4 = 37 ÷ 2 ÷ 2 = 18,5 ÷ 2 = 9,25']);
    expect(trickFor(by('35 % von 240', { op: 'percent', args: f(35, 240) }, frac(84)))).toEqual([
      '10 % von 240 = 24',
      '35 % = 30 % + 5 %',
      '35 % von 240 = 72 + 12 = 84',
    ]);
    expect(trickFor(by('75 % von 80', { op: 'percent', args: f(75, 80) }, frac(60)))).toEqual(['75 % von 80 = 80 ÷ 4 × 3 = 20 × 3 = 60']);
    expect(trickFor(by('0,5 % von 940', { op: 'percent', args: [frac(1, 2), frac(940)] }, frac(47, 10)))).toEqual([
      '1 % von 940 = 9,4',
      '0,5 % von 940 = 9,4 ÷ 2 = 4,7',
    ]);
    expect(trickFor(by('30 % von 240', { op: 'percent', args: f(30, 240) }, frac(72)))).toEqual(['10 % von 240 = 24', '30 % von 240 = 3 × 24 = 72']);
    expect(trickFor(by('200 % von 45', { op: 'percent', args: f(200, 45) }, frac(90)))).toEqual(['200 % von 45 = 2 × 45 = 90']);
    expect(trickFor(by('47²', { op: 'square', args: f(47) }, frac(2209)))).toEqual(['47² = 44 × 50 + 3² = 2200 + 9 = 2209']);
    expect(trickFor(by('35²', { op: 'square', args: f(35) }, frac(1225)))).toEqual(['35² = 30 × 40 + 5² = 1200 + 25 = 1225']);
    expect(trickFor(by('√2209', { op: 'sqrt', args: f(2209) }, frac(47)))).toEqual([
      '40² = 1600',
      '50² = 2500',
      'Die Wurzel liegt dazwischen. Endziffer 9: Sie endet auf 3 oder 7.',
    ]);
    const eighth = { kind: 'fraction' as const, expr: { op: 'value' as const, args: [frac(3, 8)] } };
    expect(trickFor(by('3/8', eighth.expr, frac(3, 8), { kind: 'fraction', format: 'decimal' }))).toEqual(['3/8 = 375/1000 = 0,375']);
    expect(trickFor(by('0,375', eighth.expr, frac(3, 8), { kind: 'fraction', format: 'fraction' }))).toEqual(['0,375 = 375/1000 = 3/8', 'Gekürzt mit 125.']);
    expect(trickFor(by('4,7 × 1000', { op: 'mul', args: [frac(47, 10), frac(1000)] }, frac(4700), { kind: 'pow10' }))).toEqual(['Komma 3 Stellen nach rechts.']);
    expect(trickFor(by('4,7 ÷ 10', { op: 'div', args: [frac(47, 10), frac(10)] }, frac(47, 100), { kind: 'pow10' }))).toEqual(['Komma 1 Stelle nach links.']);
    expect(trickFor(by('49 × 21', { op: 'mul', args: f(49, 21) }, frac(1029), { kind: 'estimate', tolerance: 10 }))).toEqual([
      'Runde so, dass du im Kopf rechnen kannst.',
      '49 × 21 ≈ 50 × 20 = 1000',
    ]);
    // Zu Triviales bekommt keinen Trick; gespeicherte Aufgaben ohne Rechenvorschrift auch nicht.
    expect(trickFor(by('3 × 2', { op: 'mul', args: f(3, 2) }, frac(6)))).toBeNull();
    expect(trickFor(by('7 × 10', { op: 'mul', args: f(7, 10) }, frac(70)))).toBeNull();
    expect(trickFor(by('43 + 5', { op: 'add', args: f(43, 5) }, frac(48)))).toBeNull();
    expect(trickFor(by('17 × 13', { op: 'value', args: f(221) }, frac(221)))).toBeNull();
  });

  it('jede Gleichung in jedem Trick stimmt, und der Trick führt zur Lösung (alle Typen × Level × 200 Seeds)', () => {
    const coverage: Record<string, number> = {};
    for (const kind of KINDS) {
      let withTrick = 0;
      for (let level = 1; level <= 10; level++) {
        for (let seed = 0; seed < 200; seed++) {
          const t = task(kind, level, seed * 97 + level);
          const trick = trickFor(t);
          if (trick === null) continue;
          withTrick++;
          expect(trick.length).toBeGreaterThan(0);
          const values = trick.flatMap(checkLine);
          const label = `${t.text} → ${trick.join(' | ')}`;
          if (kind === 'estimate') {
            // Der gerundete Wert würde als Antwort gelten.
            expect(withinPercent(values.at(-1)!, t.answer, t.tolerance), label).toBe(true);
          } else if (kind === 'pow10') {
            expect(values, label).toEqual([]);
          } else if (t.expr.op === 'sqrt' && trick.length === 3) {
            // Eingrenzung: Die Lösung liegt echt zwischen den beiden genannten Quadratzahlen.
            const [lo, hi] = [values[1]!, values[3]!];
            const square = mul(t.answer, t.answer);
            expect(cmp(lo, square) < 0 && cmp(square, hi) < 0, label).toBe(true);
          } else if (trick[0]!.startsWith('Denk an')) {
            // Umkehraufgabe: Die Lösung steht als Faktor da, das Produkt ist die Zahl aus der Aufgabe.
            const factors = trick[1]!.split(' = ')[0]!.split(' × ');
            expect(factors, label).toContain(t.answer.n.toString());
            expect(values.some((v) => eq(v, t.expr.args[0]!)), label).toBe(true);
          } else {
            expect(values.some((v) => eq(v, t.answer)), label).toBe(true);
          }
          for (const line of trick) expect(line.length, label).toBeLessThan(120);
        }
      }
      coverage[kind] = withTrick / 2000;
    }
    // Für die meisten Aufgaben jedes Typs gibt es einen Trick.
    for (const kind of KINDS) expect(coverage[kind], `${kind}: ${JSON.stringify(coverage)}`).toBeGreaterThan(0.6);
  });
});
