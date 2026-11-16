// Rechentricks: nach einem Fehler ein Rechenweg für genau diese Aufgabe.
// Jede Zeile ist entweder eine Gleichungskette („a = b = c“, beim Überschlag „a ≈ b = c“) oder ein
// kurzer Satz ohne Gleichheitszeichen. Der Test rechnet jede Gleichung mit einem eigenen Parser nach.
import { div, frac, isInt, mul, pow10, toDecimal, toNumber, withinPercent, type Frac } from '../../core/fraction';
import { show as s, type Task } from './generators';

export type Trick = string[];

const chain = (...sides: (string | number)[]): string => sides.map((x) => (typeof x === 'number' ? s(x) : x)).join(' = ');

/** Ganze Zahl als number, sonst null. */
const int = (f: Frac | undefined): number | null => (f && isInt(f) && f.n >= 0n && f.n < 10n ** 9n ? Number(f.n) : null);

/** Stellenwerte ohne Nullen, größter zuerst: 345 → [300, 40, 5]. */
function places(n: number): number[] {
  const out: number[] = [];
  for (let p = 1; n > 0; p *= 10, n = Math.floor(n / 10)) if (n % 10) out.unshift((n % 10) * p);
  return out;
}

/** Kleines Einmaleins: über 10, 5 oder Verdoppeln. `f` ist der Faktor, der den Weg vorgibt. */
function lever(k: number, f: number): string | null {
  switch (f) {
    case 9:
      return chain(`${k} × 9`, `${k} × 10 − ${k}`, `${k * 10} − ${k}`, k * 9);
    case 5:
      return chain(`${k} × 5`, `${k} × 10 ÷ 2`, `${k * 10} ÷ 2`, k * 5);
    case 4:
      return chain(`${k} × 4`, `${k} × 2 × 2`, `${k * 2} × 2`, k * 4);
    case 8:
      return chain(`${k} × 8`, `${k} × 2 × 2 × 2`, `${k * 2} × 2 × 2`, `${k * 4} × 2`, k * 8);
    case 6:
      return chain(`${k} × 6`, `${k} × 5 + ${k}`, `${k * 5} + ${k}`, k * 6);
    case 7:
      return chain(`${k} × 7`, `${k} × 5 + ${k} × 2`, `${k * 5} + ${k * 2}`, k * 7);
    default:
      return null;
  }
}

function mulTrick(x: number, y: number): Trick | null {
  if (x <= 10 && y <= 10) {
    const line = x === 10 || y === 10 ? null : (lever(x, y) ?? lever(y, x));
    return line ? [line] : null;
  }
  // Den Faktor mit mehr Stellen zerlegen (bei Gleichstand den zweiten) und mit dem anderen malnehmen.
  const [keep, split] = String(x).length > String(y).length ? [y, x] : [x, y];
  const up = Math.ceil(split / 10) * 10;
  const below = up - split;
  if (split < 100 && (below === 1 || below === 2)) {
    return [chain(`${s(keep)} × ${s(split)}`, `${s(keep)} × ${s(up)} − ${s(keep)} × ${below}`, `${s(keep * up)} − ${s(keep * below)}`, keep * split)];
  }
  const parts = places(split);
  if (parts.length === 1) {
    const power = 10 ** (String(split).length - 1);
    const lead = split / power;
    return lead === 1 ? null : [chain(`${s(keep)} × ${s(split)}`, `${s(keep)} × ${lead} × ${s(power)}`, `${s(keep * lead)} × ${s(power)}`, keep * split)];
  }
  return [
    chain(
      `${s(keep)} × ${s(split)}`,
      parts.map((p) => `${s(keep)} × ${s(p)}`).join(' + '),
      parts.map((p) => s(keep * p)).join(' + '),
      keep * split,
    ),
  ];
}

/** Schrittweise in Stellenwerten: 487 + 256 = 487 + 200 + 50 + 6 = 687 + 50 + 6 = … */
function stepwise(start: number, parts: number[], sign: '+' | '−'): string {
  const rest = (from: number) => parts.slice(from).map((p) => ` ${sign} ${s(p)}`).join('');
  const sides = [`${s(start)} ${sign} ${s(parts.reduce((a, b) => a + b, 0))}`, `${s(start)}${rest(0)}`];
  let acc = start;
  parts.forEach((p, i) => {
    acc += sign === '+' ? p : -p;
    sides.push(`${s(acc)}${rest(i + 1)}`);
  });
  return sides.join(' = ');
}

