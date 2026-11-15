// Schnittansichten – reine Logik: Körper, Schnittebenen, Querschnitt, Antwortmöglichkeiten, Bild.
//
// Exaktheit: Alle Körper haben ganzzahlige Ecken, Ebenen ganzzahlige Normalen und Abstände in
// halben Schritten. Welche Kanten die Ebene schneidet und welche Ecken genau auf ihr liegen,
// wird deshalb mit ganzen Zahlen entschieden – ohne Toleranzen. Gleitkomma kommt erst bei den
// Koordinaten der Schnittpunkte (eine Division) und bei der Darstellung ins Spiel.
import { pick, randInt, shuffle, type Rng } from '../../core/rng';
import { initStaircase, type StaircaseConfig, type StaircaseState } from '../../core/staircase';
import type { Summary, Trial } from '../../data/types';
import { baseMetrics } from '../metrics';

export type Vec = readonly [number, number, number];
export type P2 = readonly [number, number];

const dot = (a: Vec, b: Vec): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec): Vec => {
  const len = Math.hypot(...a);
  return [a[0] / len, a[1] / len, a[2] / len];
};

// ---------- Körper ----------

/** Konvexer Körper. Flächen als Eckenindizes, von außen gesehen gegen den Uhrzeigersinn. */
export interface Solid {
  id: string;
  vertices: Vec[];
  faces: number[][];
}

const faceNormal = (vertices: readonly Vec[], face: readonly number[]): Vec =>
  cross(sub(vertices[face[1]!]!, vertices[face[0]!]!), sub(vertices[face[2]!]!, vertices[face[0]!]!));

/** Dreht jede Fläche so, dass ihre Normale nach außen zeigt (weg vom Schwerpunkt). */
function solid(id: string, vertices: Vec[], faces: number[][]): Solid {
  const mid = [0, 1, 2].map((i) => vertices.reduce((sum, v) => sum + v[i]!, 0) / vertices.length) as unknown as Vec;
  const oriented = faces.map((f) => (dot(faceNormal(vertices, f), sub(vertices[f[0]!]!, mid)) < 0 ? [...f].reverse() : f));
  return { id, vertices, faces: oriented };
}

/** Prisma: Profil in der x-y-Ebene (y nach oben), entlang z ausgezogen. */
function prism(id: string, profile: P2[], depth: number): Solid {
  const n = profile.length;
  const vertices: Vec[] = [...profile.map(([x, y]): Vec => [x, y, 0]), ...profile.map(([x, y]): Vec => [x, y, depth])];
  const ring = profile.map((_, i) => i);
  const sides = ring.map((i) => [i, (i + 1) % n, ((i + 1) % n) + n, i + n]);
  return solid(id, vertices, [ring, ring.map((i) => i + n), ...sides]);
}

export const SOLIDS: Solid[] = [
  prism('cube', [[0, 0], [4, 0], [4, 4], [0, 4]], 4),
  prism('box', [[0, 0], [6, 0], [6, 3], [0, 3]], 4),
  prism('bar', [[0, 0], [2, 0], [2, 2], [0, 2]], 6),
  prism('prism', [[0, 0], [4, 0], [2, 4]], 6),
  prism('house', [[0, 0], [4, 0], [4, 3], [2, 5], [0, 3]], 5),
  solid('pyramid', [[0, 0, 0], [4, 0, 0], [4, 0, 4], [0, 0, 4], [2, 4, 2]], [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]]),
  solid(
    'frustum',
    [[0, 0, 0], [6, 0, 0], [6, 0, 6], [0, 0, 6], [2, 4, 2], [4, 4, 2], [4, 4, 4], [2, 4, 4]],
    [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]],
  ),
  solid('tetra', [[0, 0, 0], [4, 4, 0], [4, 0, 4], [0, 4, 4]], [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]]),
  solid(
    'octa',
    [[2, 0, 0], [-2, 0, 0], [0, 2, 0], [0, -2, 0], [0, 0, 2], [0, 0, -2]],
    [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]],
  ),
];

