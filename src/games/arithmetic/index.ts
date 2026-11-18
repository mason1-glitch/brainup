import { defineGame } from '../types';
import { initialState, levelOf, summarize, type ArithmeticState } from './logic';
import Run from './Run.svelte';
import Tutorial from './Tutorial.svelte';

export const arithmetic = defineGame<ArithmeticState>({
  id: 'arithmetic',
  area: 'arithmetic',
  title: 'Kopfrechnen',
  tagline: 'Zehn Rechenarten, die mit dir wachsen',
  description:
    'So viele Aufgaben wie möglich, quer durch alle Rechenarten – vom Einmaleins bis zum Überschlag. Jede Rechenart passt ihre Schwierigkeit einzeln an dich an.',
  // Die IDs stehen in gespeicherten Sitzungen (ModeId in logic.ts); Run.svelte verzweigt nach mode.id.
  modes: [
    { id: 'sprint', title: 'Sprint', budget: { seconds: 60 } },
    { id: 'precision', title: 'Präzision', budget: { trials: 15 } },
    { id: 'review', title: 'Fehlertraining', budget: { trials: 10 } },
  ],
  // Zwei Aufgaben je Rechenart; setzt die Startlevel (logic.ts, placementProbe/placedLevel).
  placement: { id: 'placement', title: 'Einstufung', budget: { trials: 20 } },
  stateVersion: 1,
  initialState,
  level: levelOf,
  Tutorial,
  Run,
  summarize,
});
