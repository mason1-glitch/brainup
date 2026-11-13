import { describe, expect, it } from 'vitest';
import { seededRng } from '../../core/rng';
import type { Trial } from '../../data/types';
import {
  apply, axisAngle, BASE_VIEW, det, generateFigure, initialState, isChiral, makeTrial, MAX_LEVEL, MAX_TILT, mirror, mul,
  paramsFor, renderFaces, ROTATIONS_24, shapeKey, summarize, type Mat3, type Vec,
} from './logic';

const round = (m: Mat3) => m.map((x) => Math.round(x));

/** Unabhängig erzeugte Drehgruppe: Abschluss unter 90°-Drehungen um x und y. */
function rotationGroup(): Mat3[] {
  const gens = [round(axisAngle([1, 0, 0], 90)), round(axisAngle([0, 1, 0], 90))];
  const seen = new Map<string, Mat3>([['1,0,0,0,1,0,0,0,1', [1, 0, 0, 0, 1, 0, 0, 0, 1]]]);
  const queue = [...seen.values()];
  for (let m = queue.shift(); m; m = queue.shift())
    for (const g of gens) {
      const n = round(mul(g, m));
      if (!seen.has(n.join())) (seen.set(n.join(), n), queue.push(n));
    }
  return [...seen.values()];
}

describe('Drehungen', () => {
  it('ROTATIONS_24 sind genau die 24 Würfeldrehungen', () => {
    const group = new Set(rotationGroup().map((m) => m.join()));
    expect(group.size).toBe(24);
    expect(new Set(ROTATIONS_24.map((m) => m.map((x) => x + 0).join()))).toEqual(group);
    for (const m of ROTATIONS_24) expect(det(m)).toBe(1);
  });
});

describe('Figuren', () => {
  it('Spiegelbilder sind durch keine Drehung deckungsgleich (3000 Figuren, unabhängig geprüft)', () => {
    const rng = seededRng(7);
    const group = rotationGroup();
    for (let i = 0; i < 3000; i++) {
      const cells = generateFigure(rng, 3 + (i % 3));
      const key = shapeKey(cells);
      const mirrored = cells.map(([x, y, z]): Vec => [x, y, -z]); // andere Spiegelebene als im Code
      for (const r of group) expect(shapeKey(mirrored.map((c) => apply(r, c)))).not.toBe(key);
    }
  });

  it('der Chiralitätstest erkennt achirale Figuren', () => {
    const flatL: Vec[] = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0]];
    const twoArms: Vec[] = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 2, 0]];
    expect(isChiral(flatL)).toBe(false);
    expect(isChiral(twoArms)).toBe(false);
    // Klassische chirale Figur: drei Arme entlang x, y, z.
    expect(isChiral([[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 2, 0], [2, 2, 1]])).toBe(true);
  });

  it('sind zusammenhängende Ketten ohne Selbstberührung in der erwarteten Größe', () => {
    const rng = seededRng(3);
    for (const arms of [3, 4, 5])
      for (let i = 0; i < 200; i++) {
        const cells = generateFigure(rng, arms);
        expect(cells.length).toBeGreaterThanOrEqual(1 + 2 * arms);
        expect(cells.length).toBeLessThanOrEqual(1 + 3 * arms);
        expect(new Set(cells.map((c) => c.join())).size).toBe(cells.length);
        const touching = (a: Vec, b: Vec) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) === 1;
        cells.forEach((a, i) => cells.forEach((b, j) => expect(touching(a, b)).toBe(Math.abs(i - j) === 1)));
      }
  });
});

describe('Durchgänge', () => {
  it('Ansichten sind echte Drehungen im Winkelbereich des Levels; keine Achse zeigt zum Betrachter', () => {
    const rng = seededRng(11);
    for (let i = 0; i < 600; i++) {
      const level = 1 + (i % MAX_LEVEL);
      const t = makeTrial(rng, level);
      const p = paramsFor(level);
      expect(t.level).toBe(level);
      expect([0, 1]).toContain(t.correct);
      for (const [k, view] of t.options.entries()) {
        expect(det(view)).toBeCloseTo(1, 9);
        expect(t.angles[k]!).toBeGreaterThanOrEqual(p.minAngle);
        expect(t.angles[k]!).toBeLessThanOrEqual(p.maxAngle);
        expect(Math.max(...view.slice(6).map(Math.abs))).toBeLessThan(MAX_TILT);
        // Der tatsächliche Drehwinkel zwischen Vorbild und Antwort (aus der Spur) stimmt.
        const delta = mul(view, [t.ref[0]!, t.ref[3]!, t.ref[6]!, t.ref[1]!, t.ref[4]!, t.ref[7]!, t.ref[2]!, t.ref[5]!, t.ref[8]!]);
        const angle = (Math.acos(Math.min(1, Math.max(-1, (delta[0]! + delta[4]! + delta[8]! - 1) / 2))) * 180) / Math.PI;
        expect(angle).toBeCloseTo(t.angles[k]!, 6);
      }
    }
  });

  it('die richtige Seite ist ausgeglichen verteilt', () => {
    const rng = seededRng(5);
    let left = 0;
    for (let i = 0; i < 1000; i++) left += makeTrial(rng, 4).correct === 0 ? 1 : 0;
    expect(left).toBeGreaterThan(440);
    expect(left).toBeLessThan(560);
  });

  it('Level werden schwerer: mehr Arme, größere Winkel', () => {
    expect(paramsFor(1)).toMatchObject({ arms: 3, axes: 'picture', minAngle: 30, maxAngle: 60 });
    expect(paramsFor(12)).toMatchObject({ arms: 5, axes: 'free', maxAngle: 180 });
    expect(paramsFor(99).level).toBe(MAX_LEVEL);
  });
});

describe('Darstellung', () => {
  it('ein einzelner Würfel zeigt in der Grundansicht drei Flächen, hinten zuerst', () => {
    const faces = renderFaces([[0, 0, 0]], BASE_VIEW);
    expect(faces).toHaveLength(3);
    expect(faces.map((f) => f.depth)).toEqual([...faces.map((f) => f.depth)].sort((a, b) => a - b));
    for (const f of faces) {
      expect(f.points).toHaveLength(4);
      expect(f.light).toBeGreaterThan(0);
      expect(f.light).toBeLessThanOrEqual(1);
    }
  });

  it('Innenflächen entfallen; Spiegelbild hat gleich viele Flächen in gespiegelter Ansicht', () => {
    const pair: Vec[] = [[0, 0, 0], [1, 0, 0]];
    expect(renderFaces(pair, BASE_VIEW)).toHaveLength(5);
    const cells = generateFigure(seededRng(1), 4);
    expect(renderFaces(cells, BASE_VIEW).length).toBeGreaterThan(cells.length);
    expect(mirror(mirror(cells))).toEqual(cells);
  });
});

describe('Wertung', () => {
  it('Punkte = 10 × Level je richtiger Antwort', () => {
    const t = (correct: boolean, difficulty: number, rtMs: number): Trial => ({ sessionId: 's', gameId: 'rotation', kind: '', ts: 0, task: null, response: 0, rtMs, correct, difficulty });
    const s = summarize([t(true, 2, 1000), t(false, 3, 500), t(true, 3, 3000)], initialState());
    expect(s).toMatchObject({ score: 50, trials: 3, medianRtMs: 2000, level: 1 });
    expect(s.accuracy).toBeCloseTo(2 / 3);
    expect(s.extra[0]!.value).toBe('2 von 3');
  });
});
