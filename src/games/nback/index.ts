import { defineGame } from '../types';
import { initialState, levelOf, summarize, type NbackState } from './logic';
import Run from './Run.svelte';
import Tutorial from './Tutorial.svelte';

export const nback = defineGame<NbackState>({
  id: 'nback',
  area: 'warmup',
  title: 'N-Back',
  tagline: 'Aufwärm-Spiel: war das Feld vor n Schritten dasselbe?',
  description:
    'Aufwärm-Spiel. Ein Feld nach dem anderen leuchtet auf. Tippe auf „Treffer“, wenn das Feld dasselbe ist wie vor n Schritten. Triffst du sicher, steigt n.',
  // 40 gewertete Felder = zwei Blöcke zu je 20.
  modes: [{ id: 'standard', title: 'Standard', budget: { trials: 40 } }],
  stateVersion: 1,
  initialState,
  level: levelOf,
  Tutorial,
  Run,
  summarize,
});
