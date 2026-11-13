<script lang="ts">
  // Ein Durchgang: Vorbild oben, zwei Antworten unten. Von Lauf und Tutorial genutzt.
  import { e2e } from '../e2e';
  import Figure from './Figure.svelte';
  import { mirror, type RotationTrial } from './logic';

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

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') onAnswer(0, e);
    else if (e.key === 'ArrowRight') onAnswer(1, e);
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="board" class:visible>
  <div class="ref"><Figure cells={trial.cells} view={trial.ref} /></div>
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
        <Figure cells={i === trial.correct ? trial.cells : mirrored} view={trial.options[i]} />
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
