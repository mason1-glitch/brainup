<script lang="ts">
  import { flushSync, untrack } from 'svelte';
  import { updateStaircase } from '../../core/staircase';
  import { timing, type Handle } from '../../core/timing';
  import type { RunProps } from '../types';
  import { signal } from '../../ui/feedback';
  import Board from './Board.svelte';
  import { kindOf, levelOf, makeTrial, nextTarget, parMs, seconds, STAIRCASE, type SchulteState, type SchulteTrial, type Tap } from './logic';

  let { state: initial, mode, paused, onTrial, onProgress, onFinish }: RunProps<SchulteState> = $props();

  // svelte-ignore state_referenced_locally
  const total = 'trials' in mode.budget ? mode.budget.trials : 3;
  // svelte-ignore state_referenced_locally
  let stair = initial.stair;
  let done = 0;

  let trial = $state.raw<SchulteTrial | null>(null);
  let visible = $state(false);
  let found = $state(0);
  let wrong = $state<number | null>(null);
  let note = $state('');
  let good = $state(false);
  let taps: Tap[] = [];
  let onset: number | null = null;
  let startedAt = 0;
  let pending: { cancel: () => void } | null = null;
  let flash: Handle<void> | null = null;

  // Die Zielzeit steht sichtbar im Rahmen: Um sie wird gespielt.
  const label = (board: number, t: SchulteTrial) => `Tafel ${board} / ${total} · Ziel ${Math.round(parMs(t) / 1000)} s`;

  function next() {
    if (done >= total) return onFinish({ stair });
    taps = [];
    found = 0;
    wrong = null;
    note = '';
    good = false;
    visible = false;
    onset = null;
    trial = makeTrial(Math.random, levelOf({ stair }));
    onProgress(done / total, label(done + 1, trial));
    const h = timing.onset(() => {
      visible = true;
      flushSync();
    });
    pending = h;
    void h.done.then((t) => {
      onset = t;
      startedAt = Date.now();
    });
  }

  function tap(n: number, event: { timeStamp: number }) {
    if (!trial || onset === null || paused) return;
    const target = nextTarget(trial, found);
    if (target === null) return;
    const t = timing.rt(event, onset);
    taps.push({ n, t });
    flash?.cancel();
    if (n !== target) {
      // Fehltipp: kurz rot, und die gesuchte Zahl steht oben, bis sie gefunden ist.
      wrong = n;
      signal(false);
      note = `Gesucht: ${target}`;
      flash = timing.wait(350);
      void flash.done.then(() => (wrong = null));
      return;
    }
    wrong = null;
    note = '';
    found++;
    if (nextTarget(trial, found) !== null) return;

    const par = parMs(trial);
    const passed = t <= par;
    onTrial({ kind: kindOf(trial), ts: startedAt, task: trial, response: { taps }, rtMs: t, correct: passed, difficulty: trial.level });
    stair = updateStaircase(STAIRCASE, stair, passed);
    done++;
    onProgress(done / total, label(done, trial));
    good = passed;
    if (passed) signal(true);
    note = `${seconds(t)} · Zielzeit ${seconds(par)}`;
    const h = timing.wait(1600);
    pending = h;
    void h.done.then(next);
  }

  // Pause: laufende Tafel verwerfen; danach eine neue.
  $effect(() => {
    if (paused) {
      pending?.cancel();
      flash?.cancel();
      pending = null;
      untrack(() => {
        trial = null;
        onset = null;
      });
    } else {
      untrack(next);
    }
    return () => {
      pending?.cancel();
      flash?.cancel();
    };
  });
</script>

{#if trial}
  <Board {trial} {visible} {found} {wrong} {note} {good} onTap={tap} />
{/if}
