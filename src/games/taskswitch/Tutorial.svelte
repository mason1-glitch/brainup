<script lang="ts">
  // Interaktives Tutorial: eine Regel, die andere Regel, dann vier Karten im Wechsel unter Zeitlimit.
  import { flushSync, onDestroy } from 'svelte';
  import { pick } from '../../core/rng';
  import { timing, type Handle } from '../../core/timing';
  import type { TutorialProps } from '../types';
  import Board from './Board.svelte';
  import { DIGITS, isCorrect, type Rule, type Side, type SwitchTrial } from './logic';

  let { onDone }: TutorialProps = $props();

  type Card = Pick<SwitchTrial, 'rule' | 'digit'>;
  const STEPS = 3;
  /** Schritt 3: Die Regel wechselt bei jeder Karte. */
  const RULES: readonly Rule[] = ['size', 'parity', 'size', 'parity'];
  const LIMIT_MS = 3000;

  let step = $state(0);
  let trial = $state.raw<Card>({ rule: 'parity', digit: 7 });
  let visible = $state(true);
  let settled = $state(false);
  let chosen = $state<Side | null>(null);
  let note = $state('');
  /** Welche Karte in Schritt 3 dran ist. */
  let index = 0;
  let pending: Handle<unknown> | null = null;
  onDestroy(() => pending?.cancel());

  function reset() {
    settled = false;
    chosen = null;
    note = '';
  }

  /** Schritt 3: Karte nach kurzer Wartezeit für höchstens `LIMIT_MS` zeigen. */
  function card() {
    const t: Card = { rule: RULES[index]!, digit: pick(Math.random, DIGITS) };
    trial = t;
    visible = false;
    reset();
    const fore = timing.wait(600);
    pending = fore;
    void fore.done.then(() => {
      const shown = timing.present(
        timing.quantize(LIMIT_MS),
        () => {
          visible = true;
          flushSync();
        },
        () => {
          visible = false;
          flushSync();
        },
      );
      pending = shown;
      void shown.done.then(() => {
        if (trial === t && !settled) settle(null);
      });
    });
  }

  function settle(side: Side | null) {
    settled = true;
    chosen = side;
    const ok = side !== null && isCorrect(trial, side);
    note = ok ? '' : side === null ? 'Zu spät – gleich noch einmal.' : 'Nicht ganz – lies die Frage auf der Karte.';
    const h = timing.wait(ok ? 600 : 1500);
    pending = h;
    void h.done.then(() => (ok ? advance() : retry()));
  }

  function advance() {
    if (step === 0) {
      step = 1;
      trial = { rule: 'size', digit: 3 };
      reset();
    } else if (step === 1) {
      step = 2;
      index = 0;
      card();
    } else if (++index >= RULES.length) {
      onDone();
    } else {
      card();
    }
  }

  function retry() {
    if (step < 2) reset();
    else card();
  }

  function answer(side: Side) {
    if (settled || !visible) return;
    pending?.cancel();
    settle(side);
  }
</script>

<div class="tutorial">
  <div class="text">
    <p class="label">Schritt {step + 1} von {STEPS}</p>
    {#if step === 0}
      <h2>Gerade oder ungerade?</h2>
      <p class="muted">Die Karte stellt eine Frage zur Zahl. Antworte mit den Tasten unten.</p>
    {:else if step === 1}
      <h2>Kleiner oder größer als 5?</h2>
      <p class="muted">Dieselben Zahlen, andere Frage – die Tasten heißen jetzt anders.</p>
    {:else}
      <h2>Im Wechsel</h2>
      <p class="muted">Jetzt wechselt die Frage. Achte auf die Karte.</p>
    {/if}
  </div>
  <Board {trial} {visible} {chosen} {settled} {note} onAnswer={answer} />
</div>

<style>
  .tutorial {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
  }
  .text {
    display: grid;
    gap: var(--s-2);
    min-height: 7.5rem;
  }
</style>
