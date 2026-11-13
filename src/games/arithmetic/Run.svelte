<script lang="ts">
  // Sprint: so viele Aufgaben wie möglich in der Zeit des Modus, Rechentypen gemischt.
  import { flushSync, untrack } from 'svelte';
  import { timing, type Handle } from '../../core/timing';
  import { repo } from '../../data/repo';
  import type { RunProps } from '../types';
  import { check, nextTask, type Kind, type Task } from './generators';
  import { applyAnswer, levelOfKind, outcomeOf, pickKind, pointsFor, toRecord, type ArithmeticState } from './logic';
  import { recordReview } from './reviews';
  import TaskPad from './TaskPad.svelte';

  let { state: initial, mode, paused, onTrial, onProgress, onFinish }: RunProps<ArithmeticState> = $props();

  // svelte-ignore state_referenced_locally
  const totalMs = ('seconds' in mode.budget ? mode.budget.seconds : 60) * 1000;
  // svelte-ignore state_referenced_locally
  let current: ArithmeticState = initial;
  let elapsed = 0;
  let score = 0;

  let task = $state.raw<Task | null>(null);
  let count = $state(0);
  let visible = $state(false);
  let feedback = $state<'good' | 'bad' | null>(null);
  let onset: number | null = null;
  let startedAt = 0;
  let pending: Handle<unknown> | null = null;
  let previous: { kind?: Kind; key?: string } = {};

  function next() {
    const kind = pickKind(Math.random, previous.kind);
    task = nextTask(Math.random, kind, levelOfKind(current, kind), previous.key);
    previous = { kind, key: task.key };
    feedback = null;
    visible = false;
    onset = null;
    count++;
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

  function submit(input: string, timeStamp: number) {
    if (!task || onset === null || feedback !== null || paused) return;
    const correct = check(task, input);
    const rtMs = timeStamp - onset;
    onTrial({ kind: task.kind, ts: startedAt, task: toRecord(task), response: input, rtMs, correct, difficulty: task.level });
    if (correct) score += pointsFor(task.level);
    const outcome = outcomeOf(task, correct, rtMs);
    current = applyAnswer(current, task, outcome);
    void recordReview(repo, task, outcome);
    feedback = correct ? 'good' : 'bad';
    // Die Uhr läuft weiter: Fehler kosten Zeit, Raten lohnt nicht.
    const h = timing.wait(correct ? 250 : 1200);
    pending = h;
    void h.done.then(next);
  }

  // Uhr und Pause. Bei Pause steht die Uhr; die offene Aufgabe wird verworfen.
  $effect(() => {
    if (paused) {
      untrack(() => (task = null));
      return;
    }
    untrack(next);
    let last: number | null = null;
    let frame = requestAnimationFrame(function tick(t) {
      if (last !== null) elapsed += t - last;
      last = t;
      const left = Math.max(0, totalMs - elapsed);
      // Punkte laufen sichtbar mit – im Sprint zählt jede Aufgabe.
      onProgress(elapsed / totalMs, `${score} P · ${Math.ceil(left / 1000)} s`);
      if (left <= 0) {
        pending?.cancel();
        onFinish(current);
        return;
      }
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
      pending?.cancel();
    };
  });
</script>

{#if task}
  {#key count}
    <TaskPad {task} {visible} {feedback} onSubmit={submit} />
  {/key}
{/if}
