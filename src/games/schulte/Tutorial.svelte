<script lang="ts">
  // Interaktives Tutorial: erst eine kleine Tafel mit Hilfe, dann eine 3×3-Tafel ohne.
  import { onDestroy } from 'svelte';
  import { timing, type Handle } from '../../core/timing';
  import type { TutorialProps } from '../types';
  import Board from './Board.svelte';
  import { makeBoard, nextTarget, type BoardParams } from './logic';

  let { onDone }: TutorialProps = $props();

  const STEPS: BoardParams[] = [
    { cols: 2, rows: 2, order: 'up' },
    { cols: 3, rows: 3, order: 'up' },
  ];
  let step = $state(0);
  let trial = $state.raw(makeBoard(Math.random, STEPS[0]!));
  let found = $state(0);
  let wrong = $state<number | null>(null);
  /** Rückmeldung nach einem Fehltipp. */
  let missed = $state('');

  let pending: Handle<void> | null = null;
  let flash: Handle<void> | null = null;
  onDestroy(() => {
    pending?.cancel();
    flash?.cancel();
  });

  function tap(n: number) {
    const target = nextTarget(trial, found);
    if (target === null) return;
    flash?.cancel();
    if (n !== target) {
      wrong = n;
      missed = `Das war die ${n}. Gesucht ist die ${target}.`;
      flash = timing.wait(350);
      void flash.done.then(() => (wrong = null));
      return;
    }
    wrong = null;
    missed = '';
    found++;
    if (nextTarget(trial, found) !== null) return;
    pending = timing.wait(700);
    void pending.done.then(() => {
      if (step + 1 >= STEPS.length) return onDone();
      step++;
      found = 0;
      trial = makeBoard(Math.random, STEPS[step]!);
    });
  }
</script>

<div class="tutorial">
  <div class="text">
    <p class="label">Schritt {step + 1} von {STEPS.length}</p>
    {#if step === 0}
      <h2>Der Reihe nach</h2>
    {:else}
      <h2>Jetzt ohne Hilfe</h2>
    {/if}
    <p class="muted" class:warn={missed !== ''} aria-live="polite">
      {#if missed}
        {missed}
      {:else if step === 0}
        Tippe die Zahlen der Reihe nach an: 1, 2, 3, 4. Die nächste ist markiert.
      {:else}
        Finde 1 bis 9, so schnell du kannst. Gefundene Zahlen verblassen.
      {/if}
    </p>
  </div>
  <Board {trial} visible {found} {wrong} hint={step === 0} note=" " onTap={tap} />
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
    min-height: 7.5rem;
  }
  .warn {
    color: var(--bad);
  }
</style>
