<script lang="ts">
  // Das Feld der Blockfolge: 4×4 Blöcke, darüber eine Zeile, die sagt, was gerade dran ist.
  // Von Lauf und Tutorial genutzt.
  import { e2e } from '../e2e';
  import { CELLS, COLS } from './logic';

  interface Props {
    /** Feld, das gerade aufleuchtet (Darbietung). */
    lit?: number | null;
    /** true, sobald getippt werden darf. */
    open: boolean;
    /** Schon angetippte Felder. */
    tapped?: readonly number[];
    /** Falsch angetipptes Feld (Auflösung). */
    wrong?: number | null;
    /** Feld, das stattdessen dran gewesen wäre (Auflösung). */
    reveal?: number | null;
    /** Nächstes richtiges Feld – nur für den Bot und als Hilfe im Tutorial. */
    target?: number | null;
    /** Das nächste richtige Feld sichtbar markieren (Tutorial). */
    hint?: boolean;
    note: string;
    tone?: 'plain' | 'good' | 'bad';
    onTap: (cell: number, event: { timeStamp: number }) => void;
  }

  let { lit = null, open, tapped = [], wrong = null, reveal = null, target = null, hint = false, note, tone = 'plain', onTap }: Props = $props();
</script>

<div class="board" data-phase={open ? 'respond' : lit === null ? 'idle' : 'show'}>
  <p class="note {tone}" aria-live="polite">{note}</p>
  <div class="fit">
    <div class="grid" style:--cols={COLS}>
      {#each { length: CELLS }, cell (cell)}
        <button
          type="button"
          class="cell"
          class:lit={lit === cell}
          class:tapped={tapped.includes(cell)}
          class:wrong={wrong === cell}
          class:reveal={reveal === cell}
          class:hint={hint && open && target === cell}
          aria-label="Feld {cell + 1}"
          data-cell={cell}
          data-correct={e2e && open ? cell === target : undefined}
          disabled={!open || tapped.includes(cell)}
          onpointerdown={(e) => onTap(cell, e)}
        ></button>
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
  .note.bad {
    color: var(--bad);
    font-weight: var(--weight-bold);
  }
  /* Das Feld füllt den freien Platz und bleibt quadratisch. */
  .fit {
    flex: 1;
    min-height: 0;
    container-type: size;
    display: grid;
    place-items: center;
  }
  .grid {
    width: min(100cqw, 100cqh, var(--cols) * 2 * var(--tap));
    aspect-ratio: 1;
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: var(--s-3);
  }
  .cell {
    min-width: 0;
    padding: 0;
    border: 2px solid transparent;
    border-radius: var(--r-md);
    background: var(--surface);
    box-shadow: var(--shadow);
    cursor: pointer;
    touch-action: manipulation;
  }
  .cell:disabled {
    cursor: default;
  }
  /* Aufleuchten ohne Übergang: Die Dauer bestimmt allein die Timing-Engine. */
  .cell.lit {
    background: var(--accent);
  }
  .cell.tapped {
    background: var(--accent-soft);
    border-color: var(--accent);
    box-shadow: none;
  }
  .cell.hint {
    border-color: var(--accent);
  }
  .cell.reveal {
    background: var(--good-soft);
    border-color: var(--good);
  }
  .cell.wrong {
    background: var(--bad-soft);
    border-color: var(--bad);
  }
</style>