export const findSolid = (id: string): Solid => SOLIDS.find((s) => s.id === id)!;

/** Kanten als Indexpaare (jede einmal). */
export function edgesOf(s: Solid): [number, number][] {
  const seen = new Set<string>();
  const out: [number, number][] = [];
  for (const f of s.faces)
    f.forEach((a, i) => {
      const b = f[(i + 1) % f.length]!;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!seen.has(key)) (seen.add(key), out.push([Math.min(a, b), Math.max(a, b)]));
    });
  return out;
}

// ---------- Ebene und Querschnitt ----------

/** Ebene n·x = d2 / 2 mit ganzzahliger Normale n und ganzzahligem d2 (Abstände in halben Schritten). */
export interface Plane {
  n: Vec;
  d2: number;
}

/** Zwei senkrechte Einheitsvektoren in der Ebene. */
function planeBasis(n: Vec): [Vec, Vec] {
  const helper: Vec = Math.abs(n[1]) <= Math.abs(n[0]) && Math.abs(n[1]) <= Math.abs(n[2]) ? [0, 1, 0] : Math.abs(n[0]) <= Math.abs(n[2]) ? [1, 0, 0] : [0, 0, 1];
  const u = unit(cross(n, helper));
  return [u, unit(cross(n, u))];
}

/**
 * Querschnitt als Eckpunkte in 3D, reihum geordnet – oder null, wenn die Ebene den Körper nicht
 * durchschneidet (verfehlt, berührt nur, oder liegt in einer Fläche).
 */
export function section(s: Solid, plane: Plane): Vec[] | null {
  // Ganzzahlig: Vorzeichen sagt, auf welcher Seite die Ecke liegt; 0 = genau auf der Ebene.
  const side = s.vertices.map((v) => 2 * dot(plane.n, v) - plane.d2);
  if (s.faces.some((f) => f.every((i) => side[i] === 0))) return null;
  const points: Vec[] = s.vertices.filter((_, i) => side[i] === 0);
  for (const [i, j] of edgesOf(s)) {
    if (side[i]! * side[j]! >= 0) continue;
    const t = side[i]! / (side[i]! - side[j]!);
    const a = s.vertices[i]!;
    const b = s.vertices[j]!;
    points.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])]);
  }
  if (points.length < 3) return null;
  // Die Punkte liegen konvex in der Ebene: nach Winkel um ihren Schwerpunkt ordnen.
  const mid = [0, 1, 2].map((k) => points.reduce((sum, p) => sum + p[k]!, 0) / points.length) as unknown as Vec;
  const [u, w] = planeBasis(plane.n);
  const angle = (p: Vec) => Math.atan2(dot(sub(p, mid), w), dot(sub(p, mid), u));
  return points.sort((p, q) => angle(p) - angle(q));
}

/** Der Querschnitt in wahrer Form: 2D-Koordinaten in der Ebene, Schwerpunkt im Ursprung. */
export function shapeOf(s: Solid, plane: Plane): P2[] | null {
  const points = section(s, plane);
  if (!points) return null;
  const mid = [0, 1, 2].map((k) => points.reduce((sum, p) => sum + p[k]!, 0) / points.length) as unknown as Vec;
  const [u, w] = planeBasis(plane.n);
  return points.map((p) => [dot(sub(p, mid), u), dot(sub(p, mid), w)]);
}

// ---------- Formen vergleichen ----------

const dist = (p: P2, q: P2): number => Math.hypot(p[0] - q[0], p[1] - q[1]);

/** Alle Abstände zwischen den Ecken, geteilt durch den größten (Größe spielt keine Rolle). */
function profile(shape: readonly P2[]): number[][] {
  const d = shape.map((p) => shape.map((q) => dist(p, q)));
  const max = Math.max(...d.flat());
  return d.map((row) => row.map((x) => x / max));
}

