<script lang="ts">
  // Das Feld des N-Back: 3×3-Raster, darüber die Regel, darunter die Taste „Treffer“.
  // Von Lauf und Tutorial genutzt.
  import { e2e } from '../e2e';
  import { POSITIONS } from './logic';

  interface Props {
    n: number;
    /** Feld, das gerade aufleuchtet. */
    lit?: number | null;
    /** Laufende Nummer des aktuellen Felds (für den Bot); 0 = noch keins. */
    step?: number;
    /** Ob das aktuelle Feld ein Treffer ist – nur für den Bot; null = Feld ohne Wertung. */
    target?: boolean | null;
    /** Rückmeldung zur Taste: gedrückt und richtig bzw. falsch. */
    pressed?: 'good' | 'bad' | null;
    note?: string;
    tone?: 'plain' | 'good' | 'bad';
    onPress: (event: { timeStamp: number }) => void;
  }

  let { n, lit = null, step = 0, target = null, pressed = null, note = '', tone = 'plain', onPress }: Props = $props();

  const rule = $derived(n === 1 ? 'Treffer, wenn das Feld dasselbe ist wie das davor' : `Treffer, wenn das Feld dasselbe ist wie vor ${n} Schritten`);

  function onKeydown(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onPress(e);
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="board" data-step={step}>
  <div class="head">
    <p class="mode num">{n}-Back</p>
    <p class="muted rule">{rule}</p>
  </div>
  <div class="fit">
    <div class="grid" role="img" aria-label="Raster mit neun Feldern">
      {#each { length: POSITIONS }, cell (cell)}
        <span class="cell" class:lit={lit === cell}></span>
      {/each}
    </div>
  </div>
  <p class="note {tone}" aria-live="polite">{note}</p>
  <button
    type="button"
    class="key"
    class:good={pressed === 'good'}
    class:bad={pressed === 'bad'}
    data-correct={e2e && target !== null ? target : undefined}
    onpointerdown={onPress}
  >
    Treffer
  </button>
</div>

<style>
  .board {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    padding: var(--s-4);
  }
  .head {
    display: grid;
    gap: var(--s-1);
    text-align: center;
  }
  .mode {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
  }
  .rule {
    font-size: var(--text-sm);
  }
  /* Das Raster füllt den freien Platz und bleibt quadratisch. */
  .fit {
    flex: 1;
    min-height: 0;
    container-type: size;
    display: grid;
    place-items: center;
  }
  .grid {
    width: min(100cqw, 100cqh, 6 * var(--tap));
    aspect-ratio: 1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--s-3);
  }
  .cell {
    border-radius: var(--r-md);
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  /* Aufleuchten ohne Übergang: Die Dauer bestimmt allein die Timing-Engine. */
  .cell.lit {
    background: var(--accent);
  }
  .note {
    min-height: 1.5em;
    text-align: center;
    color: var(--ink-2);
  }
  .note.good {
    color: var(--good);
    font-weight: var(--weight-bold);
  }
  .note.bad {
    color: var(--bad);
    font-weight: var(--weight-bold);
  }
  .key {
    height: calc(2 * var(--tap));
    border: 2px solid transparent;
    border-radius: var(--r-lg);
    background: var(--accent);
    color: var(--on-accent);
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    cursor: pointer;
    touch-action: manipulation;
    transition:
      border-color var(--dur-fast) var(--ease),
      background-color var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease);
  }
  .key.good {
    border-color: var(--good);
    background: var(--good-soft);
    color: var(--good);
  }
  .key.bad {
    border-color: var(--bad);
    background: var(--bad-soft);
    color: var(--bad);
  }
</style>
