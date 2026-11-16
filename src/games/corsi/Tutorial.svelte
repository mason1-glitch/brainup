<script lang="ts">
  // Interaktives Tutorial: erst eine kurze Folge mit Hilfe, dann eine längere ohne.
  import { flushSync, onDestroy } from 'svelte';
  import { initStaircase } from '../../core/staircase';
  import { timing, type Handle } from '../../core/timing';
  import type { TutorialProps } from '../types';
  import Board from './Board.svelte';
  import { expected, judge, makeTrial, STAIRCASE, type CorsiTrial } from './logic';

  let { onDone }: TutorialProps = $props();

  /** Länge der Folge je Schritt. */
  const LENGTHS = [2, 3];
  /** Ruhe vor dem ersten Feld. */
  const LEAD_MS = 600;

  const newTrial = (n: number): CorsiTrial =>
    makeTrial(Math.random, { stage: 1, stair: { ...initStaircase(STAIRCASE), value: n } }, timing.quantize);

  let step = $state(0);
  const first = newTrial(LENGTHS[0]!);
  let trial = $state.raw<CorsiTrial>(first);
  let lit = $state<number | null>(null);
  let open = $state(false);
  let tapped = $state.raw<number[]>([]);
  let wrong = $state<number | null>(null);
  let reveal = $state<number | null>(null);
  let note = $state('');
  let tone = $state<'plain' | 'good' | 'bad'>('plain');
  /** Rückmeldung nach einem Fehltipp. */
  let missed = $state('');

  let onset: number | null = null;
  let pending: Handle<unknown> | null = null;
  /** Zählt jede Wiedergabe: Ein überholter Ablauf hört nach dem nächsten Warten auf. */
  let generation = 0;

  function hold<T>(h: Handle<T>): Promise<T> {
    pending = h;
    return h.done;
  }

  /** Spielt die Folge ab und öffnet danach die Eingabe. */
  async function play(t: CorsiTrial) {
    const gen = ++generation;
    lit = null;
    open = false;
    tapped = [];
    wrong = null;
    reveal = null;
    tone = 'plain';
    note = 'Merken';
    onset = null;
    await hold(timing.wait(LEAD_MS));
    for (const cell of t.sequence) {
      if (gen !== generation) return;
      await hold(
        timing.present(
          t.onMs,
          () => {
            lit = cell;
            flushSync();
          },
          () => {
            lit = null;
            flushSync();
          },
        ),
      );
      if (gen !== generation) return;
      await hold(timing.wait(t.gapMs));
    }
    if (gen !== generation) return;
    const start = await hold(
      timing.onset(() => {
        open = true;
        note = 'Jetzt du';
        flushSync();
      }),
    );
    if (gen === generation) onset = start;
  }

  function tap(cell: number) {
    if (!open || onset === null) return;
    tapped = [...tapped, cell];
    const verdict = judge(trial, tapped);
    if (verdict === 'open') return;
    open = false;
    if (verdict === 'wrong') {
      wrong = cell;
      reveal = expected(trial)[tapped.length - 1]!;
      tone = 'bad';
      note = 'Das grüne Feld wäre dran gewesen';
      missed = 'Nicht ganz – schau noch einmal zu.';
      void hold(timing.wait(1500)).then(() => play(trial));
      return;
    }
    missed = '';
    tone = 'good';
    note = 'Richtig';
    void hold(timing.wait(700)).then(() => {
      if (step + 1 >= LENGTHS.length) return onDone();
      step++;
      trial = newTrial(LENGTHS[step]!);
      void play(trial);
    });
  }

  void play(first);
  onDestroy(() => {
    generation++;
    pending?.cancel();
  });
</script>

<div class="tutorial">
  <div class="text">
    <p class="label">Schritt {step + 1} von {LENGTHS.length}</p>
    {#if step === 0}
      <h2>Merken</h2>
    {:else}
      <h2>Jetzt ohne Hilfe</h2>
    {/if}
    <p class="muted" class:warn={missed !== ''} aria-live="polite">
      {#if missed}
        {missed}
      {:else if step === 0}
        Schau zu, welche Felder aufleuchten, und tippe sie danach in derselben Reihenfolge an. Das nächste ist markiert.
      {:else}
        Diesmal sind es drei Felder – ohne Markierung.
      {/if}
    </p>
  </div>
  <Board
    {lit}
    {open}
    {tapped}
    {wrong}
    {reveal}
    target={open ? (expected(trial)[tapped.length] ?? null) : null}
    hint={step === 0}
    {note}
    {tone}
    onTap={tap}
  />
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
  .warn {
    color: var(--bad);
  }
</style>