/**
 * Wie verschieden sehen zwei Vielecke aus? 0 = gleiche Form (Lage, Größe, Drehung und
 * Spiegelung egal); verschiedene Eckenzahl = unendlich. Maß: größte Abweichung zwischen den
 * Eckabständen bei bester Zuordnung der Ecken.
 */
export function dissimilarity(a: readonly P2[], b: readonly P2[]): number {
  if (a.length !== b.length) return Infinity;
  const n = a.length;
  const da = profile(a);
  const db = profile(b);
  let best = Infinity;
  for (let shift = 0; shift < n; shift++)
    for (const dir of [1, -1]) {
      let worst = 0;
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const k = (shift + dir * i + 2 * n) % n;
          const l = (shift + dir * j + 2 * n) % n;
          worst = Math.max(worst, Math.abs(da[i]![j]! - db[k]![l]!));
        }
      best = Math.min(best, worst);
    }
  return best;
}

/** Ab diesem Unterschied gelten zwei Formen als auf einen Blick unterscheidbar. */
export const MIN_DIFFERENCE = 0.12;

/**
 * Gut lesbar: konvex, keine sehr kurze Kante und keine fast gestreckte Ecke – sonst sähe ein
 * Fünfeck wie ein Viereck aus und die Eckenzahl wäre Ratesache.
 */
export function isClearShape(shape: readonly P2[]): boolean {
  const n = shape.length;
  if (n < 3) return false;
  const size = Math.max(...shape.flatMap((p) => shape.map((q) => dist(p, q))));
  let turnSign = 0;
  for (let i = 0; i < n; i++) {
    const p = shape[i]!;
    const q = shape[(i + 1) % n]!;
    const r = shape[(i + 2) % n]!;
    const e1: P2 = [q[0] - p[0], q[1] - p[1]];
    const e2: P2 = [r[0] - q[0], r[1] - q[1]];
    if (Math.hypot(...e1) < 0.18 * size) return false;
    const turn = (e1[0] * e2[1] - e1[1] * e2[0]) / (Math.hypot(...e1) * Math.hypot(...e2));
    if (Math.abs(turn) < 0.3) return false; // Ecke flacher als etwa 17°
    if (turnSign !== 0 && Math.sign(turn) !== turnSign) return false;
    turnSign = Math.sign(turn);
  }
  return true;
}

// ---------- Schwierigkeit ----------

export const MAX_LEVEL = 8;

/** 2-down-1-up: je Lauf gibt es nur zwölf Durchgänge. */
export const STAIRCASE: StaircaseConfig = {
  start: 1,
  min: 1,
  max: MAX_LEVEL,
  down: 2,
  steps: [2, 1],
  scale: 'add',
  harder: 'up',
};

export interface SectionsState {
  stair: StaircaseState;
}

export const initialState = (): SectionsState => ({ stair: initStaircase(STAIRCASE) });
export const levelOf = (state: SectionsState): number => Math.round(state.stair.value);

/** Lage der Ebene: parallel zu einer Seitenfläche, um eine Achse gekippt, oder ganz schräg. */
export type PlaneKind = 'axis' | 'tilted' | 'oblique';

const LEVELS: { solids: string[]; kinds: PlaneKind[]; subtle: boolean }[] = [
  { solids: ['cube', 'box', 'bar'], kinds: ['axis'], subtle: false },
  { solids: ['prism', 'pyramid', 'house'], kinds: ['axis'], subtle: false },
  { solids: ['frustum', 'tetra', 'octa'], kinds: ['axis'], subtle: false },
  { solids: ['cube', 'box', 'bar', 'prism'], kinds: ['tilted'], subtle: false },
  { solids: ['pyramid', 'house', 'frustum', 'tetra', 'octa'], kinds: ['tilted'], subtle: true },
  { solids: ['cube', 'box', 'prism'], kinds: ['oblique'], subtle: true },
  { solids: ['pyramid', 'house', 'frustum', 'octa'], kinds: ['oblique'], subtle: true },
  { solids: SOLIDS.map((s) => s.id), kinds: ['tilted', 'oblique'], subtle: true },
];

