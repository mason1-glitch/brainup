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
  // Weitere Modi (Präzision, Fehlertraining) kommen hier dazu; Run.svelte verzweigt dann nach mode.id.
  modes: [{ id: 'sprint', title: 'Sprint · 60 s', budget: { seconds: 60 } }],
  stateVersion: 1,
  initialState,
  level: levelOf,
  Tutorial,
  Run,
  summarize,
});
