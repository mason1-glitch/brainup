<script lang="ts">
  // Interaktives Tutorial: erst eine feste 1-Back-Folge mit Hilfe, dann eine zufällige ohne.
  import { flushSync, onDestroy, onMount } from 'svelte';
  import { timing, type Handle } from '../../core/timing';
  import type { TutorialProps } from '../types';
  import Board from './Board.svelte';
  import { makeBlock, ON_MS, type Stimulus } from './logic';

  let { onDone }: TutorialProps = $props();

  const STEPS = 2;
  /** Schritt 1: Treffer an der 3. und 6. Stelle. */
  const FIXED = [4, 0, 0, 7, 2, 2];
  /** Abstand von Feld zu Feld (Beginn zu Beginn) in ms. */
  const SOA_MS = 2200;
  /** Ruhe vor dem ersten Feld einer Folge. */
  const LEAD_MS = 1200;
  const HELP = 'Dasselbe Feld wie eben – tippe auf Treffer';

  const fixedSequence = (): Stimulus[] =>
    FIXED.map((position, i) => {
      const back = i >= 1 ? FIXED[i - 1]! : null;
      return { position, back, target: back !== null && back === position };
    });

  let stepIndex = $state(0);
  /** Laufende Nummer des aktuellen Felds (für den Bot); zählt über beide Schritte weiter. */
  let counter = $state(0);
  let lit = $state<number | null>(null);
  let target = $state<boolean | null>(null);
  let pressed = $state<'good' | 'bad' | null>(null);
  let note = $state('');
  let tone = $state<'plain' | 'good' | 'bad'>('plain');

  interface Live {
    scored: boolean;
    target: boolean;
    pressed: boolean;
  }
  let live: Live | null = null;
  /** Schließt das Antwortfenster und liefert, was bis dahin getippt wurde. */
  function closeWindow(): Live | null {
    const answer = live;
    live = null;
    return answer;
  }
  let pending: Handle<unknown> | null = null;
  /** Zählt jeden neuen Ablauf: Ein überholter Ablauf hört nach dem nächsten Warten auf. */
  let generation = 0;

  function hold<T>(h: Handle<T>): Promise<T> {
    pending = h;
    return h.done;
  }

  async function play() {
    const gen = ++generation;
    const first = stepIndex === 0;
    const sequence = first ? fixedSequence() : makeBlock(Math.random, 1, 7);
    const onMs = timing.quantize(ON_MS);
    const soaMs = timing.quantize(SOA_MS);
    lit = null;
    target = null;
    pressed = null;
    note = '';
    tone = 'plain';
    live = null;
    let missed = false;
    let falseAlarm = false;

    await hold(timing.wait(LEAD_MS));
    for (const stimulus of sequence) {
      if (gen !== generation) return;
      const scored = stimulus.back !== null;
      const shown = await hold(
        timing.present(
          onMs,
          () => {
            live = { scored, target: stimulus.target, pressed: false };
            lit = stimulus.position;
            counter++;
            target = scored ? stimulus.target : null;
            pressed = null;
            note = first && stimulus.target ? HELP : '';
            tone = 'plain';
            flushSync();
          },
          () => {
            lit = null;
            flushSync();
          },
        ),
      );
      if (gen !== generation) return;
      await hold(timing.wait(soaMs - shown.plannedMs));
      if (gen !== generation) return;
      const answer = closeWindow();
      if (!answer || !scored) continue;
      const miss = answer.target && !answer.pressed;
      const alarm = !answer.target && answer.pressed;
      if (first && (miss || alarm)) {
        // Im ersten Schritt gibt es keinen Fehler zu übersehen: sofort erklären und von vorn.
        tone = 'bad';
        note = miss ? 'Das war ein Treffer – gleich noch einmal von vorn.' : 'Das Feld war ein anderes – gleich noch einmal von vorn.';
        await hold(timing.wait(1500));
        if (gen !== generation) return;
        return void play();
      }
      missed ||= miss;
      falseAlarm ||= alarm;
    }
    if (gen !== generation) return;

    if (first) {
      stepIndex = 1;
      return void play();
    }
    const ok = !missed && !falseAlarm;
    tone = ok ? 'good' : 'bad';
    note = ok ? 'Genau so.' : 'Nicht ganz – noch eine Runde.';
    await hold(timing.wait(ok ? 900 : 1500));
    if (gen !== generation) return;
    if (ok) onDone();
    else void play();
  }

  function press() {
    if (!live || live.pressed) return;
    live.pressed = true;
    // Vor dem ersten Vergleich gibt es nichts zu treffen.
    if (!live.scored) return;
    pressed = live.target ? 'good' : 'bad';
    tone = live.target ? 'good' : 'bad';
    note = live.target ? 'Treffer' : 'Kein Treffer';
  }

  onMount(() => void play());
  onDestroy(() => {
    generation++;
    pending?.cancel();
  });
</script>

<div class="tutorial">
  <div class="text">
    <p class="label">Schritt {stepIndex + 1} von {STEPS}</p>
    {#if stepIndex === 0}
      <h2>Dasselbe Feld wie eben?</h2>
      <p class="muted">Ein Feld nach dem anderen leuchtet auf. Tippe auf Treffer, wenn es dasselbe ist wie das davor.</p>
    {:else}
      <h2>Jetzt ohne Hilfe</h2>
      <p class="muted">Im Spiel steigt n: Dann zählt das Feld vor zwei oder drei Schritten.</p>
    {/if}
  </div>
  <Board n={1} {lit} step={counter} {target} {pressed} {note} {tone} onPress={press} />
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
