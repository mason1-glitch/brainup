import { describe, expect, it } from 'vitest';
import { seededRng } from '../../core/rng';
import type { Trial } from '../../data/types';
import {
  dissimilarity, edgesOf, facing, findSolid, initialState, isClearShape, levelOf, makeTrial, MAX_LEVEL, MIN_DIFFERENCE, MIN_SPAN, paramsFor,
  picture, planesOf, section, shapeOf, SOLIDS, summarize, type P2, type Plane, type Solid, type Vec,
} from './logic';

// ---------- Unabhängige Referenz: Halbraum-Beschneidung statt Kanten-Schnitt ----------
// Der Generator schneidet die Kanten des Körpers mit der Ebene. Hier der andere Weg: ein großes
// Quadrat in der Ebene wird nacheinander mit dem Halbraum jeder Körperfläche beschnitten.

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const minus = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const plus = (a: Vec, b: Vec, k = 1): Vec => [a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2]];
const crossed = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = (a: Vec) => Math.sqrt(dot(a, a));
const scaled = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k];

/** Außennormale und ein Punkt jeder Fläche – eigene Orientierung über einen inneren Punkt. */
function halfSpaces(s: Solid): { normal: Vec; point: Vec }[] {
  const inner = scaled(s.vertices.reduce((sum, v) => plus(sum, v), [0, 0, 0] as Vec), 1 / s.vertices.length);
  return s.faces.map((f) => {
    const [a, b, c] = [s.vertices[f[0]!]!, s.vertices[f[1]!]!, s.vertices[f[2]!]!];
    const n = crossed(minus(b, a), minus(c, a));
    return { normal: dot(n, minus(inner, a)) > 0 ? scaled(n, -1) : n, point: a };
  });
}

function clipSection(s: Solid, plane: Plane): Vec[] | null {
  const n = plane.n;
  const origin = scaled(n, plane.d2 / 2 / dot(n, n));
  const helper: Vec = Math.abs(n[0]) < 0.5 ? [1, 0, 0] : [0, 1, 0];
  const u = scaled(crossed(n, helper), 1 / length(crossed(n, helper)));
  const w = scaled(crossed(n, u), 1 / length(crossed(n, u)));
  let poly: Vec[] = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([a, b]) => plus(plus(origin, u, 100 * a!), w, 100 * b!));
  for (const { normal, point } of halfSpaces(s)) {
    const next: Vec[] = [];
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length]!;
      const vp = dot(normal, minus(p, point));
      const vq = dot(normal, minus(q, point));
      if (vp <= 0) next.push(p);
      if ((vp < 0 && vq > 0) || (vp > 0 && vq < 0)) next.push(plus(p, minus(q, p), vp / (vp - vq)));
    });
    poly = next;
  }
  // Gleitkomma-Rauschen aufräumen: doppelte Punkte und Punkte mitten auf einer geraden Kante.
  const separate = poly.filter((p, i) => length(minus(p, poly[(i + poly.length - 1) % poly.length]!)) > 1e-9);
  const distinct = separate.filter((p, i) => {
    const before = separate[(i + separate.length - 1) % separate.length]!;
    const after = separate[(i + 1) % separate.length]!;
    return length(crossed(minus(p, before), minus(after, p))) > 1e-9;
  });
  if (distinct.length < 3 || area3(distinct) < 1e-9) return null;
  // Ein echter Schnitt geht durchs Innere: Die Mitte der Fläche liegt hinter jeder Körperfläche.
  const centre = scaled(distinct.reduce((sum, p) => plus(sum, p), [0, 0, 0] as Vec), 1 / distinct.length);
  return halfSpaces(s).every(({ normal, point }) => dot(normal, minus(centre, point)) < -1e-9) ? distinct : null;
}

