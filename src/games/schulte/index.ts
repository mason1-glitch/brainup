import { defineGame } from '../types';
import { initialState, levelOf, summarize, type SchulteState } from './logic';
import Run from './Run.svelte';
import Tutorial from './Tutorial.svelte';

export const schulte = defineGame<SchulteState>({
  id: 'schulte',
  area: 'warmup',
  title: 'Zahlensuche',
  tagline: 'Aufwärm-Spiel: Zahlen der Reihe nach finden',
  description:
    'Aufwärm-Spiel. Tippe die Zahlen der Reihe nach an – 1, 2, 3 … – so schnell du kannst. Die Tafel wächst mit dir.',
  // Ein Durchgang ist eine ganze Tafel.
  modes: [{ id: 'standard', title: 'Standard', budget: { trials: 3 } }],
  stateVersion: 1,
  initialState,
  level: levelOf,
  Tutorial,
  Run,
  summarize,
});
