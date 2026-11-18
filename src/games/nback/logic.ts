// N-Back: Ein Feld nach dem anderen leuchtet auf; „Treffer“, wenn es dasselbe ist wie vor n Schritten.
import { shuffle, type Rng } from '../../core/rng';
import { initStaircase, updateStaircase, type StaircaseConfig, type StaircaseState } from '../../core/staircase';
import type { Summary, Trial } from '../../data/types';
import { baseMetrics } from '../metrics';

/** Felder des 3×3-Rasters. */
export const POSITIONS = 9;
/** Gewertete Felder je Block (dazu kommen vorweg n Felder ohne Wertung). */
export const BLOCK = 20;
/** Treffer je Block. */
export const TARGETS = 6;
/** Leuchtdauer eines Felds in ms (vor der Rundung auf Frames). */
export const ON_MS = 500;

export interface NbackParams {
  n: number;
  /** Abstand von Feld zu Feld (Beginn zu Beginn) in ms – zugleich das Antwortfenster. */
  soaMs: number;
}

/** Level 1–6: n steigt von 1 auf 3; bei gleichem n wird das Tempo schneller. */
export const LEVELS: readonly NbackParams[] = [
  { n: 1, soaMs: 2400 },
  { n: 2, soaMs: 2400 },
  { n: 2, soaMs: 1900 },
  { n: 3, soaMs: 2400 },
  { n: 3, soaMs: 1900 },
  { n: 3, soaMs: 1500 },
];

/** Der Staircase regelt das Level; ein „Durchgang“ ist hier ein ganzer Block (`afterBlock`). */
export const STAIRCASE: StaircaseConfig = { start: 1, min: 1, max: LEVELS.length, down: 1, steps: [1], scale: 'add', harder: 'up' };

export interface NbackState {
  stair: StaircaseState;
}

export const initialState = (): NbackState => ({ stair: initStaircase(STAIRCASE) });
export const levelOf = (s: NbackState): number => Math.round(s.stair.value);
export const paramsFor = (level: number): NbackParams => LEVELS[Math.min(LEVELS.length, Math.max(1, Math.round(level))) - 1]!;

export interface Stimulus {
  /** Feld 0–8, zeilenweise von links oben. */
  position: number;
  /** Feld vor n Schritten; null bei den ersten n Feldern (noch kein Vergleich möglich). */
  back: number | null;
  target: boolean;
}

/**
 * Eine Folge aus n Vorlauf-Feldern und `scored` gewerteten. Treffer liegen an zufälligen Stellen;
 * alle anderen gewerteten Felder unterscheiden sich sicher vom Feld vor n Schritten.
 */
export function makeBlock(rng: Rng, n: number, scored = BLOCK): Stimulus[] {
  const targets = Math.round((scored * TARGETS) / BLOCK);
  const marks = new Set(shuffle(rng, Array.from({ length: scored }, (_, i) => i + n)).slice(0, targets));
  const block: Stimulus[] = [];
  for (let i = 0; i < n + scored; i++) {
    const back = i >= n ? block[i - n]!.position : null;
    let position: number;
    if (back === null) position = Math.floor(rng() * POSITIONS);
    else if (marks.has(i)) position = back;
    else position = (back + 1 + Math.floor(rng() * (POSITIONS - 1))) % POSITIONS;
    block.push({ position, back, target: back !== null && position === back });
  }
  return block;
}

export function isCorrect(stimulus: Pick<Stimulus, 'target'>, pressed: boolean): boolean {
  return pressed === stimulus.target;
}

export type Verdict = 'up' | 'down' | 'stay';

export interface BlockRating {
  hits: number;
  misses: number;
  falseAlarms: number;
  verdict: Verdict;
}

/** Bewertet einen Block: höchstens 5 % Fehler → schwerer, ab 25 % Fehlern → leichter. */
export function rateBlock(results: readonly { target: boolean; pressed: boolean }[]): BlockRating {
  const hits = results.filter((r) => r.target && r.pressed).length;
  const misses = results.filter((r) => r.target && !r.pressed).length;
  const falseAlarms = results.filter((r) => !r.target && r.pressed).length;
  const errors = (misses + falseAlarms) / Math.max(1, results.length);
  return { hits, misses, falseAlarms, verdict: errors <= 0.05 ? 'up' : errors >= 0.25 ? 'down' : 'stay' };
}

export function afterBlock(state: NbackState, verdict: Verdict): NbackState {
  return verdict === 'stay' ? state : { stair: updateStaircase(STAIRCASE, state.stair, verdict === 'up') };
}

export const kindOf = (n: number): string => `${n}-back`;

export function summarize(trials: Trial[], state: NbackState): Summary {
  const rows = trials.map((t) => ({
    ...(t.task as { n: number; block: number; target: boolean }),
    pressed: (t.response as { pressed: boolean }).pressed,
  }));
  const all = rateBlock(rows);
  // Punkte je Block: n × 100 × (Trefferrate − Fehlalarmrate) – blindes Tippen bringt nichts.
  const blocks = [...new Set(rows.map((r) => r.block))].map((id) => rows.filter((r) => r.block === id));
  const score = blocks.reduce((sum, block) => {
    const { hits, misses, falseAlarms } = rateBlock(block);
    const others = block.length - hits - misses;
    const rate = (hits + misses ? hits / (hits + misses) : 0) - (others ? falseAlarms / others : 0);
    return sum + Math.round(block[0]!.n * 100 * Math.max(0, rate));
  }, 0);
  return {
    ...baseMetrics(trials),
    score,
    level: levelOf(state),
    headline: { label: 'Treffer erkannt', value: `${all.hits} von ${all.hits + all.misses}` },
    extra: [
      { label: 'Fehlalarme', value: String(all.falseAlarms) },
      { label: 'Gespielt', value: [...new Set(rows.map((r) => `${r.n}-Back`))].join(', ') },
    ],
  };
}
