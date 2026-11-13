import { describe, expect, it } from 'vitest';
import { pick, seededRng } from '../../core/rng';
import type { Trial } from '../../data/types';
import {
  apply, axisAngle, BASE_VIEW, det, frameOf, generateFigure, initialState, isChiral, isLegible, makeTrial, MAX_LEVEL, MAX_TILT,
  MIN_VISIBLE, mirror, mul, paramsFor, renderFaces, ROTATIONS_24, shapeKey, summarize, visibility, type Mat3, type Vec,
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
        // Lesbar: kein Würfel der gezeigten Figur (richtig = Figur, falsch = Spiegelbild) ist ganz verdeckt.
        const shown = k === t.correct ? t.cells : mirror(t.cells);
        expect(visibility(shown, view).hiddenCubes).toBe(0);
        expect(visibility(shown, view).fraction).toBeGreaterThanOrEqual(MIN_VISIBLE);
        // Der tatsächliche Drehwinkel zwischen Vorbild und Antwort (aus der Spur) stimmt.
        const delta = mul(view, [t.ref[0]!, t.ref[3]!, t.ref[6]!, t.ref[1]!, t.ref[4]!, t.ref[7]!, t.ref[2]!, t.ref[5]!, t.ref[8]!]);
        const angle = (Math.acos(Math.min(1, Math.max(-1, (delta[0]! + delta[4]! + delta[8]! - 1) / 2))) * 180) / Math.PI;
        expect(angle).toBeCloseTo(t.angles[k]!, 6);
      }
    }
  });

  it('Sichtbarkeit: frei stehende Figur ganz sichtbar, verdeckter Würfel wird erkannt', () => {
    const row: Vec[] = [[0, 0, 0], [1, 0, 0], [2, 0, 0]];
    expect(visibility(row, BASE_VIEW)).toEqual({ fraction: 1, hiddenCubes: 0 });
    // Blick genau entlang der x-Achse auf zwei Würfel hintereinander: der hintere ist ganz verdeckt.
    const along = axisAngle([0, 1, 0], 90);
    const gap: Vec[] = [[0, 0, 0], [2, 0, 0]];
    expect(visibility(gap, along)).toEqual({ fraction: 0.5, hiddenCubes: 1 });
    expect(isLegible(gap, along)).toBe(false);
    expect(isLegible(row, BASE_VIEW)).toBe(true);
  });

  it('Bildausschnitt umschließt alle Eckpunkte und ist so klein wie möglich', () => {
    const rng = seededRng(3);
    for (let i = 0; i < 50; i++) {
      const t = makeTrial(rng, 1 + (i % MAX_LEVEL));
      const f = frameOf(t.cells, t.ref);
      const points = renderFaces(t.cells, t.ref).flatMap((face) => face.points);
      for (const [x, y] of points) {
        expect(Math.abs(x - f.cx)).toBeLessThanOrEqual(f.half + 1e-9);
        expect(Math.abs(y - f.cy)).toBeLessThanOrEqual(f.half + 1e-9);
      }
      const reach = Math.max(...points.map(([x, y]) => Math.max(Math.abs(x - f.cx), Math.abs(y - f.cy))));
      expect(reach).toBeCloseTo(f.half, 9);
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

  it('Maleralgorithmus: oberste Fläche stimmt an jedem Bildpunkt mit Raycasting überein – auch in ungünstigen Ansichten', () => {
    const rng = seededRng(11);
    const views: { cells: Vec[]; view: Mat3 }[] = [];
    // (a) Ansichten, wie sie im Spiel vorkommen – Vorbild, beide Antworten, Figur und Spiegelbild.
    for (let level = 1; level <= MAX_LEVEL; level++)
      for (let n = 0; n < 15; n++) {
        const t = makeTrial(rng, level);
        views.push({ cells: t.cells, view: t.ref }, { cells: t.cells, view: t.options[0] }, { cells: mirror(t.cells), view: t.options[1] });
      }
    // (b) Ungünstig: Flächen fast genau von der Kante gesehen (Würfeldrehung plus winzige Verkippung)
    //     und beliebige Drehungen ohne die Kipp-Grenze des Spiels.
    for (let n = 0; n < 400; n++) {
      const cells = generateFigure(rng, 3 + (n % 3));
      const axis: Vec = [rng() - 0.5, rng() - 0.5, rng() - 0.5];
      const tilt = [0.01, 0.3, 2, 8, 360 * rng()][n % 5]!;
      views.push({ cells, view: mul(axisAngle(axis, tilt), pick(rng, ROTATIONS_24)) });
    }

    let checked = 0;
    for (const { cells, view } of views) {
      const faces = renderFaces(cells, view);
      const r = Math.max(...faces.flatMap((f) => f.points.flat().map(Math.abs)));
      for (let s = 0; s < 120; s++) {
        const p: [number, number] = [(2 * rng() - 1) * r, (2 * rng() - 1) * r];
        // Punkte direkt auf einer Kante sind nicht eindeutig – überspringen.
        if (faces.some((f) => edgeDistance(f.points, p) < 1e-6)) continue;
        const painted = faces.filter((f) => inside(f.points, p)).at(-1);
        const expected = castRay(cells, view, p);
        if (!expected) expect(painted).toBeUndefined();
        else {
          expect(painted).toBeDefined();
          const cx = painted!.points.reduce((sum, q) => sum + q[0], 0) / 4;
          const cy = painted!.points.reduce((sum, q) => sum + q[1], 0) / 4;
          expect(cx).toBeCloseTo(expected[0], 9);
          expect(cy).toBeCloseTo(-expected[1], 9);
          expect(painted!.depth).toBeCloseTo(expected[2], 9);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(90_000);
  });
});

// ---------- Unabhängige Referenz für die Darstellung: Strahl-Würfel-Schnitt statt Tiefensortierung ----------

const transpose = (m: Mat3): Mat3 => [m[0]!, m[3]!, m[6]!, m[1]!, m[4]!, m[7]!, m[2]!, m[5]!, m[8]!];

/**
 * Schickt einen Sehstrahl durch den Bildpunkt und liefert den Mittelpunkt (Betrachterkoordinaten)
 * der Würfelfläche, die dem Betrachter am nächsten liegt – oder null, wenn der Strahl nichts trifft.
 */
function castRay(cells: readonly Vec[], view: Mat3, p: [number, number]): Vec | null {
  const mid = [0, 1, 2].map((i) => cells.reduce((sum, c) => sum + c[i]!, 0) / cells.length);
  const back = transpose(view);
  const origin = apply(back, [p[0], -p[1], 0]);
  const dir = apply(back, [0, 0, 1]);
  let best: { z: number; centre: Vec } | null = null;
  for (const c of cells) {
    let enter = -Infinity;
    let exit = Infinity;
    let exitAxis = 0;
    for (let i = 0; i < 3; i++) {
      const lo = c[i]! - mid[i]! - 0.5 - origin[i]!;
      if (Math.abs(dir[i]!) < 1e-12) {
        if (lo > 0 || lo + 1 < 0) enter = Infinity;
        continue;
      }
      const z1 = lo / dir[i]!;
      const z2 = (lo + 1) / dir[i]!;
      enter = Math.max(enter, Math.min(z1, z2));
      if (Math.max(z1, z2) < exit) (exit = Math.max(z1, z2)), (exitAxis = i);
    }
    if (enter >= exit || (best && best.z >= exit)) continue;
    const centre = [0, 1, 2].map((i) => c[i]! - mid[i]! + (i === exitAxis ? Math.sign(dir[i]!) / 2 : 0)) as unknown as Vec;
    best = { z: exit, centre };
  }
  return best && apply(view, best.centre);
}

/** Liegt p im konvexen Viereck? (Vorzeichen aller Kantenkreuzprodukte gleich) */
function inside(quad: [number, number][], p: [number, number]): boolean {
  const signs = quad.map((a, i) => {
    const b = quad[(i + 1) % 4]!;
    return Math.sign((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
  });
  return signs.every((s) => s === signs[0]);
}

function edgeDistance(quad: [number, number][], p: [number, number]): number {
  return Math.min(
    ...quad.map((a, i) => {
      const b = quad[(i + 1) % 4]!;
      const [ex, ey] = [b[0] - a[0], b[1] - a[1]];
      const len2 = ex * ex + ey * ey;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / len2));
      return Math.hypot(p[0] - a[0] - t * ex, p[1] - a[1] - t * ey);
    }),
  );
}

describe('Wertung', () => {
  it('Punkte = 10 × Level je richtiger Antwort', () => {
    const t = (correct: boolean, difficulty: number, rtMs: number): Trial => ({ sessionId: 's', gameId: 'rotation', kind: '', ts: 0, task: null, response: 0, rtMs, correct, difficulty });
    const s = summarize([t(true, 2, 1000), t(false, 3, 500), t(true, 3, 3000)], initialState());
    expect(s).toMatchObject({ score: 50, trials: 3, medianRtMs: 2000, level: 1 });
    expect(s.accuracy).toBeCloseTo(2 / 3);
    expect(s.extra[0]!.value).toBe('2 von 3');
  });
});
