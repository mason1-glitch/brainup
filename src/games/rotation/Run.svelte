<script lang="ts">
  import { flushSync, untrack } from 'svelte';
  import { updateStaircase } from '../../core/staircase';
  import { timing } from '../../core/timing';
  import type { RunProps } from '../types';
  import Board from './Board.svelte';
  import { levelOf, makeTrial, STAIRCASE, type RotationState, type RotationTrial } from './logic';

  let { state: initial, mode, paused, onTrial, onProgress, onFinish }: RunProps<RotationState> = $props();

  // svelte-ignore state_referenced_locally
  const total = 'trials' in mode.budget ? mode.budget.trials : 20;
  // svelte-ignore state_referenced_locally
  let stair = initial.stair;
  let done = 0;

  let trial = $state.raw<RotationTrial | null>(null);
  let visible = $state(false);
  let chosen = $state<0 | 1 | null>(null);
  let onset: number | null = null;
  let startedAt = 0;
  let pending: { cancel: () => void } | null = null;

  function next() {
    if (done >= total) return onFinish({ stair });
    chosen = null;
    visible = false;
    onset = null;
    trial = makeTrial(Math.random, levelOf({ stair }));
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

  function answer(index: 0 | 1, event: { timeStamp: number }) {
    if (!trial || onset === null || chosen !== null || paused) return;
    const correct = index === trial.correct;
    onTrial({
      kind: '',
      ts: startedAt,
      task: { cells: trial.cells, ref: trial.ref, options: trial.options, angles: trial.angles, correct: trial.correct },
      response: index,
      rtMs: timing.rt(event, onset),
      correct,
      difficulty: trial.level,
    });
    stair = updateStaircase(STAIRCASE, stair, correct);
    done++;
    onProgress(done / total, `${done} / ${total}`);
    chosen = index;
    // Nach Fehlern bleibt die Auflösung länger stehen.
    const h = timing.wait(correct ? 400 : 1400);
    pending = h;
    void h.done.then(next);
  }

  // Pause: laufenden Durchgang verwerfen; danach mit einer neuen Figur weiter.
  $effect(() => {
    if (paused) {
      pending?.cancel();
      pending = null;
      untrack(() => {
        trial = null;
        onset = null;
      });
    } else {
      untrack(next);
    }
    return () => pending?.cancel();
  });
</script>

{#if trial}
  <Board {trial} {visible} {chosen} onAnswer={answer} />
{/if}
