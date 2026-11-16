<script lang="ts">
  // Interaktives Tutorial: drei Aufgaben zum Mitmachen – eine Faltung, zwei Faltungen, eine
  // schräge. Nach einem Fehler kommt eine neue Aufgabe derselben Art.
  import { onDestroy } from 'svelte';
  import { timing, type Handle } from '../../core/timing';
  import type { TutorialProps } from '../types';
  import Board from './Board.svelte';
  import { makeTrial, type PaperTrial } from './logic';

  let { onDone }: TutorialProps = $props();

  const STEPS = [
    { level: 1, title: 'Einmal gefaltet', text: 'Das Blatt wird gefaltet – getönt ist die umgeklappte Hälfte – und dann gelocht. Das Loch geht durch beide Lagen.' },
    { level: 4, title: 'Zweimal gefaltet', text: 'Klapp im Kopf rückwärts auf: erst die letzte Faltung, dann die erste. Bei jedem Aufklappen spiegeln sich die Löcher.' },
    { level: 3, title: 'Schräg gefaltet', text: 'Auch an einer schrägen Linie spiegelt sich das Loch – quer über die Faltlinie.' },
  ];

  let step = $state(0);
  let trial = $state.raw<PaperTrial>(makeTrial(Math.random, STEPS[0]!.level));
  let chosen = $state<number | null>(null);
  let missed = $state(false);

  let pending: Handle<void> | null = null;
  onDestroy(() => pending?.cancel());

  function answer(index: number) {
    if (chosen !== null) return;
    chosen = index;
    const correct = index === trial.correct;
    missed = !correct;
    pending = timing.wait(correct ? 900 : 3000);
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
      {missed ? 'Nicht ganz – grün zeigt das richtige Blatt, oben siehst du die Löcher in jedem Schritt. Gleich kommt eine neue Aufgabe.' : STEPS[step]!.text}
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
