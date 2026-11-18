import { defineGame } from '../types';
import { initialState, levelOf, summarize, type SwitchState } from './logic';
import Run from './Run.svelte';
import Tutorial from './Tutorial.svelte';

export const taskswitch = defineGame<SwitchState>({
  id: 'taskswitch',
  area: 'warmup',
  title: 'Wechselspiel',
  tagline: 'Aufwärm-Spiel: zwei Regeln, schnell umschalten',
  description:
    'Aufwärm-Spiel. Mal fragt die Karte „gerade oder ungerade?“, mal „kleiner oder größer als 5?“. Antworte nach der Regel, die gerade gilt.',
  modes: [{ id: 'standard', title: 'Standard', budget: { trials: 40 } }],
  stateVersion: 1,
  initialState,
  level: levelOf,
  Tutorial,
  Run,
  summarize,
});