function addTrick(x: number, y: number): Trick | null {
  const [big, small] = x >= y ? [x, y] : [y, x];
  const parts = places(small);
  if (small < 10) {
    // Bis zum nächsten Zehner auffüllen, dann den Rest.
    const to = 10 - (big % 10);
    if (big % 10 === 0 || small <= to) return null;
    return [chain(`${s(big)} + ${small}`, `${s(big)} + ${to} + ${small - to}`, `${s(big + to)} + ${small - to}`, big + small)];
  }
  return parts.length < 2 ? null : [stepwise(big, parts, '+')];
}

function subTrick(a: number, b: number): Trick | null {
  const parts = places(b);
  if (b < 10) {
    // Erst bis zum Zehner herunter, dann den Rest.
    const to = a % 10;
    if (to === 0 || b <= to) return null;
    return [chain(`${s(a)} − ${b}`, `${s(a)} − ${to} − ${b - to}`, `${s(a - to)} − ${b - to}`, a - b)];
  }
  return parts.length < 2 ? null : [stepwise(a, parts, '−')];
}

function divTrick(a: number, d: number): Trick | null {
  if (a % d === 0) {
    const q = a / d;
    const parts = places(q);
    if (q <= 10) return ['Denk an die Malaufgabe.', chain(`${d} × ${q}`, a)];
    if (parts.length === 1) {
      const power = 10 ** (String(q).length - 1);
      return [chain(`${s(a)} ÷ ${d}`, `${s(a / power)} ÷ ${d} × ${s(power)}`, `${q / power} × ${s(power)}`, q)];
    }
    // Den Dividenden in Vielfache des Teilers zerlegen.
    return [
      chain(s(a), parts.map((p) => s(d * p)).join(' + ')),
      chain(`${s(a)} ÷ ${d}`, parts.map((p) => `${s(d * p)} ÷ ${d}`).join(' + '), parts.map((p) => s(p)).join(' + '), q),
    ];
  }
  // Dezimalergebnis: Teiler aus Zweien und Fünfen – halbieren bzw. über 10 und 100 gehen.
  const value = (n: number, m: number) => s(frac(n, m));
  const halvings = (count: number): Trick => {
    const sides = [`${s(a)} ÷ ${d}`];
    for (let i = 0; i <= count; i++) sides.push(i === count ? value(a, 2 ** i) : `${value(a, 2 ** i)}${' ÷ 2'.repeat(count - i)}`);
    return [sides.join(' = ')];
  };
  switch (d) {
    case 4:
      return halvings(2);
    case 8:
      return halvings(3);
    case 16:
      return halvings(4);
    case 5:
      return [chain(`${s(a)} ÷ 5`, `${s(a)} × 2 ÷ 10`, `${s(a * 2)} ÷ 10`, value(a, 5))];
    case 20:
      return [chain(`${s(a)} ÷ 20`, `${s(a)} ÷ 10 ÷ 2`, `${value(a, 10)} ÷ 2`, value(a, 20))];
    case 25:
      return [chain(`${s(a)} ÷ 25`, `${s(a)} × 4 ÷ 100`, `${s(a * 4)} ÷ 100`, value(a, 25))];
    default:
      return null;
  }
}