/** Fläche eines ebenen Vielecks im Raum. */
function area3(poly: readonly Vec[]): number {
  let sum: Vec = [0, 0, 0];
  for (let i = 1; i + 1 < poly.length; i++) sum = plus(sum, crossed(minus(poly[i]!, poly[0]!), minus(poly[i + 1]!, poly[0]!)));
  return length(sum) / 2;
}

/** Eigener Formvergleich für den Test: Abstände aller Eckenpaare, beste zyklische Zuordnung. */
function shapeGap(a: readonly P2[], b: readonly P2[], normalize: boolean): number {
  if (a.length !== b.length) return Infinity;
  const table = (shape: readonly P2[]) => {
    const d = shape.map((p) => shape.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])));
    const unit = normalize ? Math.max(...d.flat()) : 1;
    return d.map((row) => row.map((x) => x / unit));
  };
  const [da, db] = [table(a), table(b)];
  const n = a.length;
  let best = Infinity;
  for (let shift = 0; shift < n; shift++)
    for (const dir of [1, -1]) {
      let worst = 0;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const gap = Math.abs(da[i]![j]! - db[(((shift + dir * i) % n) + n) % n]![(((shift + dir * j) % n) + n) % n]!);
          if (gap > worst) worst = gap;
        }
      if (worst < best) best = worst;
    }
  return best;
}

const sides = (shape: readonly (P2 | Vec)[]) =>
  shape.map((p, i) => Math.hypot(...(p.map((x, k) => x - shape[(i + 1) % shape.length]![k]!) as number[]))).sort((x, y) => x - y);

const NORMALS: Vec[] = [];
for (let x = -2; x <= 2; x++) for (let y = -2; y <= 2; y++) for (let z = -2; z <= 2; z++) if (x || y || z) NORMALS.push([x, y, z]);

describe('Körper', () => {
  it('sind geschlossen und konvex, Flächen eben und nach außen orientiert', () => {
    expect(SOLIDS.map((s) => s.id)).toEqual(['cube', 'box', 'bar', 'prism', 'house', 'pyramid', 'frustum', 'tetra', 'octa']);
    for (const s of SOLIDS) {
      const edges = edgesOf(s);
      expect(s.vertices.length - edges.length + s.faces.length).toBe(2); // Euler
      for (const [i, j] of edges) expect(s.faces.filter((f) => f.includes(i) && f.includes(j))).toHaveLength(2);
      for (const f of s.faces) {
        const [a, b, c] = [s.vertices[f[0]!]!, s.vertices[f[1]!]!, s.vertices[f[2]!]!];
        const n = crossed(minus(b, a), minus(c, a));
        // Alle Ecken liegen in der Flächenebene oder dahinter: eben, konvex, Normale zeigt nach außen.
        for (const [k, v] of s.vertices.entries()) {
          const height = dot(n, minus(v, a));
          if (f.includes(k)) expect(Math.abs(height)).toBe(0);
          else expect(height).toBeLessThan(0);
        }
      }
    }
  });
});

