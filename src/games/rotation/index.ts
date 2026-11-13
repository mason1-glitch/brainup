import { defineGame } from '../types';
import { initialState, levelOf, summarize, type RotationState } from './logic';
import Run from './Run.svelte';
import Tutorial from './Tutorial.svelte';

export const rotation = defineGame<RotationState>({
  id: 'rotation',
  area: 'training',
  title: 'Mentale Rotation',
  tagline: 'Würfelfiguren im Kopf drehen',
  description:
    'Oben siehst du eine Figur aus Würfeln. Eine der beiden unteren ist dieselbe, nur gedreht – die andere ist ihr Spiegelbild. Tippe auf die gedrehte.',
  modes: [{ id: 'standard', title: 'Standard', budget: { trials: 20 } }],
  stateVersion: 1,
  initialState,
  level: levelOf,
  Tutorial,
  Run,
  summarize,
});
