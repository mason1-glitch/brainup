<script lang="ts">
  // Ein Durchgang: oben die Faltfolge mit der Lochung im letzten Bild, unten vier aufgeklappte
  // Blätter zur Auswahl. Von Lauf und Tutorial genutzt.
  import Icon from '../../ui/Icon.svelte';
  import { e2e } from '../e2e';
  import { flatSheet, holesBySheet, sheetsOf, type PaperTrial } from './logic';
  import Paper from './Paper.svelte';

  interface Props {
    trial: PaperTrial;
    /** Erst true, wenn die Timing-Engine den Reiz freigibt. */
    visible: boolean;
    /** Nach der Antwort: welches Muster gewählt wurde. */
    chosen?: number | null;
    onAnswer: (index: number, event: { timeStamp: number }) => void;
  }

  let { trial, visible, chosen = null, onAnswer }: Props = $props();

  const sheets = $derived(sheetsOf(trial.folds));
  // Auflösung nach der Antwort: Jedes Bild zeigt, wo die Löcher in diesem Faltzustand liegen.
  const reveal = $derived(chosen === null ? null : holesBySheet(trial.folds, sheets, trial.punches));
  const flat = flatSheet();
</script>

<div class="board" class:visible>
  <div class="steps">
    {#each trial.folds as _, i (i)}
      {#if i > 0}<span class="arrow"><Icon name="chevron" size={16} /></span>{/if}
      <div class="step">
        <Paper sheet={sheets[i + 1]!} before={sheets[i]} holes={reveal?.[i + 1] ?? (i === trial.folds.length - 1 ? trial.punches : [])} />
      </div>
    {/each}
  </div>
  <p class="label">Wie sieht das Blatt aufgeklappt aus?</p>
  <div class="options">
    {#each trial.options as holes, i (i)}
      <button
        type="button"
        class="option"
        class:good={chosen !== null && i === trial.correct}
        class:bad={chosen === i && i !== trial.correct}
        aria-label="Blatt {i + 1}"
        data-correct={e2e ? i === trial.correct : undefined}
        disabled={chosen !== null}
        onpointerdown={(e) => onAnswer(i, e)}
      >
        <Paper sheet={flat} {holes} />
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
  .steps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-1);
    width: 100%;
  }
  .step {
    flex: 1;
    min-width: 0;
    max-width: 7.5rem;
    aspect-ratio: 1;
  }
  .arrow {
    display: grid;
    color: var(--ink-3);
  }
  /* Füllt die restliche Höhe; jedes Blatt bleibt quadratisch und sitzt mittig in seinem Feld. */
  .options {
    flex: 1;
    min-height: 0;
    max-height: 24rem;
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: minmax(0, 1fr);
    gap: var(--s-3);
  }
  .option {
    min-width: 0;
    min-height: 0;
    padding: var(--s-2);
    border: 2px solid var(--line);
    border-radius: var(--r-lg);
    background: transparent;
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
