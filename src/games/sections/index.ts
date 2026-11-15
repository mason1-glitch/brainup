import { defineGame } from '../types';
import { initialState, levelOf, summarize, type SectionsState } from './logic';
import Run from './Run.svelte';
import Tutorial from './Tutorial.svelte';

export const sections = defineGame<SectionsState>({
  id: 'sections',
  area: 'training',
  title: 'Schnittansichten',
  tagline: 'Körper durchschneiden – welche Fläche entsteht?',
  description: 'Eine Ebene schneidet durch einen Körper. Welche Form hat die Schnittfläche? Tippe auf die richtige.',
  modes: [{ id: 'standard', title: 'Standard', budget: { trials: 12 } }],
  stateVersion: 1,
  initialState,
  level: levelOf,
  Tutorial,
  Run,
  summarize,
});