describe('Querschnitt', () => {
  const cube = findSolid('cube');

  it('bekannte Schnitte von Hand: Quadrat, Rechteck, Dreieck, regelmäßiges Sechseck', () => {
    expect(sides(section(cube, { n: [0, 0, 1], d2: 4 })!)).toEqual([4, 4, 4, 4]);
    const diagonal = sides(section(cube, { n: [1, 1, 0], d2: 8 })!);
    expect(diagonal).toHaveLength(4);
    expect(diagonal[0]).toBe(4);
    expect(diagonal[3]).toBeCloseTo(4 * Math.SQRT2, 12);
    // x + y + z = 4 geht genau durch drei Ecken des Würfels: gleichseitiges Dreieck.
    const corner = sides(section(cube, { n: [1, 1, 1], d2: 8 })!);
    expect(corner).toHaveLength(3);
    for (const side of corner) expect(side).toBeCloseTo(4 * Math.SQRT2, 12);
    // x + y + z = 6 durch die Würfelmitte: regelmäßiges Sechseck.
    const hexagon = sides(section(cube, { n: [1, 1, 1], d2: 12 })!);
    expect(hexagon).toHaveLength(6);
    for (const side of hexagon) expect(side).toBeCloseTo(2 * Math.SQRT2, 12);
    // Pyramide auf halber Höhe: Quadrat mit halber Kante. Tetraeder in der Mitte: Quadrat.
    expect(sides(section(findSolid('pyramid'), { n: [0, 1, 0], d2: 4 })!)).toEqual([2, 2, 2, 2]);
    const tetra = shapeOf(findSolid('tetra'), { n: [1, 0, 0], d2: 4 })!;
    expect(shapeGap(tetra, [[0, 0], [1, 0], [1, 1], [0, 1]], true)).toBeLessThan(1e-12);
  });

  it('kein Schnitt, wenn die Ebene nur berührt, in einer Fläche liegt oder vorbeigeht', () => {
    expect(section(cube, { n: [1, 0, 0], d2: 0 })).toBeNull(); // Seitenfläche
    expect(section(cube, { n: [1, 1, 0], d2: 0 })).toBeNull(); // nur eine Kante
    expect(section(cube, { n: [1, 1, 1], d2: 0 })).toBeNull(); // nur eine Ecke
    expect(section(cube, { n: [1, 0, 0], d2: 9 })).toBeNull(); // vorbei
    expect(section(cube, { n: [1, 0, 0], d2: 1 })).not.toBeNull();
  });

  it('stimmt für alle Körper und Ebenen mit der Halbraum-Beschneidung überein', () => {
    let cuts = 0;
    for (const s of SOLIDS)
      for (const n of NORMALS) {
        const reach = s.vertices.map((v) => 2 * dot(n, v));
        for (let d2 = Math.min(...reach) - 1; d2 <= Math.max(...reach) + 1; d2++) {
          const actual = section(s, { n, d2 });
          const expected = clipSection(s, { n, d2 });
          if (!expected) {
            expect(actual, `${s.id} ${n} ${d2}`).toBeNull();
            continue;
          }
          expect(actual, `${s.id} ${n} ${d2}`).not.toBeNull();
          expect(actual!).toHaveLength(expected.length);
          for (const p of expected) expect(Math.min(...actual!.map((q) => length(minus(p, q))))).toBeLessThan(1e-9);
          // Richtige Reihenfolge: nur dann ist die Fläche des Vielecks die des Schnitts.
          expect(area3(actual!)).toBeCloseTo(area3(expected), 9);
          cuts++;
        }
      }
    expect(cuts).toBeGreaterThan(5000);
  });
});

describe('Formen', () => {
  const square: P2[] = [[0, 0], [2, 0], [2, 2], [0, 2]];

  it('Formvergleich: Lage, Größe, Drehung und Spiegelung zählen nicht', () => {
    const turned: P2[] = square.map(([x, y]) => [5 + 3 * (0.6 * x - 0.8 * y), -2 + 3 * (0.8 * x + 0.6 * y)]);
    expect(dissimilarity(square, turned)).toBeLessThan(1e-12);
    const scalene: P2[] = [[0, 0], [5, 0], [1, 2]];
    expect(dissimilarity(scalene, scalene.map(([x, y]) => [-x, y]))).toBeLessThan(1e-12);
    expect(dissimilarity(scalene, [scalene[1]!, scalene[2]!, scalene[0]!])).toBeLessThan(1e-12);
    expect(dissimilarity(square, [[0, 0], [4, 0], [4, 2], [0, 2]])).toBeGreaterThan(MIN_DIFFERENCE);
    expect(dissimilarity(square, scalene)).toBe(Infinity);
    // Stimmt mit dem eigenen Vergleich des Tests überein.
    const rect: P2[] = [[0, 0], [3, 0], [3, 2], [0, 2]];
    expect(dissimilarity(square, rect)).toBeCloseTo(shapeGap(square, rect, true), 12);
  });

  it('gut lesbar heißt: konvex, keine Mini-Kante, keine fast gestreckte Ecke', () => {
    expect(isClearShape(square)).toBe(true);
    expect(isClearShape([[0, 0], [4, 0], [4, 0.3], [0, 4]])).toBe(false); // Mini-Kante
    expect(isClearShape([[0, 0], [2, 0.1], [4, 0], [2, 3]])).toBe(false); // fast gestreckt
    expect(isClearShape([[0, 0], [4, 0], [1, 1], [0, 4]])).toBe(false); // nicht konvex
    expect(isClearShape([[0, 0], [1, 0]])).toBe(false);
  });
});