function percentTrick(p: Frac, x: Frac): Trick | null {
  const pct = (q: Frac | number) => `${s(q)} %`;
  const of = (q: Frac | number) => div(mul(typeof q === 'number' ? frac(q) : q, x), frac(100));
  const whole = `${pct(p)} von ${s(x)}`;
  const result = s(of(p));
  // Auf halbe Prozent genau zerlegen; alles andere kommt in den Aufgaben nicht vor.
  if (p.d !== 1n && p.d !== 2n) return null;
  const twice = Number(p.n * (2n / p.d));
  const value = twice / 2;
  const fraction = (n: number, m: number) => s(div(x, frac(m, n)));
  switch (value) {
    case 100:
      return null;
    case 50:
      return [chain(whole, `${s(x)} ÷ 2`, result)];
    case 25:
      return [chain(whole, `${s(x)} ÷ 4`, result)];
    case 75:
      return [chain(whole, `${s(x)} ÷ 4 × 3`, `${fraction(1, 4)} × 3`, result)];
    case 20:
      return [chain(whole, `${s(x)} ÷ 5`, result)];
    case 10:
      return [chain(whole, `${s(x)} ÷ 10`, result)];
    case 5:
      return [chain(whole, `${s(x)} ÷ 10 ÷ 2`, `${fraction(1, 10)} ÷ 2`, result)];
    case 1:
      return [chain(whole, `${s(x)} ÷ 100`, result)];
  }
  // Zerlegen in Hunderter, Zehner, 5 %, Einer und ein halbes Prozent.
  const hundreds = Math.floor(value / 100) * 100;
  const tens = Math.floor((value - hundreds) / 10) * 10;
  const rest = value - hundreds - tens;
  const five = rest >= 5 ? 5 : 0;
  const ones = Math.floor(rest - five);
  const half = rest - five - ones > 0;
  const parts: Frac[] = [hundreds, tens, five, ones].filter((n) => n > 0).map((n) => frac(n));
  if (half) parts.push(frac(1, 2));
  const lines: Trick = [];
  if (tens > 0 || five > 0) lines.push(chain(`10 % von ${s(x)}`, s(of(10))));
  if (ones > 0 || half) lines.push(chain(`1 % von ${s(x)}`, s(of(1))));
  if (parts.length === 1) {
    // Ein einziger Teil: ein Vielfaches von 100 %, 10 % oder 1 % – oder die Hälfte von 1 %.
    if (half) return [...lines, chain(whole, `${s(of(1))} ÷ 2`, result)];
    const base = hundreds > 0 ? 100 : tens > 0 ? 10 : 1;
    const times = (hundreds || tens || ones) / base;
    return times === 1 ? null : [...lines, chain(whole, `${times} × ${s(of(base))}`, result)];
  }
  lines.push(chain(pct(p), parts.map(pct).join(' + ')));
  lines.push(chain(whole, parts.map((q) => s(of(q))).join(' + '), result));
  return lines;
}

function squareTrick(n: number): Trick | null {
  if (n <= 10) return null;
  if (n % 10 === 0) return [chain(`${n}²`, `${n / 10}² × 100`, `${(n / 10) ** 2} × 100`, n * n)];
  // n² = (n − d) × (n + d) + d², mit d bis zum nächsten glatten Zehner.
  const d = n % 10 <= 5 ? n % 10 : 10 - (n % 10);
  return [chain(`${n}²`, `${n - d} × ${n + d} + ${d}²`, `${s((n - d) * (n + d))} + ${d * d}`, n * n)];
}

function sqrtTrick(square: number): Trick | null {
  const n = Math.round(Math.sqrt(square));
  if (n * n !== square) return null;
  if (n <= 10) return ['Denk an die Quadratzahlen.', chain(`${n} × ${n}`, square)];
  if (n % 10 === 0) return [chain(`√${s(square)}`, `√${s(square / 100)} × 10`, `${n / 10} × 10`, n)];
  const lo = Math.floor(n / 10) * 10;
  const ends = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((e) => (e * e) % 10 === square % 10);
  return [
    chain(`${lo}²`, lo * lo),
    chain(`${lo + 10}²`, (lo + 10) * (lo + 10)),
    `Die Wurzel liegt dazwischen. Endziffer ${square % 10}: Sie endet auf ${ends.join(' oder ')}.`,
  ];
}

function fractionTrick(task: Task): Trick | null {
  const { n, d } = task.answer;
  if (n <= 0n || d === 1n) return null;
  const decimal = toDecimal(task.answer);
  if (decimal === null) return null;
  const digits = decimal.split(',')[1]?.length ?? 0;
  const power = 10n ** BigInt(digits);
  const scaled = (n * power) / d;
  if (task.format === 'decimal') {
    // Auf einen Zehner-Nenner erweitern.
    return power === d ? null : [chain(`${n}/${d}`, `${scaled}/${power}`, decimal)];
  }
  const shortened = power / d;
  const lines = [chain(decimal, `${scaled}/${power}`, `${n}/${d}`)];
  if (shortened > 1n) lines.push(`Gekürzt mit ${shortened}.`);
  return lines;
}

/** Exponent k, wenn der Bruch genau 10^k ist (k ≠ 0), sonst null. */
function exponentOf(p: Frac): number | null {
  const big = p.d === 1n ? p.n : p.n === 1n ? p.d : null;
  if (big === null || !/^10+$/.test(big.toString())) return null;
  const k = big.toString().length - 1;
  return p.d === 1n ? k : -k;
}

