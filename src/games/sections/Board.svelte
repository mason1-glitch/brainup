<script lang="ts">
  // Ein Durchgang: oben der Körper mit Schnitt, unten vier Formen zur Auswahl.
  // Von Lauf und Tutorial genutzt.
  import { e2e } from '../e2e';
  import type { SectionsTrial } from './logic';
  import Shape from './Shape.svelte';
  import Solid from './Solid.svelte';

  interface Props {
    trial: SectionsTrial;
    /** Erst true, wenn die Timing-Engine den Reiz freigibt. */
    visible: boolean;
    /** Nach der Antwort: welche Form gewählt wurde. */
    chosen?: number | null;
    onAnswer: (index: number, event: { timeStamp: number }) => void;
  }

  let { trial, visible, chosen = null, onAnswer }: Props = $props();
</script>

<div class="board" class:visible>
  <div class="figure"><Solid solid={trial.solid} plane={trial.plane} yaw={trial.yaw} /></div>
  <p class="label">Welche Form hat die Schnittfläche?</p>
  <div class="options">
    {#each trial.options as points, i (i)}
      <button
        type="button"
        class="option"
        class:good={chosen !== null && i === trial.correct}
        class:bad={chosen === i && i !== trial.correct}
        aria-label="Form {i + 1}"
        data-correct={e2e ? i === trial.correct : undefined}
        disabled={chosen !== null}
        onpointerdown={(e) => onAnswer(i, e)}
      >
        <Shape {points} />
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
    gap: var(--s-3);
    padding: var(--s-4);
    visibility: hidden;
  }
  .visible {
    visibility: visible;
  }
  .figure {
    flex: 1;
    min-height: 0;
    width: 100%;
    max-height: 16rem;
  }
  /* Füllt die restliche Höhe; jede Form sitzt mittig in ihrem Feld. */
  .options {
    flex: 1.2;
    min-height: 0;
    max-height: 20rem;
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: minmax(0, 1fr);
    gap: var(--s-3);
  }
  .option {
    min-width: 0;
    min-height: 0;
    padding: var(--s-3);
    border: 2px solid var(--line);
    border-radius: var(--r-lg);
    background: var(--surface);
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
