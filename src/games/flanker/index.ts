import { defineGame } from '../types';
import { initialState, levelOf, summarize, type FlankerState } from './logic';
import Run from './Run.svelte';
import Tutorial from './Tutorial.svelte';

export const flanker = defineGame<FlankerState>({
  id: 'flanker',
  area: 'warmup',
  title: 'Pfeilfokus',
  tagline: 'Aufwärm-Spiel: nur der mittlere Pfeil zählt',
  description:
    'Aufwärm-Spiel. Wohin zeigt der mittlere Pfeil? Tippe links oder rechts – und lass dich von den Pfeilen daneben nicht ablenken.',
  modes: [{ id: 'standard', title: 'Standard', budget: { trials: 40 } }],
  stateVersion: 1,
  initialState,
  level: levelOf,
  Tutorial,
  Run,
  summarize,
});
