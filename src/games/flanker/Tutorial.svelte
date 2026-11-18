<script lang="ts">
  // Interaktives Tutorial: erst eine stimmige, dann eine widersprüchliche Reihe ohne Zeitdruck, zuletzt auf Zeit.
  import { flushSync, onDestroy } from 'svelte';
  import { timing, type Handle } from '../../core/timing';
  import type { TutorialProps } from '../types';
  import Board from './Board.svelte';
  import { isCorrect, type Direction, type FlankerTrial } from './logic';

  let { onDone }: TutorialProps = $props();

  type Row = Pick<FlankerTrial, 'target' | 'congruent'>;

  /** Antwortfenster im letzten Schritt (wie am Anfang eines Laufs) und Wartezeit davor. */
  const WINDOW_MS = 1500;
  const FORE_MS = 600;
  const STEPS = 3;

  const rowFor = (step: number): Row => {
    if (step === 0) return { target: 'right', congruent: true };
    if (step === 1) return { target: 'left', congruent: false };
    return { target: Math.random() < 0.5 ? 'left' : 'right', congruent: false };
  };

  let step = $state(0);
  let trial = $state.raw<Row>(rowFor(0));
  let visible = $state(false);
  let settled = $state(false);
  let chosen = $state<Direction | null>(null);
  let note = $state('');
  /** Rückmeldung nach einer richtigen Antwort. */
  let praise = $state('');
  let onset: number | null = null;
  let pending: Handle<unknown> | null = null;
  /** Zählt jeden Anlauf: Ein überholter Ablauf hört nach dem nächsten Warten auf. */
  let generation = 0;

  function hold<T>(h: Handle<T>): Promise<T> {
    pending = h;
    return h.done;
  }

  async function start() {
    const gen = ++generation;
    trial = rowFor(step);
    visible = false;
    settled = false;
    chosen = null;
    note = '';
    praise = '';
    onset = null;
    if (step < STEPS - 1) {
      // Ohne Zeitlimit: Die Reihe bleibt stehen, bis geantwortet wird.
      onset = await hold(
        timing.onset(() => {
          visible = true;
          flushSync();
        }),
      );
      return;
    }
    await hold(timing.wait(FORE_MS));
    if (gen !== generation) return;
    const t = trial;
    const shown = hold(
      timing.present(
        WINDOW_MS,
        (at) => {
          visible = true;
          onset = at;
          flushSync();
        },
        () => {
          visible = false;
          flushSync();
        },
      ),
    );
    await shown;
    if (gen === generation && trial === t && !settled) settle(null);
  }

  function answer(direction: Direction) {
    if (!visible || onset === null || settled) return;
    pending?.cancel();
    settle(direction);
  }

  function settle(direction: Direction | null) {
    settled = true;
    chosen = direction;
    const correct = isCorrect(trial, direction);
    if (!correct) {
      note = direction === null ? 'Zu spät – gleich noch einmal.' : 'Nicht ganz – nur der mittlere Pfeil zählt.';
      void hold(timing.wait(1200)).then(start);
      return;
    }
    praise = 'Richtig.';
    void hold(timing.wait(700)).then(() => {
      if (step + 1 >= STEPS) return onDone();
      step++;
      void start();
    });
  }

  void start();
  onDestroy(() => {
    generation++;
    pending?.cancel();
  });
</script>

<div class="tutorial">
  <div class="text">
    <p class="label">Schritt {step + 1} von {STEPS}</p>
    {#if step === 0}
      <h2>Der mittlere Pfeil</h2>
    {:else if step === 1}
      <h2>Ablenkung</h2>
    {:else}
      <h2>Jetzt auf Zeit</h2>
    {/if}
    <p class="muted" class:good={praise !== ''} aria-live="polite">
      {#if praise}
        {praise}
      {:else if step === 0}
        Wohin zeigt der mittlere Pfeil? Tippe auf die passende Taste.
      {:else if step === 1}
        Die äußeren Pfeile lenken ab. Nur der mittlere zählt.
      {:else}
        Die Reihe verschwindet nach kurzer Zeit wieder – antworte rechtzeitig.
      {/if}
    </p>
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
  .good {
    color: var(--good);
  }
</style>
