<script lang="ts">
  // Interaktives Tutorial: drei Aufgaben zum Mitmachen – gerader Schnitt durch einen Quader,
  // Schnitt durch Prisma oder Pyramide, schräger Schnitt. Nach einem Fehler kommt eine neue Aufgabe.
  import { onDestroy } from 'svelte';
  import { timing, type Handle } from '../../core/timing';
  import type { TutorialProps } from '../types';
  import Board from './Board.svelte';
  import { makeTrial, type SectionsTrial } from './logic';

  let { onDone }: TutorialProps = $props();

  const STEPS = [
    { level: 1, title: 'Gerader Schnitt', text: 'Eine Ebene schneidet durch den Körper – die markierte Fläche. Welche Form hat sie, wenn du senkrecht daraufschaust?' },
    { level: 2, title: 'Andere Körper', text: 'Bei Prisma, Haus und Pyramide hängt die Form davon ab, wo die Ebene schneidet.' },
    { level: 4, title: 'Schräger Schnitt', text: 'Schräge Schnitte wirken im Bild verzerrt. Achte darauf, welche Kanten die Ebene trifft und wie lang die Seiten wirklich sind.' },
  ];

  let step = $state(0);
  let trial = $state.raw<SectionsTrial>(makeTrial(Math.random, STEPS[0]!.level));
  let chosen = $state<number | null>(null);
  let missed = $state(false);

  let pending: Handle<void> | null = null;
  onDestroy(() => pending?.cancel());

  function answer(index: number) {
    if (chosen !== null) return;
    chosen = index;
    const correct = index === trial.correct;
    missed = !correct;
    pending = timing.wait(correct ? 900 : 2200);
    void pending.done.then(() => {
      if (correct && step + 1 >= STEPS.length) return onDone();
      if (correct) step++;
      chosen = null;
      trial = makeTrial(Math.random, STEPS[step]!.level);
    });
  }
</script>

<div class="tutorial">
  <div class="text">
    <p class="label">Schritt {step + 1} von {STEPS.length}</p>
    <h2>{STEPS[step]!.title}</h2>
    <p class="muted" class:warn={missed} aria-live="polite">
      {missed ? 'Nicht ganz – grün zeigt die richtige Form. Gleich kommt eine neue Aufgabe.' : STEPS[step]!.text}
    </p>
  </div>
  <Board {trial} visible {chosen} onAnswer={answer} />
</div>

<style>
  .tutorial {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
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
</style>
