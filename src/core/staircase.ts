// Adaptives Staircase-Verfahren (n-down-1-up) für alle Spiele.
// `down: 3` konvergiert auf ≈ 79,4 % Trefferquote. Rein funktional, Zustand ist JSON.

export interface StaircaseConfig {
  start: number;
  min: number;
  max: number;
  /** So viele richtige Antworten in Folge machen es schwerer; ein Fehler macht es leichter. */
  down: number;
  /** Schrittweite je nach Zahl bisheriger Umkehrungen; der letzte Wert gilt danach weiter. */
  steps: number[];
  /** 'add': Wert ± Schritt. 'mul': Wert ×/÷ Schritt (Schritt > 1), z. B. für Zeiten in ms. */
  scale: 'add' | 'mul';
  /** Richtung des Werts, in der es schwerer wird. */
  harder: 'up' | 'down';
}

export interface StaircaseState {
  value: number;
  /** Richtige Antworten in Folge seit der letzten Änderung. */
  streak: number;
  /** Letzte Bewegung: 1 = schwerer, -1 = leichter, 0 = noch keine. */
  lastMove: -1 | 0 | 1;
  /** Anzahl bisheriger Richtungswechsel (steuert die Schrittweite). */
  reversals: number;
  trials: number;
}

export function initStaircase(cfg: StaircaseConfig): StaircaseState {
  return { value: cfg.start, streak: 0, lastMove: 0, reversals: 0, trials: 0 };
}

export function updateStaircase(cfg: StaircaseConfig, s: StaircaseState, correct: boolean): StaircaseState {
  const streak = correct ? s.streak + 1 : 0;
  const move: -1 | 0 | 1 = !correct ? -1 : streak >= cfg.down ? 1 : 0;
  if (move === 0) return { ...s, streak, trials: s.trials + 1 };

  const step = cfg.steps[Math.min(s.reversals, cfg.steps.length - 1)]!;
  const sign = (cfg.harder === 'up' ? 1 : -1) * move;
  const raw = cfg.scale === 'add' ? s.value + sign * step : sign > 0 ? s.value * step : s.value / step;
  const value = Math.min(cfg.max, Math.max(cfg.min, raw));
  const reversed = s.lastMove !== 0 && s.lastMove !== move;
  return {
    value,
    streak: 0,
    lastMove: move,
    reversals: s.reversals + (reversed ? 1 : 0),
    trials: s.trials + 1,
  };
}

/**
 * Schwellenschätzung aus den Werten gespielter Durchgänge (`Trial.difficulty`):
 * Mittelwert, bei 'mul' geometrisch. Die Einschwingphase vorher weglassen.
 *
 * Genauigkeit: Der Schätzer ist erwartungstreu, streut aber. ±10 % brauchen einige hundert
 * Durchgänge; eine einzelne Sitzung (≈ 40 Durchgänge) liegt eher bei ±20 %. Für Verläufe
 * deshalb über mehrere Sitzungen mitteln. Das Mittel der Umkehrpunkte (klassisch) streut
 * bei gleicher Datenmenge deutlich stärker und wurde deshalb verworfen.
 */
export function threshold(cfg: StaircaseConfig, values: number[]): number | null {
  if (values.length === 0) return null;
  if (cfg.scale === 'add') return values.reduce((a, b) => a + b, 0) / values.length;
  return Math.exp(values.reduce((a, b) => a + Math.log(b), 0) / values.length);
}
