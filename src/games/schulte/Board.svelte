<script lang="ts">
  // Eine Tafel: Hinweis zur Reihenfolge oben, darunter das Zahlenfeld. Von Lauf und Tutorial genutzt.
  import { e2e } from '../e2e';
  import { nextTarget, sequence, type BoardParams } from './logic';

  interface Props {
    trial: BoardParams & { cells: number[] };
    /** Erst true, wenn die Timing-Engine die Tafel freigibt. */
    visible: boolean;
    /** Wie viele Zahlen schon gefunden sind. */
    found: number;
    /** Zuletzt falsch angetippte Zahl, solange sie rot aufleuchtet. */
    wrong?: number | null;
    /** Die gesuchte Zahl hervorheben (Tutorial). */
    hint?: boolean;
    /** Text über der Tafel statt des Hinweises zur Reihenfolge. */
    note?: string;
    /** Färbt `note` als Erfolg. */
    good?: boolean;
    onTap: (n: number, event: { timeStamp: number }) => void;
  }

  let { trial, visible, found, wrong = null, hint = false, note = '', good = false, onTap }: Props = $props();

  const count = $derived(trial.cols * trial.rows);
  const order = $derived(sequence(count, trial.order));
  const target = $derived(nextTarget(trial, found));
  const done = $derived(new Set(order.slice(0, found)));
  const rule = $derived(
    trial.order === 'up'
      ? 'Der Reihe nach: 1, 2, 3 …'
      : trial.order === 'down'
        ? `Rückwärts: ${order.slice(0, 3).join(', ')} …`
        : `Im Wechsel: ${order.slice(0, 4).join(', ')} …`,
  );
</script>

<div class="board" class:visible>
  <p class="note num" class:good aria-live="polite">{note || rule}</p>
  <div class="fit">
    <div class="grid" class:dense={trial.cols > 4} style:--cols={trial.cols} style:--rows={trial.rows}>
      {#each trial.cells as n (n)}
        <button
          type="button"
          class="cell num"
          class:found={done.has(n)}
          class:wrong={wrong === n}
          class:hint={hint && n === target}
          data-correct={e2e ? n === target : undefined}
          disabled={done.has(n) || target === null}
          onpointerdown={(e) => onTap(n, e)}
        >
          {n}
        </button>
      {/each}
    </div>
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
    visibility: hidden;
  }
  .visible {
    visibility: visible;
  }
  .note {
    min-height: 1.5em;
    text-align: center;
    color: var(--ink-2);
    font-size: var(--text-md);
  }
  .note.good {
    color: var(--good);
    font-weight: var(--weight-bold);
  }
  /* Das Feld füllt den freien Platz, ohne sein Seitenverhältnis zu verlieren. */
  .fit {
    flex: 1;
    min-height: 0;
    container-type: size;
    display: grid;
    place-items: center;
  }
  .grid {
    width: min(100cqw, 100cqh * var(--cols) / var(--rows), var(--cols) * 2 * var(--tap));
    aspect-ratio: var(--cols) / var(--rows);
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: var(--s-2);
  }
  .dense {
    gap: var(--s-1);
  }
  .cell {
    min-width: 0;
    padding: 0;
    border: 2px solid transparent;
    border-radius: var(--r-md);
    background: var(--surface);
    box-shadow: var(--shadow);
    color: var(--ink);
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    cursor: pointer;
    touch-action: manipulation;
    transition:
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease),
      border-color var(--dur-fast) var(--ease);
  }
  .dense .cell {
    border-radius: var(--r-sm);
    font-size: var(--text-lg);
  }
  .cell.found {
    background: var(--sunken);
    box-shadow: none;
    color: var(--ink-3);
    cursor: default;
  }
  .cell.wrong {
    border-color: var(--bad);
    background: var(--bad-soft);
    color: var(--bad);
  }
  .cell.hint {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
</style>
