import { defineGame } from '../types';
import { initialState, levelOf, summarize, type CorsiState } from './logic';
import Run from './Run.svelte';
import Tutorial from './Tutorial.svelte';

export const corsi = defineGame<CorsiState>({
  id: 'corsi',
  area: 'warmup',
  title: 'Blockfolge',
  tagline: 'Aufwärm-Spiel: Folge merken und nachtippen',
  description:
    'Aufwärm-Spiel. Felder leuchten nacheinander auf. Tippe sie danach in derselben Reihenfolge an. Nach jedem Erfolg wird die Folge länger.',
  modes: [{ id: 'standard', title: 'Standard', budget: { trials: 10 } }],
  stateVersion: 1,
  initialState,
  level: levelOf,
  Tutorial,
  Run,
  summarize,
});
