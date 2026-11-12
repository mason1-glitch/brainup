import { describe, expect, it } from 'vitest';
import { seededRng } from './rng';
import { initStaircase, threshold, updateStaircase, type StaircaseConfig } from './staircase';

/** Zielquote eines 3-down-1-up-Verfahrens: p³ = 0,5. */
const TARGET = Math.cbrt(0.5);

/** Simulierter Spieler: logistische psychometrische Funktion mit Ratewahrscheinlichkeit. */
function player(mid: number, slope: number, guess: number, log: boolean) {
  const pCorrect = (x: number) => guess + (1 - guess) / (1 + Math.exp(-((log ? Math.log(x) : x) - mid) / slope));
  // Wert, bei dem der Spieler genau die Zielquote erreicht = wahre Schwelle.
  const z = mid + slope * Math.log((TARGET - guess) / (1 - TARGET));
  return { pCorrect, trueThreshold: log ? Math.exp(z) : z };
}

/** Spielt `trials` Durchgänge und liefert die Werte nach der Einschwingphase. */
function run(cfg: StaircaseConfig, pCorrect: (x: number) => number, seed: number, trials = 500, burnIn = 50) {
  const rng = seededRng(seed);
  let s = initStaircase(cfg);
  const values: number[] = [];
  for (let i = 0; i < trials; i++) {
    if (i >= burnIn) values.push(s.value);
    s = updateStaircase(cfg, s, rng() < pCorrect(s.value));
  }
  return values;
}

describe('staircase', () => {
  it('3 richtige → schwerer, 1 Fehler → leichter, Grenzen halten', () => {
    const cfg: StaircaseConfig = { start: 5, min: 1, max: 6, down: 3, steps: [1], scale: 'add', harder: 'up' };
    let s = initStaircase(cfg);
    s = updateStaircase(cfg, s, true);
    s = updateStaircase(cfg, s, true);
    expect(s.value).toBe(5);
    s = updateStaircase(cfg, s, true);
    expect(s.value).toBe(6);
    for (let i = 0; i < 3; i++) s = updateStaircase(cfg, s, true);
    expect(s.value).toBe(6);
    s = updateStaircase(cfg, s, false);
    expect(s.value).toBe(5);
    expect(s.reversals).toBe(1);
    expect(s.trials).toBe(7);
  });

  it('trifft eine bekannte Schwelle auf ±10 % (Darbietungszeit in ms, multiplikativ, kürzer = schwerer)', () => {
    // Ein leichter Durchgang ist lang: p steigt mit log(ms).
    const p = player(Math.log(60), 0.25, 1 / 16, true);
    const cfg: StaircaseConfig = { start: 400, min: 8, max: 1000, down: 3, steps: [1.6, 1.3, 1.06], scale: 'mul', harder: 'down' };
    for (let seed = 1; seed <= 100; seed++) {
      const est = threshold(cfg, run(cfg, p.pCorrect, seed))!;
      expect(Math.abs(est - p.trueThreshold) / p.trueThreshold, `seed ${seed}: ${est} vs ${p.trueThreshold}`).toBeLessThan(0.1);
    }
  });

  it('trifft eine bekannte Schwelle auf ±10 % (Level, additiv, höher = schwerer)', () => {
    // Höheres Level ist schwerer: p fällt mit dem Level.
    const inner = player(-12, 1.2, 0.5, false);
    const pCorrect = (level: number) => inner.pCorrect(-level);
    const trueThreshold = -inner.trueThreshold;
    const cfg: StaircaseConfig = { start: 1, min: 1, max: 30, down: 3, steps: [2, 1, 0.5], scale: 'add', harder: 'up' };
    for (let seed = 1; seed <= 100; seed++) {
      const est = threshold(cfg, run(cfg, pCorrect, seed))!;
      expect(Math.abs(est - trueThreshold) / trueThreshold, `seed ${seed}: ${est} vs ${trueThreshold}`).toBeLessThan(0.1);
    }
  });

  it('liefert ohne Durchgänge keine Schätzung', () => {
    const cfg: StaircaseConfig = { start: 1, min: 1, max: 9, down: 3, steps: [1], scale: 'add', harder: 'up' };
    expect(threshold(cfg, [])).toBeNull();
  });
});
