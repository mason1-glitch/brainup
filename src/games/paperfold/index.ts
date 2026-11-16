import { defineGame } from '../types';
import { initialState, levelOf, summarize, type PaperState } from './logic';
import Run from './Run.svelte';
import Tutorial from './Tutorial.svelte';

export const paperfold = defineGame<PaperState>({
  id: 'paperfold',
  area: 'training',
  title: 'Papierfalten',
  tagline: 'Falten, lochen, im Kopf wieder aufklappen',
  description:
    'Ein Blatt wird gefaltet und gelocht. Welches Lochmuster siehst du, wenn es wieder aufgeklappt ist? Tippe auf das richtige Blatt.',
  modes: [{ id: 'standard', title: 'Standard', budget: { trials: 12 } }],
  stateVersion: 1,
  initialState,
  level: levelOf,
  Tutorial,
  Run,
  summarize,
});
