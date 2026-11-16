<script lang="ts">
  // Ein Durchgang des Pfeilfokus: Pfeilreihe in der Mitte, zwei große Tasten unten.
  // Von Lauf und Tutorial genutzt.
  import { e2e } from '../e2e';
  import { arrowsOf, type Direction, type FlankerTrial } from './logic';

  interface Props {
    trial: Pick<FlankerTrial, 'target' | 'congruent'>;
    /** Erst true, wenn die Timing-Engine die Reihe zeigt. */
    visible: boolean;
    /** Nach der Antwort: welche Taste gedrückt wurde (null = keine, Zeit abgelaufen). */
    chosen?: Direction | null;
    /** true, sobald der Durchgang entschieden ist (Rückmeldung). */
    settled?: boolean;
    note?: string;
    onAnswer: (direction: Direction, event: { timeStamp: number }) => void;
  }

  let { trial, visible, chosen = null, settled = false, note = '', onAnswer }: Props = $props();

  const arrows = $derived(arrowsOf(trial));
  const sides = [
    { id: 'left', label: 'Links' },
    { id: 'right', label: 'Rechts' },
  ] as const;

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') onAnswer('left', e);
    else if (e.key === 'ArrowRight') onAnswer('right', e);
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#snippet arrow(direction: Direction)}
  <svg viewBox="0 0 24 24" class:flip={direction === 'left'} aria-hidden="true">
    <path d="M3 12h17M13 5l7 7-7 7" />
  </svg>
{/snippet}

<div class="board" data-phase={settled ? 'feedback' : visible ? 'respond' : 'wait'}>
  <div class="stage">
    {#if visible}
      <div class="row" role="img" aria-label="Pfeilreihe">
        {#each arrows as direction, i (i)}{@render arrow(direction)}{/each}
      </div>
    {:else}
      <span class="fixation"></span>
    {/if}
    <p class="note" aria-live="polite">{note}</p>
  </div>
  <div class="keys">
    {#each sides as side (side.id)}
      <button
        type="button"
        class="key"
        class:good={settled && chosen !== null && side.id === trial.target}
        class:bad={settled && chosen === side.id && side.id !== trial.target}
        aria-label={side.label}
        data-correct={e2e && visible && !settled ? side.id === trial.target : undefined}
        disabled={settled}
        onpointerdown={(e) => onAnswer(side.id, e)}
      >
        {@render arrow(side.id)}
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
    gap: var(--s-4);
    padding: var(--s-4);
  }
  .stage {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-rows: 1fr auto 1fr;
    justify-items: center;
    align-items: center;
  }
  .row,
  .fixation {
    grid-row: 2;
  }
  .row {
    display: flex;
    gap: var(--s-1);
    color: var(--ink);
  }
  .row svg {
    width: 3.25rem;
    height: 3.25rem;
  }
  .fixation {
    width: var(--s-2);
    height: var(--s-2);
    margin: calc((3.25rem - var(--s-2)) / 2) 0;
    border-radius: var(--r-full);
    background: var(--ink-3);
  }
  .note {
    grid-row: 3;
    align-self: start;
    min-height: 1.5em;
    margin-top: var(--s-4);
    text-align: center;
    color: var(--bad);
    font-weight: var(--weight-bold);
  }
  svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .flip {
    transform: scaleX(-1);
  }
  .keys {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--s-3);
  }
  .key {
    display: grid;
    place-items: center;
    height: calc(2.5 * var(--tap));
    border: 2px solid transparent;
    border-radius: var(--r-lg);
    background: var(--surface);
    box-shadow: var(--shadow);
    color: var(--ink);
    cursor: pointer;
    touch-action: manipulation;
    transition:
      border-color var(--dur-fast) var(--ease),
      background-color var(--dur-fast) var(--ease);
  }
  .key svg {
    width: var(--tap);
    height: var(--tap);
  }
  .key.good {
    border-color: var(--good);
    background: var(--good-soft);
  }
  .key.bad {
    border-color: var(--bad);
    background: var(--bad-soft);
  }
</style>