/**
 * Was ein Level bedeutet: erst Quader, dann Prismen und Pyramiden, dann gekippte und ganz schräge
 * Ebenen. `subtle` = falsche Antworten haben dieselbe Eckenzahl und weichen nur in der Form ab.
 */
export function paramsFor(level: number) {
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.round(level)));
  return { level: l, ...LEVELS[l - 1]! };
}

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** Normalen mit Einträgen −2…2, gekürzt, erstes Element ≠ 0 positiv; höchstens ein Eintrag ±2. */
const NORMALS: Record<PlaneKind, Vec[]> = (() => {
  const out: Record<PlaneKind, Vec[]> = { axis: [], tilted: [], oblique: [] };
  for (let x = -2; x <= 2; x++)
    for (let y = -2; y <= 2; y++)
      for (let z = -2; z <= 2; z++) {
        const n: Vec = [x, y, z];
        const first = n.find((c) => c !== 0);
        if (first === undefined || first < 0 || gcd(gcd(x, y), z) !== 1) continue;
        if (n.filter((c) => Math.abs(c) === 2).length > 1) continue;
        const zeros = n.filter((c) => c === 0).length;
        out[zeros === 2 ? 'axis' : zeros === 1 ? 'tilted' : 'oblique'].push(n);
      }
  return out;
})();

/** Kleinste Ausdehnung eines Schnitts im Verhältnis zum Körper, damit er im Bild gut zu sehen ist. */
export const MIN_SPAN = 0.4;

const planeCache = new Map<string, Plane[]>();

/** Alle Ebenen einer Lage, die den Körper in einer gut lesbaren Fläche schneiden. */
export function planesOf(s: Solid, kind: PlaneKind): Plane[] {
  const key = `${s.id}/${kind}`;
  let planes = planeCache.get(key);
  if (!planes) {
    planes = [];
    const span = (points: readonly (readonly number[])[]) =>
      Math.max(...points.flatMap((p) => points.map((q) => Math.hypot(...p.map((x, k) => x - q[k]!)))));
    for (const n of NORMALS[kind]) {
      const reach = s.vertices.map((v) => 2 * dot(n, v));
      for (let d2 = Math.min(...reach) + 1; d2 < Math.max(...reach); d2++) {
        const shape = shapeOf(s, { n, d2 });
        // Kein Mini-Schnitt an einer Ecke: Die Fläche ist mindestens 40 % so breit wie der Körper.
        if (shape && isClearShape(shape) && span(shape) >= MIN_SPAN * span(s.vertices)) planes.push({ n, d2 });
      }
    }
    planeCache.set(key, planes);
  }
  return planes;
}

// ---------- Durchgänge ----------

export interface SectionsTrial {
  level: number;
  /** ID des Körpers (siehe SOLIDS). */
  solid: string;
  plane: Plane;
  /** Blickrichtung des Bildes: Drehung um die Hochachse in Grad. */
  yaw: number;
  /** Vier Formen in wahrer Ansicht (2D, beliebig gedreht). */
  options: P2[][];
  correct: number;
}

/** Streckt die Form entlang ihrer längsten Kante (`along`) bzw. quer dazu und schert sie. */
function distort(shape: readonly P2[], along: number, across: number, shear: number): P2[] {
  let longest = 0;
  let dir: P2 = [1, 0];
  shape.forEach((p, i) => {
    const q = shape[(i + 1) % shape.length]!;
    const len = dist(p, q);
    if (len > longest) (longest = len), (dir = [(q[0] - p[0]) / len, (q[1] - p[1]) / len]);
  });
  return shape.map((p) => {
    const a = p[0] * dir[0] + p[1] * dir[1];
    const b = -p[0] * dir[1] + p[1] * dir[0];
    const a2 = along * a + shear * b;
    const b2 = across * b;
    return [a2 * dir[0] - b2 * dir[1], a2 * dir[1] + b2 * dir[0]];
  });
}

