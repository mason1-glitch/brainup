<script lang="ts">
  import { flushSync, untrack } from 'svelte';
  import { updateStaircase } from '../../core/staircase';
  import { timing } from '../../core/timing';
  import type { RunProps } from '../types';
  import { signal } from '../../ui/feedback';
  import Board from './Board.svelte';
  import { levelOf, makeTrial, STAIRCASE, type SectionsState, type SectionsTrial } from './logic';

  let { state: initial, mode, paused, onTrial, onProgress, onFinish }: RunProps<SectionsState> = $props();

  // svelte-ignore state_referenced_locally
  const total = 'trials' in mode.budget ? mode.budget.trials : 12;
  // svelte-ignore state_referenced_locally
  let stair = initial.stair;
  let done = 0;

  let trial = $state.raw<SectionsTrial | null>(null);
  let visible = $state(false);
  let chosen = $state<number | null>(null);
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

  function answer(index: number, event: { timeStamp: number }) {
    if (!trial || onset === null || chosen !== null || paused) return;
    const correct = index === trial.correct;
    onTrial({
      kind: '',
      ts: startedAt,
      task: { solid: trial.solid, plane: trial.plane, yaw: trial.yaw, options: trial.options, correct: trial.correct },
      response: index,
      rtMs: timing.rt(event, onset),
      correct,
      difficulty: trial.level,
    });
    signal(correct);
    stair = updateStaircase(STAIRCASE, stair, correct);
    done++;
    onProgress(done / total, `${done} / ${total}`);
    chosen = index;
    // Nach Fehlern bleibt die Auflösung länger stehen.
    const h = timing.wait(correct ? 500 : 1800);
    pending = h;
    void h.done.then(next);
  }

  // Pause: laufenden Durchgang verwerfen; danach mit einer neuen Aufgabe weiter.
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
