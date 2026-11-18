<script lang="ts">
  import { flushSync, untrack } from 'svelte';
  import { updateStaircase } from '../../core/staircase';
  import { timing, type Handle } from '../../core/timing';
  import type { RunProps } from '../types';
  import { signal } from '../../ui/feedback';
  import Board from './Board.svelte';
  import { advance, expected, judge, kindOf, makeTrial, STAIRCASE, type CorsiState, type CorsiTrial } from './logic';

  let { state: initial, mode, paused, onTrial, onProgress, onFinish }: RunProps<CorsiState> = $props();

  /** Ruhe vor dem ersten Feld einer Folge. */
  const LEAD_MS = 600;

  // svelte-ignore state_referenced_locally
  const total = 'trials' in mode.budget ? mode.budget.trials : 10;
  // svelte-ignore state_referenced_locally
  let current: CorsiState = initial;
  let done = 0;

  let trial = $state.raw<CorsiTrial | null>(null);
  let lit = $state<number | null>(null);
  let open = $state(false);
  let tapped = $state.raw<number[]>([]);
  let wrong = $state<number | null>(null);
  let reveal = $state<number | null>(null);
  let note = $state('');
  let tone = $state<'plain' | 'good' | 'bad'>('plain');

  /** Soll/Ist jeder Darbietung dieser Folge (Rohdaten). */
  let shown: { plannedMs: number; actualMs: number; frames: number }[] = [];
  let times: number[] = [];
  let onset: number | null = null;
  let startedAt = 0;
  let pending: Handle<unknown> | null = null;
  /** Zählt jede neue Folge und jede Pause: Ein überholter Ablauf hört nach dem nächsten Warten auf. */
  let generation = 0;

  function hold<T>(h: Handle<T>): Promise<T> {
    pending = h;
    return h.done;
  }

  async function play() {
    if (paused) return;
    if (done >= total) return onFinish(advance(current));
    const gen = ++generation;
    const t = makeTrial(Math.random, current, timing.quantize);
    trial = t;
    lit = null;
    open = false;
    tapped = [];
    wrong = null;
    reveal = null;
    tone = 'plain';
    note = t.backward ? 'Merken – gleich rückwärts' : 'Merken';
    shown = [];
    times = [];
    onset = null;
    onProgress(done / total, `${done} / ${total} · ${t.length} Felder`);

    await hold(timing.wait(LEAD_MS));
    for (const [i, cell] of t.sequence.entries()) {
      if (gen !== generation) return;
      const p = await hold(
        timing.present(
          t.onMs,
          () => {
            lit = cell;
            flushSync();
            if (i === 0) startedAt = Date.now();
          },
          () => {
            lit = null;
            flushSync();
          },
        ),
      );
      if (gen !== generation) return;
      shown.push({ plannedMs: p.plannedMs, actualMs: p.actualMs, frames: p.frames });
      await hold(timing.wait(t.gapMs));
    }
    if (gen !== generation) return;
    const start = await hold(
      timing.onset(() => {
        open = true;
        note = t.backward ? 'Jetzt du – rückwärts' : 'Jetzt du';
        flushSync();
      }),
    );
    if (gen === generation) onset = start;
  }

  function tap(cell: number, event: { timeStamp: number }) {
    if (!trial || !open || onset === null || paused) return;
    const t = timing.rt(event, onset);
    tapped = [...tapped, cell];
    times.push(t);
    const verdict = judge(trial, tapped);
    if (verdict === 'open') return;

    const correct = verdict === 'correct';
    onTrial({
      kind: kindOf(trial.stage),
      ts: startedAt,
      // Soll/Ist der Darbietung gehören zu den Rohdaten (Timing-Auswertung).
      task: { ...trial, shown },
      response: { taps: tapped.map((c, i) => ({ cell: c, t: times[i]! })) },
      rtMs: t,
      correct,
      difficulty: trial.length,
    });
    current = { ...current, stair: updateStaircase(STAIRCASE, current.stair, correct) };
    done++;
    onProgress(done / total, `${done} / ${total} · ${trial.length} Felder`);
    signal(correct);
    open = false;
    tone = correct ? 'good' : 'bad';
    note = correct ? 'Richtig' : 'Das grüne Feld wäre dran gewesen';
    if (!correct) {
      wrong = cell;
      reveal = expected(trial)[tapped.length - 1]!;
    }
    // Nach Fehlern bleibt die Auflösung länger stehen.
    void hold(timing.wait(correct ? 600 : 1500)).then(play);
  }

  // Pause: laufende Folge verwerfen; danach eine neue.
  $effect(() => {
    if (paused) {
      generation++;
      pending?.cancel();
      pending = null;
      untrack(() => {
        trial = null;
        lit = null;
        open = false;
        onset = null;
      });
    } else {
      untrack(() => void play());
    }
    return () => {
      generation++;
      pending?.cancel();
    };
  });
</script>

{#if trial}
  <Board {lit} {open} {tapped} {wrong} {reveal} target={open ? (expected(trial)[tapped.length] ?? null) : null} {note} {tone} onTap={tap} />
{/if}