const DISTORTIONS: [number, number, number][] = [
  [1.6, 1, 0], [2.2, 1, 0], [1, 1.6, 0], [1, 2.2, 0], [1, 1, 0.5], [1, 1, -0.5], [1, 1, 0.9], [1.5, 1, 0.5], [1, 1.5, -0.6],
];

/**
 * Drei falsche Formen. Jede ist gut lesbar und unterscheidet sich von der Lösung und von den
 * anderen um mindestens MIN_DIFFERENCE. Quellen: andere Schnitte desselben Körpers, die Lösung
 * gestreckt oder geschert (so sieht sie im schrägen Bild aus).
 */
function distractors(rng: Rng, s: Solid, answer: P2[], subtle: boolean): P2[][] {
  const others = (['axis', 'tilted', 'oblique'] as const).flatMap((kind) => planesOf(s, kind)).map((p) => shapeOf(s, p)!);
  const warped = DISTORTIONS.map(([along, across, shear]) => distort(answer, along, across, shear));
  const sameCount = others.filter((o) => o.length === answer.length);
  const pool = subtle
    ? [...shuffle(rng, [...warped, ...sameCount]), ...shuffle(rng, others)]
    : [...shuffle(rng, others).slice(0, 40), ...shuffle(rng, warped)];
  const out: P2[][] = [];
  for (let i = 0; out.length < 3; i++) {
    // Reicht der Vorrat nicht, hilft eine zufällige Verzerrung – davon gibt es beliebig viele.
    const candidate = pool[i] ?? distort(answer, 1 + 1.5 * rng(), 1, 1.2 * rng() - 0.6);
    if (!isClearShape(candidate)) continue;
    if ([answer, ...out].some((shape) => dissimilarity(shape, candidate) < MIN_DIFFERENCE)) continue;
    out.push(candidate);
  }
  return out;
}

/** Dreht (und spiegelt) eine Form zufällig, damit die Lage nichts verrät. */
function place(rng: Rng, shape: readonly P2[]): P2[] {
  const angle = 2 * Math.PI * rng();
  const flip = rng() < 0.5 ? -1 : 1;
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  return shape.map(([x, y]) => [round(c * flip * x - sn * y), round(sn * flip * x + c * y)]);
}
const round = (x: number): number => Math.round(x * 1000) / 1000;

export function makeTrial(rng: Rng, level: number): SectionsTrial {
  const p = paramsFor(level);
  for (;;) {
    const s = findSolid(pick(rng, p.solids));
    const planes = planesOf(s, pick(rng, p.kinds));
    if (planes.length === 0) continue;
    const plane = pick(rng, planes);
    const yaws = YAWS.filter((yaw) => isWellSeen(s, plane, yaw));
    if (yaws.length === 0) continue;
    const answer = shapeOf(s, plane)!;
    const options = distractors(rng, s, answer, p.subtle);
    const correct = randInt(rng, 0, 3);
    options.splice(correct, 0, answer);
    return { level: p.level, solid: s.id, plane, yaw: pick(rng, yaws), options: options.map((o) => place(rng, o)), correct };
  }
}

// ---------- Bild ----------

/** Mögliche Blickrichtungen (Drehung um die Hochachse); immer leicht von oben. */
export const YAWS = [-34, 34, -56, 56, -146, 146];
const PITCH = 24;
const LIGHT: Vec = [-0.35, 0.75, 0.56];

/** Betrachter-Matrix (zeilenweise): erst um die Hochachse drehen, dann nach vorn kippen. */
function viewMatrix(yaw: number): [Vec, Vec, Vec] {
  const a = (yaw * Math.PI) / 180;
  const b = (PITCH * Math.PI) / 180;
  const [ca, sa, cb, sb] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b)];
  return [
    [ca, 0, sa],
    [sa * sb, cb, -ca * sb],
    [-sa * cb, sb, ca * cb],
  ];
}