function pow10Trick(task: Task): Trick | null {
  const { op, args } = task.expr;
  if ((op !== 'mul' && op !== 'div') || args.length !== 2) return null;
  const k = exponentOf(args[1]!);
  if (k === null) return [op === 'mul' ? 'Zahlen malnehmen, Hochzahlen addieren.' : 'Zahlen teilen, Hochzahlen abziehen.'];
  const shift = op === 'mul' ? k : -k;
  return [`Komma ${Math.abs(shift)} ${Math.abs(shift) === 1 ? 'Stelle' : 'Stellen'} nach ${shift > 0 ? 'rechts' : 'links'}.`];
}

/** Auf `sig` geltende Stellen runden (exakt, kaufmännisch). */
function roundSig(v: Frac, sig: number): Frac {
  const scale = pow10(Math.floor(Math.log10(toNumber(v))) - sig + 1);
  const q = div(v, scale);
  return mul(frac((2n * q.n + q.d) / (2n * q.d)), scale);
}

function estimateTrick(task: Task): Trick | null {
  const { op, args } = task.expr;
  if ((op !== 'mul' && op !== 'div' && op !== 'percent') || args.length < 2) return null;
  const text = (v: Frac[]) =>
    op === 'percent' ? `${s(v[0]!)} % von ${s(v[1]!)}` : v.map((x) => s(x)).join(op === 'mul' ? ' × ' : ' ÷ ');
  const valueOf = (v: Frac[]) =>
    op === 'mul' ? v.reduce((a, b) => mul(a, b)) : op === 'div' ? div(v[0]!, v[1]!) : div(mul(v[0]!, v[1]!), frac(100));
  // Erst grob runden (eine Stelle), nur wo nötig feiner – bis das Ergebnis sicher im erlaubten Bereich liegt.
  const combos = args.reduce<number[][]>((all) => all.flatMap((c) => [[...c, 1], [...c, 2]]), [[]]);
  combos.sort((a, b) => a.reduce((x, y) => x + y, 0) - b.reduce((x, y) => x + y, 0));
  for (const combo of combos) {
    const rounded = args.map((a, i) => roundSig(a, combo[i]!));
    const value = valueOf(rounded);
    if (rounded.every((r, i) => r.n === args[i]!.n && r.d === args[i]!.d)) continue;
    if (toDecimal(value) === null || !withinPercent(value, task.answer, task.tolerance)) continue;
    return ['Runde so, dass du im Kopf rechnen kannst.', `${text(args)} ≈ ${text(rounded)} = ${s(value)}`];
  }
  return null;
}

/** Ein Rechenweg für diese Aufgabe; null, wenn es keinen lohnenden gibt. */
export function trickFor(task: Task): Trick | null {
  if (task.kind === 'estimate') return estimateTrick(task);
  if (task.kind === 'pow10') return pow10Trick(task);
  if (task.kind === 'fraction') return fractionTrick(task);
  const { op, args } = task.expr;
  const [a, b] = [int(args[0]), int(args[1])];
  switch (op) {
    case 'mul':
      return a !== null && b !== null && a >= 2 && b >= 2 ? mulTrick(a, b) : null;
    case 'add':
      return a !== null && b !== null ? addTrick(a, b) : null;
    case 'sub':
      return a !== null && b !== null && a > b ? subTrick(a, b) : null;
    case 'div':
      return a !== null && b !== null && b >= 2 ? divTrick(a, b) : null;
    case 'percent':
      return args.length === 2 ? percentTrick(args[0]!, args[1]!) : null;
    case 'square': {
      if (a !== null) return squareTrick(a);
      // Dezimalzahl mit einer Nachkommastelle: erst ohne Komma quadrieren.
      const tenfold = int(args[0] && mul(args[0], frac(10)));
      const inner = tenfold === null ? null : squareTrick(tenfold);
      return tenfold === null || inner === null
        ? null
        : [...inner, chain(`${s(args[0]!)}²`, `${tenfold}² ÷ 100`, `${s(tenfold * tenfold)} ÷ 100`, s(task.answer))];
    }
    case 'sqrt':
      return a !== null ? sqrtTrick(a) : null;
    case 'cube':
      return a !== null ? [chain(`${a}³`, `${a}² × ${a}`, `${a * a} × ${a}`, a ** 3)] : null;
    case 'cbrt': {
      const n = int(task.answer);
      return n !== null ? ['Denk an die Kubikzahlen.', chain(`${n} × ${n} × ${n}`, `${n * n} × ${n}`, n ** 3)] : null;
    }
    default:
      return null;
  }
}