describe('Durchgänge', () => {
  it('die richtige Form ist der unabhängig berechnete Schnitt; Distraktoren sind klar anders und untereinander verschieden (2400 Aufgaben)', () => {
    const rng = seededRng(17);
    for (let i = 0; i < 2400; i++) {
      const level = 1 + (i % MAX_LEVEL);
      const t = makeTrial(rng, level);
      const s = findSolid(t.solid);
      const expected = clipSection(s, t.plane)!;
      expect(expected).not.toBeNull();
      // Referenz in die Ebene legen: zwei senkrechte Achsen aus dem Vieleck selbst.
      const u = scaled(minus(expected[1]!, expected[0]!), 1 / length(minus(expected[1]!, expected[0]!)));
      const normal = scaled(t.plane.n, 1 / length(t.plane.n));
      const w = crossed(normal, u);
      const flat: P2[] = expected.map((p) => [dot(minus(p, expected[0]!), u), dot(minus(p, expected[0]!), w)]);

      expect(t.options).toHaveLength(4);
      // Deckungsgleich mit der Referenz (auch in der Größe); Toleranz wegen Rundung auf 3 Stellen.
      expect(shapeGap(t.options[t.correct]!, flat, false)).toBeLessThan(0.01);
      for (const [k, option] of t.options.entries()) {
        expect(option.length).toBeGreaterThanOrEqual(3);
        expect(isClearShape(option)).toBe(true);
        for (const [l, other] of t.options.entries())
          if (l > k) expect(shapeGap(option, other, true), `Level ${level}: ${k} gegen ${l}`).toBeGreaterThan(MIN_DIFFERENCE - 0.01);
        if (k !== t.correct) expect(shapeGap(option, flat, true)).toBeGreaterThan(MIN_DIFFERENCE - 0.01);
      }
    }
  });

  it('Level bestimmen Körper und Lage der Ebene; die Schnittfläche ist im Bild gut zu sehen', () => {
    expect(paramsFor(1)).toMatchObject({ kinds: ['axis'], subtle: false });
    expect(paramsFor(1).solids).toEqual(['cube', 'box', 'bar']);
    expect(paramsFor(MAX_LEVEL).kinds).toEqual(['tilted', 'oblique']);
    expect(paramsFor(99).level).toBe(MAX_LEVEL);
    expect(paramsFor(0).level).toBe(1);
    const rng = seededRng(3);
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const p = paramsFor(level);
      for (const id of p.solids) for (const kind of p.kinds) expect(planesOf(findSolid(id), kind).length, `${id}/${kind}`).toBeGreaterThan(0);
      for (let i = 0; i < 80; i++) {
        const t = makeTrial(rng, level);
        expect(t.level).toBe(level);
        expect(p.solids).toContain(t.solid);
        const zeros = t.plane.n.filter((c) => c === 0).length;
        expect(p.kinds).toContain(zeros === 2 ? 'axis' : zeros === 1 ? 'tilted' : 'oblique');
        expect(facing(t.plane, t.yaw)).toBeGreaterThanOrEqual(0.3);
        // Kein Mini-Schnitt: Ausdehnung der Fläche gegen die des Körpers (über die sortierten Seiten/Diagonalen).
        const s = findSolid(t.solid);
        const widest = (points: readonly (P2 | Vec)[]) =>
          Math.max(...points.flatMap((a) => points.map((b) => Math.hypot(...(a.map((x, k) => x - b[k]!) as number[])))));
        expect(widest(t.options[t.correct]!)).toBeGreaterThanOrEqual(MIN_SPAN * widest(s.vertices) - 0.01);
        const pic = picture(findSolid(t.solid), t.plane, t.yaw);
        expect(pic.cut.edges.filter((e) => !e.hidden).length * 2).toBeGreaterThanOrEqual(pic.cut.edges.length);
        if (p.subtle) expect(t.options.filter((o) => o.length === t.options[t.correct]!.length).length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('die richtige Antwort liegt an allen vier Stellen etwa gleich oft; Aufgaben wechseln', () => {
    const rng = seededRng(5);
    const counts = [0, 0, 0, 0];
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const t = makeTrial(rng, 1 + (i % MAX_LEVEL));
      counts[t.correct]!++;
      seen.add(`${t.solid}/${t.plane.n}/${t.plane.d2}`);
    }
    for (const c of counts) {
      expect(c).toBeGreaterThan(430);
      expect(c).toBeLessThan(570);
    }
    expect(seen.size).toBeGreaterThan(300);
  });
});

describe('Bild', () => {
  it('zeigt die zugewandten Flächen, alle Kanten und den Schnitt im Bildausschnitt', () => {
    const cube = findSolid('cube');
    const plane: Plane = { n: [0, 1, 0], d2: 4 };
    const pic = picture(cube, plane, -34);
    expect(pic.faces).toHaveLength(3); // Würfel von schräg oben: drei Flächen
    expect(pic.edges).toHaveLength(12);
    expect(pic.edges.filter((e) => e.hidden)).toHaveLength(3); // die drei Kanten an der hinteren Ecke
    expect(pic.cut.points).toHaveLength(4);
    expect(pic.cut.edges.filter((e) => e.hidden)).toHaveLength(2); // waagerechter Schnitt: zwei Seiten vorn, zwei hinten
    for (const f of pic.faces) {
      expect(f.light).toBeGreaterThan(0);
      expect(f.light).toBeLessThanOrEqual(1);
    }
    for (const [x, y] of [...pic.cut.points, ...pic.edges.flatMap((e) => [e.a, e.b])]) {
      expect(Math.abs(x - pic.frame.cx)).toBeLessThanOrEqual(pic.frame.half + 1e-9);
      expect(Math.abs(y - pic.frame.cy)).toBeLessThanOrEqual(pic.frame.half + 1e-9);
    }
    // Oben im Bild ist oben am Körper: die Deckfläche liegt höher (kleineres y) als die Schnittfläche.
    const top = picture(cube, { n: [0, 1, 0], d2: 7 }, -34).cut.points;
    const low = picture(cube, { n: [0, 1, 0], d2: 1 }, -34).cut.points;
    expect(Math.max(...top.map((p) => p[1]))).toBeLessThan(Math.max(...low.map((p) => p[1])));
  });
});

describe('Wertung', () => {
  it('Punkte = 10 × Level je richtiger Antwort', () => {
    const trial = (correct: boolean, difficulty: number): Trial => ({
      sessionId: 's', gameId: 'sections', kind: '', ts: 0, task: null, response: 0, rtMs: 4000, correct, difficulty,
    });
    const state = initialState();
    expect(levelOf(state)).toBe(1);
    const s = summarize([trial(true, 2), trial(true, 5), trial(false, 6)], state);
    expect(s.score).toBe(70);
    expect(s.headline).toEqual({ label: 'Punkte', value: '70' });
    expect(s.extra).toEqual([{ label: 'Richtig', value: '2 von 3' }]);
  });
});
