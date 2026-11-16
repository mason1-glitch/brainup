<script lang="ts">
  // Ein Durchgang des Wechselspiels: Karte mit Frage und Zahl, darunter zwei Tasten,
  // die je nach Regel anders heißen. Von Lauf und Tutorial genutzt.
  import { e2e } from '../e2e';
  import { answerOf, LABELS, QUESTIONS, type Side, type SwitchTrial } from './logic';

  interface Props {
    trial: Pick<SwitchTrial, 'rule' | 'digit'>;
    /** Erst true, wenn die Timing-Engine die Karte zeigt. */
    visible: boolean;
    /** Nach der Antwort: welche Taste gedrückt wurde (null = keine, Zeit abgelaufen). */
    chosen?: Side | null;
    /** true, sobald der Durchgang entschieden ist (Rückmeldung). */
    settled?: boolean;
    note?: string;
    onAnswer: (side: Side, event: { timeStamp: number }) => void;
  }

  let { trial, visible, chosen = null, settled = false, note = '', onAnswer }: Props = $props();

  const correct = $derived(answerOf(trial));
  const sides: Side[] = ['left', 'right'];

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') onAnswer('left', e);
    else if (e.key === 'ArrowRight') onAnswer('right', e);
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="board" data-phase={settled ? 'feedback' : visible ? 'respond' : 'wait'}>
  <div class="stage">
    <div class="card" class:shown={visible} data-rule={trial.rule}>
      <p class="question">{QUESTIONS[trial.rule]}</p>
      <p class="digit num">{trial.digit}</p>
    </div>
    <p class="note" aria-live="polite">{note}</p>
  </div>
  <div class="keys">
    {#each sides as side (side)}
      <button
        type="button"
        class="key"
        class:good={settled && chosen !== null && side === correct}
        class:bad={settled && chosen === side && side !== correct}
        data-correct={e2e && visible && !settled ? side === correct : undefined}
        disabled={settled}
        onpointerdown={(e) => onAnswer(side, e)}
      >
        <!-- Die Tasten heißen erst mit der Karte nach ihrer Regel: vorher gibt es nichts zu entscheiden. -->
        {visible ? LABELS[trial.rule][side] : ''}
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
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--s-4);
  }
  .card {
    display: grid;
    justify-items: center;
    gap: var(--s-2);
    width: min(100%, 6 * var(--tap));
    padding: var(--s-5);
    border-radius: var(--r-lg);
    background: var(--surface);
    box-shadow: var(--shadow);
    visibility: hidden;
  }
  .card.shown {
    visibility: visible;
  }
  .question {
    color: var(--ink-2);
    font-size: var(--text-md);
    font-weight: var(--weight-medium);
    text-align: center;
  }
  /* Zweites Merkmal neben dem Text: Die Größer/Kleiner-Karte trägt die Akzentfarbe. */
  .card[data-rule='size'] .question {
    color: var(--accent);
  }
  .digit {
    font-family: var(--font-display);
    font-size: var(--text-3xl);
    font-weight: var(--weight-bold);
    line-height: 1;
  }
  .note {
    min-height: 1.5em;
    text-align: center;
    color: var(--bad);
    font-weight: var(--weight-bold);
  }
  .keys {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--s-3);
  }
  .key {
    height: calc(2.5 * var(--tap));
    border: 2px solid transparent;
    border-radius: var(--r-lg);
    background: var(--surface);
    box-shadow: var(--shadow);
    color: var(--ink);
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    cursor: pointer;
    touch-action: manipulation;
    transition:
      border-color var(--dur-fast) var(--ease),
      background-color var(--dur-fast) var(--ease);
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
