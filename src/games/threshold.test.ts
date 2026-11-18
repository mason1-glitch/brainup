import { describe, expect, it } from 'vitest';
import { seededRng, type Rng } from '../core/rng';
import { initStaircase, updateStaircase, type StaircaseConfig, type StaircaseState } from '../core/staircase';
import type { Summary, Trial } from '../data/types';
import * as flanker from './flanker/logic';
import * as taskswitch from './taskswitch/logic';
import * as ufov from './ufov/logic';

const frame = 1000 / 60;
const quantize = (ms: number) => Math.max(1, Math.round(ms / frame)) * frame;

/** Simulierter Spieler: Trefferwahrscheinlichkeit steigt logistisch mit der (log.) Zeit; Raten = 50 %. */
function player(w50: number, slope = 0.15) {
  const p = (ms: number) => 0.5 + 0.5 / (1 + Math.exp(-(Math.log(ms) - Math.log(w50)) / slope));
  // Punkt, auf den 3-down-1-up einschwingt (79,4 %).
  const w79 = w50 * Math.exp(slope * Math.log(0.588 / 0.412));
  return { p, w79 };
}

function session(cfg: StaircaseConfig, start: StaircaseState, n: number, p: (ms: number) => number, rng: Rng) {
  let stair = start;
  const trials: Trial[] = [];
  for (let i = 0; i < n; i++) {
    const ms = quantize(Math.min(cfg.max, Math.max(cfg.min, stair.value)));
    const correct = rng() < p(ms);
    trials.push({ sessionId: 's', gameId: 'x', kind: '', ts: i, task: {}, response: null, rtMs: 500, correct, difficulty: ms });
    stair = updateStaircase(cfg, stair, correct);
  }
  return { trials, stair };
}

const estimate = (s: Summary) => Number(s.headline.value.replace(' ms', ''));

const GAMES = [
  { name: 'Blickfeld', cfg: ufov.STAIRCASE, n: 30, summarize: (t: Trial[], st: StaircaseState) => ufov.summarize(t, { stage: 1, stair: st }) },
  { name: 'Pfeilfokus', cfg: flanker.STAIRCASE, n: 40, summarize: (t: Trial[], st: StaircaseState) => flanker.summarize(t, { stair: st }) },
  { name: 'Wechselspiel', cfg: taskswitch.STAIRCASE, n: 40, summarize: (t: Trial[], st: StaircaseState) => taskswitch.summarize(t, { stair: st }) },
];

/** Relative Abweichung der Schwelle, die der Ergebnisbildschirm nach Lauf `sessions` zeigt, über viele Spieler. */
function deviations(game: (typeof GAMES)[number], w50: number, sessions: number, seeds = 200): number[] {
  const { p, w79 } = player(w50);
  const errs: number[] = [];
  for (let seed = 0; seed < seeds; seed++) {
    const rng = seededRng(seed);
    let stair = initStaircase(game.cfg);
    let last: Summary | null = null;
    // Jeder Lauf beginnt mit dem gespeicherten Stand des vorigen – wie in der App.
    for (let k = 0; k < sessions; k++) {
      const run = session(game.cfg, stair, game.n, p, rng);
      stair = run.stair;
      last = game.summarize(run.trials, stair);
    }
    errs.push(estimate(last!) / w79 - 1);
  }
  return errs.sort((a, b) => a - b);
}

const median = (sorted: number[]) => sorted[sorted.length >> 1]!;
const share = (errs: number[], limit: number) => errs.filter((e) => Math.abs(e) <= limit).length / errs.length;

// Die Schwelle auf dem Ergebnisbildschirm (Mittel der zweiten Hälfte des Laufs, D10) gegen simulierte Spieler mit
// bekannter Schwelle. Gezeigt wird der 79,4-%-Punkt, auf den 3-down-1-up einschwingt.
describe('Messtechnik: Schwelle aus einem einzelnen Lauf', () => {
  for (const game of GAMES) {
    it(`${game.name}: ab dem zweiten Lauf erwartungstreu, meist auf ±20 % genau`, () => {
      for (const factor of [0.25, 0.5, 0.9]) {
        const errs = deviations(game, game.cfg.start * factor, 2);
        expect(Math.abs(median(errs)), `Schwelle bei ${factor} × Start`).toBeLessThanOrEqual(0.05);
        expect(share(errs, 0.2), `Schwelle bei ${factor} × Start`).toBeGreaterThanOrEqual(0.85);
      }
    });

    it(`${game.name}: der allererste Lauf überschätzt eine tiefe Schwelle etwas – im Median um höchstens 15 %`, () => {
      // Startet der Staircase weit über der Schwelle, ist das Einschwingen in der ersten Hälfte noch nicht ganz vorbei.
      const errs = deviations(game, game.cfg.start * 0.25, 1);
      expect(median(errs)).toBeGreaterThanOrEqual(0);
      expect(median(errs)).toBeLessThanOrEqual(0.15);
      expect(share(errs, 0.3)).toBeGreaterThanOrEqual(0.8);
    });
  }
});
