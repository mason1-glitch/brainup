import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { add, cmp, div, eq, frac, formatFrac, mul, parseFrac, pow10, sub, toDecimal, withinPercent } from './fraction';

const anyFrac = fc
  .tuple(fc.bigInt({ min: -(10n ** 12n), max: 10n ** 12n }), fc.bigInt({ min: 1n, max: 10n ** 9n }))
  .map(([n, d]) => frac(n, d));

describe('frac', () => {
  it('kürzt und normiert das Vorzeichen', () => {
    expect(frac(6, -8)).toEqual({ n: -3n, d: 4n });
    expect(frac(0, 5)).toEqual({ n: 0n, d: 1n });
    expect(() => frac(1, 0)).toThrow();
  });

  it('rechnet dort exakt, wo Gleitkomma scheitert', () => {
    expect(eq(add(parseFrac('0,1')!, parseFrac('0,2')!), parseFrac('0,3')!)).toBe(true);
    expect(eq(mul(parseFrac('1,1')!, parseFrac('1,1')!), parseFrac('1,21')!)).toBe(true);
    expect(eq(mul(div(frac(1), frac(3)), frac(3)), frac(1))).toBe(true);
  });

  it('Körperaxiome (Property)', () => {
    fc.assert(
      fc.property(anyFrac, anyFrac, anyFrac, (a, b, c) => {
        expect(eq(add(a, b), add(b, a))).toBe(true);
        expect(eq(sub(add(a, b), b), a)).toBe(true);
        expect(eq(mul(a, add(b, c)), add(mul(a, b), mul(a, c)))).toBe(true);
        if (b.n !== 0n) expect(eq(mul(div(a, b), b), a)).toBe(true);
        expect(cmp(a, b)).toBe(-cmp(b, a) || 0);
      }),
    );
  });
});

describe('parseFrac / toDecimal', () => {
  it('liest Ganzzahlen, Brüche und Dezimalzahlen', () => {
    expect(parseFrac('12')).toEqual(frac(12));
    expect(parseFrac('-3')).toEqual(frac(-3));
    expect(parseFrac('3/4')).toEqual(frac(3, 4));
    expect(parseFrac('0,75')).toEqual(frac(3, 4));
    expect(parseFrac('1.5')).toEqual(frac(3, 2));
    expect(parseFrac(',5')).toEqual(frac(1, 2));
    expect(parseFrac('−2,50')).toEqual(frac(-5, 2));
    expect(parseFrac('7,')).toEqual(frac(7));
  });

  it('weist Unsinn ab', () => {
    for (const s of ['', '-', ',', 'abc', '1/0', '1/2/3', '1,2,3', '3/', '--1']) expect(parseFrac(s), s).toBeNull();
  });

  it('schreibt abbrechende Dezimalzahlen exakt, sonst null', () => {
    expect(toDecimal(frac(3, 4))).toBe('0,75');
    expect(toDecimal(frac(-1, 8))).toBe('-0,125');
    expect(toDecimal(frac(42))).toBe('42');
    expect(toDecimal(frac(1, 1000))).toBe('0,001');
    expect(toDecimal(frac(123456, 100), '.')).toBe('1234.56');
    expect(toDecimal(frac(1, 3))).toBeNull();
    expect(toDecimal(pow10(-3))).toBe('0,001');
    expect(formatFrac(frac(10, 4))).toBe('5/2');
  });

  it('Dezimal-Roundtrip (Property)', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: -(10n ** 15n), max: 10n ** 15n }), fc.integer({ min: 0, max: 9 }), (n, k) => {
        const f = mul(frac(n), pow10(-k));
        expect(eq(parseFrac(toDecimal(f)!)!, f)).toBe(true);
      }),
    );
  });
});

describe('withinPercent', () => {
  it('prüft die ±10-%-Grenze exakt, Grenze inklusive', () => {
    expect(withinPercent(frac(110), frac(100), 10)).toBe(true);
    expect(withinPercent(frac(90), frac(100), 10)).toBe(true);
    expect(withinPercent(frac(1101, 10), frac(100), 10)).toBe(false);
    expect(withinPercent(frac(-95), frac(-100), 10)).toBe(true);
  });
});
