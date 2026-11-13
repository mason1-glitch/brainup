import { defineGame } from '../types';
import { initialState, levelOf, summarize, type UfovState } from './logic';
import Run from './Run.svelte';
import Tutorial from './Tutorial.svelte';

export const ufov = defineGame<UfovState>({
  id: 'ufov',
  area: 'training',
  title: 'Blickfeld',
  tagline: 'Mitte erkennen, Rand orten – in Sekundenbruchteilen',
  description:
    'Kurz blitzt eine Form in der Mitte auf, zugleich ein Punkt am Rand. Tippe danach an, welche Form es war und wo der Punkt lag. Je besser du wirst, desto kürzer die Darbietung.',
  modes: [{ id: 'standard', title: 'Standard', budget: { trials: 30 } }],
  stateVersion: 1,
  initialState,
  level: levelOf,
  Tutorial,
  Run,
  summarize,
});
