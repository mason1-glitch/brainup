<script lang="ts">
  // Interaktives Tutorial: erst selbst drehen, dann Original und Spiegelbild vergleichen,
  // dann zwei leichte Übungsdurchgänge (bis sie richtig sind).
  import { onDestroy } from 'svelte';
  import { timing, type Handle } from '../../core/timing';
  import Button from '../../ui/Button.svelte';
  import type { TutorialProps } from '../types';
  import Board from './Board.svelte';
  import Figure from './Figure.svelte';
  import { axisAngle, BASE_VIEW, generateFigure, makeTrial, mirror, mul, type Mat3, type RotationTrial } from './logic';

  let { onDone }: TutorialProps = $props();

  const cells = generateFigure(Math.random, 3);
  const mirrored = mirror(cells);

  let step = $state<0 | 1 | 2>(0);
  let view = $state.raw<Mat3>(BASE_VIEW);
  let dragged = $state(0);
  let last: { x: number; y: number } | null = null;

  function onPointerDown(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    last = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: PointerEvent) {
    if (!last) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
    view = mul(mul(axisAngle([0, 1, 0], dx * 0.6), axisAngle([1, 0, 0], dy * 0.6)), view);
    dragged += Math.abs(dx) + Math.abs(dy);
  }
  const onPointerUp = () => (last = null);

  // Übung
  const LEVELS = [1, 3];
  let round = $state(0);
  let trial = $state.raw<RotationTrial>(makeTrial(Math.random, LEVELS[0]!));
  let chosen = $state<0 | 1 | null>(null);
  let missed = $state(false);

  let pending: Handle<void> | null = null;
  onDestroy(() => pending?.cancel());

  function answer(index: 0 | 1) {
    if (chosen !== null) return;
    chosen = index;
    const correct = index === trial.correct;
    missed = !correct;
    pending = timing.wait(correct ? 700 : 1500);
    void pending.done.then(() => {
      chosen = null;
      if (!correct) return; // gleicher Durchgang noch einmal
      if (round + 1 >= LEVELS.length) return onDone();
      round++;
      trial = makeTrial(Math.random, LEVELS[round]!);
    });
  }
</script>

<div class="tutorial">
  {#if step < 2}
    <div class="text">
      <p class="label">Schritt {step + 1} von 3</p>
      {#if step === 0}
        <h2>Dreh die Figur</h2>
        <p class="muted">Zieh mit dem Finger über die Figur und sieh sie dir von allen Seiten an.</p>
      {:else}
        <h2>Das Spiegelbild</h2>
        <p class="muted">Rechts ist das Spiegelbild. Dreh weiter: Die beiden werden nie gleich aussehen.</p>
      {/if}
    </div>
    <div
      class="stage"
      class:pair={step === 1}
      role="application"
      aria-label="Figur drehen"
      data-testid="rotate-area"
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
    >
      <div class="fig"><Figure {cells} {view} /></div>
      {#if step === 1}<div class="fig"><Figure cells={mirrored} {view} /></div>{/if}
    </div>
    <Button size="lg" block disabled={dragged < 120} onclick={() => ((step = (step + 1) as 1 | 2), (dragged = 0))}>
      {step === 0 ? 'Weiter' : 'Verstanden'}
    </Button>
  {:else}
    <div class="text">
      <p class="label">Schritt 3 von 3 · Übung {round + 1} von {LEVELS.length}</p>
      <h2>Finde dieselbe Figur</h2>
      <p class="muted" class:warn={missed} aria-live="polite">
        {missed ? 'Das war das Spiegelbild. Versuch es noch einmal.' : 'Eine der beiden unteren ist nur gedreht, die andere gespiegelt.'}
      </p>
    </div>
    <Board {trial} visible {chosen} onAnswer={answer} />
  {/if}
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
    min-height: 7.5rem;
  }
  .warn {
    color: var(--bad);
  }
  .stage {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-3);
    border-radius: var(--r-lg);
    background: var(--surface);
    box-shadow: var(--shadow);
    touch-action: none;
    cursor: grab;
  }
  .fig {
    width: min(100%, 17rem);
    aspect-ratio: 1;
    pointer-events: none;
  }
  .pair .fig {
    width: 46%;
  }
</style>