/** Wie sehr die Schnittfläche dem Betrachter zugewandt ist (0 = von der Kante gesehen, 1 = frontal). */
export function facing(plane: Plane, yaw: number): number {
  return Math.abs(dot(viewMatrix(yaw)[2], unit(plane.n)));
}

/**
 * Ist der Schnitt aus dieser Richtung gut zu sehen? Die Fläche darf nicht fast von der Kante
 * erscheinen, und mindestens die Hälfte ihres Randes liegt auf der Vorderseite des Körpers.
 */
export function isWellSeen(s: Solid, plane: Plane, yaw: number): boolean {
  if (facing(plane, yaw) < 0.3) return false;
  const edges = picture(s, plane, yaw).cut.edges;
  return edges.filter((e) => !e.hidden).length * 2 >= edges.length;
}

export interface Line {
  a: P2;
  b: P2;
  /** Liegt auf der Rückseite des Körpers – wird gestrichelt gezeichnet. */
  hidden: boolean;
}

export interface Picture {
  /** Dem Betrachter zugewandte Flächen mit Helligkeit 0..1. */
  faces: { points: P2[]; light: number }[];
  edges: Line[];
  /** Schnittfläche und ihre Kanten auf der Oberfläche. */
  cut: { points: P2[]; edges: Line[] };
  /** Bildausschnitt: Mitte und halbe Kantenlänge. */
  frame: { cx: number; cy: number; half: number };
}

/** Schrägbild des Körpers mit eingezeichnetem Schnitt (Parallelprojektion, y im Bild nach unten). */
export function picture(s: Solid, plane: Plane, yaw: number): Picture {
  const view = viewMatrix(yaw);
  const project = (p: Vec): P2 => [dot(view[0], p), -dot(view[1], p)];
  const normals = s.faces.map((f) => unit(faceNormal(s.vertices, f)));
  const front = normals.map((n) => dot(view[2], n) > 1e-9);

  const faces = s.faces.flatMap((f, i) => {
    if (!front[i]) return [];
    const seen: Vec = [dot(view[0], normals[i]!), dot(view[1], normals[i]!), dot(view[2], normals[i]!)];
    return [{ points: f.map((v) => project(s.vertices[v]!)), light: 0.25 + 0.75 * Math.max(0, dot(seen, LIGHT)) }];
  });
  const edges = edgesOf(s).map(([i, j]) => ({
    a: project(s.vertices[i]!),
    b: project(s.vertices[j]!),
    hidden: !s.faces.some((f, k) => front[k] && f.includes(i) && f.includes(j)),
  }));

  const points = section(s, plane) ?? [];
  const onFace = (p: Vec, k: number) => Math.abs(dot(normals[k]!, sub(p, s.vertices[s.faces[k]![0]!]!))) < 1e-9;
  const cutEdges = points.map((p, i) => {
    const q = points[(i + 1) % points.length]!;
    return { a: project(p), b: project(q), hidden: !s.faces.some((_, k) => front[k] && onFace(p, k) && onFace(q, k)) };
  });

  const all = s.vertices.map(project);
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return {
    faces,
    edges,
    cut: { points: points.map(project), edges: cutEdges },
    frame: { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, half: Math.max(x1 - x0, y1 - y0) / 2 },
  };
}

// ---------- Wertung ----------

export function summarize(trials: Trial[], state: SectionsState): Summary {
  const base = baseMetrics(trials);
  const right = trials.filter((t) => t.correct);
  const score = right.reduce((sum, t) => sum + 10 * t.difficulty, 0);
  return {
    ...base,
    score,
    level: levelOf(state),
    headline: { label: 'Punkte', value: String(score) },
    extra: [{ label: 'Richtig', value: `${right.length} von ${trials.length}` }],
  };
}
