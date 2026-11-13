<script lang="ts">
  import { untrack } from 'svelte';
  import { updateStaircase } from '../../core/staircase';
  import { timing } from '../../core/timing';
  import type { RunProps } from '../types';
  import { advance, kindOf, makeTrial, STAIRCASE, type UfovState, type UfovTrial } from './logic';
  import Round, { type RoundResult } from './Round.svelte';

  let { state: initial, mode, paused, onTrial, onProgress, onFinish }: RunProps<UfovState> = $props();

  // svelte-ignore state_referenced_locally
  const total = 'trials' in mode.budget ? mode.budget.trials : 30;
  // svelte-ignore state_referenced_locally
  let current: UfovState = initial;
  let done = 0;
  let trial = $state.raw<UfovTrial | null>(null);
  let round = $state(0);

  function next() {
    if (done >= total) return onFinish(advance(current));
    trial = makeTrial(Math.random, current, timing.quantize);
    // Die Darbietungszeit steht sichtbar im Rahmen: Um sie wird gespielt.
    onProgress(done / total, `${done} / ${total} · ${Math.round(trial.durationMs)} ms`);
    round++;
  }

  function finished(r: RoundResult) {
    if (!trial) return;
    onTrial({
      kind: kindOf(trial.stage),
      ts: r.ts,
      // Soll/Ist der Darbietung gehören zu den Rohdaten (Timing-Auswertung).
      task: { ...trial, actualMs: r.presentation.actualMs, frames: r.presentation.frames },
      response: r.response,
      rtMs: r.rtMs,
      correct: r.correct,
      difficulty: trial.durationMs,
    });
    current = { ...current, stair: updateStaircase(STAIRCASE, current.stair, r.correct) };
    done++;
    next();
  }

  // Pause: Durchgang verwerfen (Round wird entfernt und bricht ab), danach ein neuer.
  $effect(() => {
    if (paused) untrack(() => (trial = null));
    else untrack(next);
  });
</script>

<div class="run">
  {#if trial}
    {#key round}
      <Round {trial} onDone={finished} />
    {/key}
  {/if}
</div>

<style>
  .run {
    flex: 1;
    display: flex;
    padding: var(--s-4);
  }
</style>
