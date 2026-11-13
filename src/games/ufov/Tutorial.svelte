<script lang="ts">
  // Interaktives Tutorial: drei Durchgänge, erst langsam und nur die Mitte, dann mit Punkt
  // am Rand, dann schneller. Jeder wird wiederholt, bis er richtig ist.
  import { timing } from '../../core/timing';
  import type { TutorialProps } from '../types';
  import { makeTrial, type Stage, type UfovTrial } from './logic';
  import Round, { type RoundResult } from './Round.svelte';

  let { onDone }: TutorialProps = $props();

  const STEPS: { stage: Stage; ms: number; title: string; text: string }[] = [
    { stage: 1, ms: 1000, title: 'Die Mitte', text: 'Gleich blitzt in der Mitte eine Form auf: Kreis oder Quadrat. Tippe danach auf die, die du gesehen hast.' },
    { stage: 2, ms: 1000, title: 'Der Rand', text: 'Jetzt erscheint zusätzlich ein Punkt am Rand. Merke dir Form und Richtung – tippe danach beides an.' },
    { stage: 2, ms: 300, title: 'Schneller', text: 'Im Spiel wird es kürzer, je besser du wirst. Schau auf die Mitte und nimm den Rand mit.' },
  ];

  let index = $state(0);
  let attempt = $state(0);
  let missed = $state(false);
  let trial = $state.raw<UfovTrial>(make(0));

  function make(i: number): UfovTrial {
    const s = STEPS[i]!;
    return { ...makeTrial(Math.random, { stage: s.stage, stair: { value: s.ms, streak: 0, lastMove: 0, reversals: 0, trials: 0 } }, timing.quantize) };
  }

  function finished(r: RoundResult) {
    missed = !r.correct;
    if (r.correct) {
      if (index + 1 >= STEPS.length) return onDone();
      index++;
    }
    trial = make(index);
    attempt++;
  }
</script>

<div class="tutorial">
  <div class="text">
    <p class="label">Schritt {index + 1} von {STEPS.length}</p>
    <h2>{STEPS[index]!.title}</h2>
    <p class="muted" class:warn={missed} aria-live="polite">
      {missed ? 'Nicht ganz – grün zeigt, was richtig war. Gleich noch einmal.' : STEPS[index]!.text}
    </p>
  </div>
  <div class="stage">
    {#key attempt}
      <Round {trial} onDone={finished} />
    {/key}
  </div>
</div>

<style>
  .tutorial {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: var(--s-4);
  }
  .text {
    display: grid;
    gap: var(--s-2);
    min-height: 8.5rem;
    align-content: start;
  }
  .warn {
    color: var(--bad);
  }
  .stage {
    flex: 1;
    display: flex;
  }
</style>
