<script lang="ts">
  // Ein Durchgang: Vorbild oben, zwei Antworten unten. Von Lauf und Tutorial genutzt.
  import { e2e } from '../e2e';
  import Figure from './Figure.svelte';
  import { frameOf, mirror, type RotationTrial } from './logic';

  interface Props {
    trial: RotationTrial;
    /** Erst true, wenn die Timing-Engine den Reiz freigibt. */
    visible: boolean;
    /** Nach der Antwort: welche gewählt wurde. */
    chosen?: 0 | 1 | null;
    onAnswer: (index: 0 | 1, event: { timeStamp: number }) => void;
  }

  let { trial, visible, chosen = null, onAnswer }: Props = $props();

  const mirrored = $derived(mirror(trial.cells));
  const cellsOf = (i: 0 | 1) => (i === trial.correct ? trial.cells : mirrored);

  // Jede Figur füllt ihr Feld; alle drei im selben Maßstab, damit die Würfel gleich groß bleiben.
  const frames = $derived.by(() => {
    const all = [frameOf(trial.cells, trial.ref), frameOf(cellsOf(0), trial.options[0]), frameOf(cellsOf(1), trial.options[1])];
    const half = Math.max(...all.map((f) => f.half));
    return all.map((f) => ({ ...f, half }));
  });

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') onAnswer(0, e);
    else if (e.key === 'ArrowRight') onAnswer(1, e);
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="board" class:visible>
  <div class="ref"><Figure cells={trial.cells} view={trial.ref} frame={frames[0]} /></div>
  <p class="label">Welche ist dieselbe Figur?</p>
  <div class="options">
    {#each [0, 1] as const as i (i)}
      <button
        type="button"
        class="option"
        class:good={chosen !== null && i === trial.correct}
        class:bad={chosen === i && i !== trial.correct}
        aria-label={i === 0 ? 'Linke Figur' : 'Rechte Figur'}
        data-correct={e2e ? i === trial.correct : undefined}
        disabled={chosen !== null}
        onpointerdown={(e) => onAnswer(i, e)}
      >
        <Figure cells={cellsOf(i)} view={trial.options[i]} frame={frames[i + 1]} />
      </button>
    {/each}
  </div>
</div>

<style>
  .board {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--s-4);
    padding: var(--s-4);
    visibility: hidden;
  }
  .visible {
    visibility: visible;
  }
  .ref {
    flex: 1;
    min-height: 0;
    width: 100%;
    max-width: 16rem;
    aspect-ratio: 1;
  }
  .options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--s-3);
    width: 100%;
  }
  .option {
    min-width: 0;
    aspect-ratio: 1;
    padding: var(--s-2);
    border: 2px solid transparent;
    border-radius: var(--r-lg);
    background: var(--surface);
    box-shadow: var(--shadow);
    cursor: pointer;
    transition:
      border-color var(--dur-fast) var(--ease),
      background-color var(--dur-fast) var(--ease);
  }
  .option.good {
    border-color: var(--good);
    background: var(--good-soft);
  }
  .option.bad {
    border-color: var(--bad);
    background: var(--bad-soft);
  }
</style>
