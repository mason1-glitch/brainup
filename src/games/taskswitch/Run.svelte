<script lang="ts">
  import { flushSync, untrack } from 'svelte';
  import { updateStaircase } from '../../core/staircase';
  import { timing, type Presentation } from '../../core/timing';
  import type { RunProps } from '../types';
  import Board from './Board.svelte';
  import { isCorrect, kindOf, makeTrial, STAIRCASE, type Rule, type Side, type SwitchState, type SwitchTrial } from './logic';

  let { state: initial, mode, paused, onTrial, onProgress, onFinish }: RunProps<SwitchState> = $props();

  // svelte-ignore state_referenced_locally
  const total = 'trials' in mode.budget ? mode.budget.trials : 40;
  // svelte-ignore state_referenced_locally
  let stair = initial.stair;
  let done = 0;
  /** Regel der zuletzt gezeigten Karte; null am Anfang und nach einer Pause. */
  let previous: Rule | null = null;

  let trial = $state.raw<SwitchTrial | null>(null);
  let visible = $state(false);
  let settled = $state(false);
  let chosen = $state<Side | null>(null);
  let note = $state('');
  let onset: number | null = null;
  let startedAt = 0;
  let pending: { cancel: () => void } | null = null;

  function next() {
    if (paused) return;
    if (done >= total) return onFinish({ stair });
    const t = makeTrial(Math.random, { stair }, previous, timing.quantize);
    trial = t;
    visible = false;
    settled = false;
    chosen = null;
    note = '';
    onset = null;
    // Das Antwortfenster steht sichtbar im Rahmen: Um es wird gespielt.
    onProgress(done / total, `${done} / ${total} · ${Math.round(t.windowMs)} ms`);
    const fore = timing.wait(t.foreMs);
    pending = fore;
    void fore.done.then(() => {
      if (paused || trial !== t) return;
      // Die Karte steht genau so lange wie das Antwortfenster; läuft es ab, zählt der Durchgang als verpasst.
      const shown = timing.present(
        t.windowMs,
        (at) => {
          visible = true;
          onset = at;
          startedAt = Date.now();
          flushSync();
        },
        () => {
          visible = false;
          flushSync();
        },
      );
      pending = shown;
      void shown.done.then((p) => {
        if (trial === t && !settled) finish(t, null, null, p);
      });
    });
  }

  function answer(side: Side, event: { timeStamp: number }) {
    if (!trial || onset === null || !visible || settled || paused) return;
    pending?.cancel();
    finish(trial, side, timing.rt(event, onset), null);
  }

  /** @param shown Soll/Ist der Darbietung – nur wenn sie bis zum Ende lief (keine Antwort) */
  function finish(t: SwitchTrial, response: Side | null, rtMs: number | null, shown: Presentation | null) {
    const correct = isCorrect(t, response);
    onTrial({
      kind: kindOf(t),
      ts: startedAt,
      task: shown ? { ...t, actualMs: shown.actualMs, frames: shown.frames } : t,
      response,
      rtMs,
      correct,
      difficulty: t.windowMs,
    });
    stair = updateStaircase(STAIRCASE, stair, correct);
    previous = t.rule;
    done++;
    onProgress(done / total, `${done} / ${total} · ${Math.round(t.windowMs)} ms`);
    settled = true;
    chosen = response;
    note = response === null ? 'Zu spät' : '';
    // Nach Fehlern bleibt die Rückmeldung länger stehen.
    const h = timing.wait(correct ? 250 : 900);
    pending = h;
    void h.done.then(next);
  }

  // Pause: laufenden Durchgang verwerfen; danach beginnt die Folge neu (kein Wechsel zur Karte vor der Pause).
  $effect(() => {
    if (paused) {
      pending?.cancel();
      pending = null;
      previous = null;
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
  <Board {trial} {visible} {chosen} {settled} {note} onAnswer={answer} />
{/if}
