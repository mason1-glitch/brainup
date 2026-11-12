// Exakte rationale Arithmetik auf bigint – keine Gleitkommafehler.
// Alle Rechenaufgaben und Antwortprüfungen laufen hierüber.

/** Gekürzter Bruch mit positivem Nenner. Nur über `frac()` erzeugen. */
export interface Frac {
  readonly n: bigint;
  readonly d: bigint;
}

function gcd(a: bigint, b: bigint): bigint {
  if (a < 0n) a = -a;
  if (b < 0n) b = -b;
  while (b) [a, b] = [b, a % b];
  return a;
}

export function frac(n: bigint | number, d: bigint | number = 1n): Frac {
  let num = BigInt(n);
  let den = BigInt(d);
  if (den === 0n) throw new RangeError('Nenner 0');
  if (den < 0n) [num, den] = [-num, -den];
  const g = gcd(num, den) || 1n;
  return { n: num / g, d: den / g };
}

export const add = (a: Frac, b: Frac): Frac => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Frac, b: Frac): Frac => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Frac, b: Frac): Frac => frac(a.n * b.n, a.d * b.d);
export const div = (a: Frac, b: Frac): Frac => frac(a.n * b.d, a.d * b.n);
export const neg = (a: Frac): Frac => ({ n: -a.n, d: a.d });
export const abs = (a: Frac): Frac => (a.n < 0n ? neg(a) : a);
export const eq = (a: Frac, b: Frac): boolean => a.n === b.n && a.d === b.d;
export const isInt = (a: Frac): boolean => a.d === 1n;

/** -1, 0 oder 1. */
export function cmp(a: Frac, b: Frac): -1 | 0 | 1 {
  const l = a.n * b.d;
  const r = b.n * a.d;
  return l < r ? -1 : l > r ? 1 : 0;
}

/** 10^k als Bruch, k darf negativ sein. */
export function pow10(k: number): Frac {
  return k >= 0 ? frac(10n ** BigInt(k)) : frac(1n, 10n ** BigInt(-k));
}

/**
 * Liest „12“, „-3“, „3/4“, „0,75“, „1.5“, „,5“. Null bei ungültiger Eingabe.
 * Dezimalzahlen werden exakt als Bruch gelesen.
 */
export function parseFrac(input: string): Frac | null {
  const s = input.trim().replace(/−/g, '-');
  let m = /^(-?\d+)\/(\d+)$/.exec(s);
  if (m) return m[2] !== undefined && BigInt(m[2]) !== 0n ? frac(BigInt(m[1]!), BigInt(m[2])) : null;
  m = /^(-?)(\d*)(?:[.,](\d*))?$/.exec(s);
  if (!m || (m[2] === '' && !m[3])) return null;
  const decimals = m[3] ?? '';
  const value = frac(BigInt((m[2] || '0') + decimals), 10n ** BigInt(decimals.length));
  return m[1] ? neg(value) : value;
}

/**
 * Exakte Dezimaldarstellung oder null, wenn der Bruch nicht abbricht (z. B. 1/3).
 * Bricht genau dann ab, wenn der Nenner nur die Primfaktoren 2 und 5 hat.
 */
export function toDecimal(a: Frac, separator = ','): string | null {
  let d = a.d;
  let digits = 0;
  while (d % 10n === 0n) (d /= 10n), digits++;
  let scale = 1n;
  while (d % 2n === 0n) (d /= 2n), (scale *= 5n), digits++;
  while (d % 5n === 0n) (d /= 5n), (scale *= 2n), digits++;
  if (d !== 1n) return null;
  const neg = a.n < 0n;
  const raw = ((neg ? -a.n : a.n) * scale).toString().padStart(digits + 1, '0');
  const int = raw.slice(0, raw.length - digits);
  return (neg ? '-' : '') + int + (digits ? separator + raw.slice(raw.length - digits) : '');
}

/** „3/4“ bzw. „5“ für ganze Zahlen. */
export function formatFrac(a: Frac): string {
  return isInt(a) ? a.n.toString() : `${a.n}/${a.d}`;
}

/** Nur für Anzeige und Grafik – nie zum Rechnen oder Vergleichen. */
export function toNumber(a: Frac): number {
  return Number(a.n) / Number(a.d);
}

/** |value − target| ≤ percent % von |target| – exakt geprüft (für Überschlag). */
export function withinPercent(value: Frac, target: Frac, percent: number): boolean {
  const tolerance = mul(abs(target), frac(percent, 100));
  return cmp(abs(sub(value, target)), tolerance) <= 0;
}
