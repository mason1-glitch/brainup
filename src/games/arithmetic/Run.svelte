<script lang="ts">
  // Ein Lauf in einem der drei Modi (ModeId in logic.ts):
  // sprint – so viele Aufgaben wie möglich in der Zeit des Modus, Rechentypen gemischt;
  // precision – feste Aufgabenzahl ohne Uhr; review – die fälligen Aufgaben der Wiederholungsliste.
  import { flushSync, untrack } from 'svelte';
  import { timing, type Handle } from '../../core/timing';
  import { repo } from '../../data/repo';
  import Button from '../../ui/Button.svelte';
  import type { RunProps } from '../types';
  import { check, KINDS, nextTask, type Kind, type Task } from './generators';
  import {
    activeKinds,
    applyAnswer,
    KINDS_SETTING,
    TRICKS_SETTING,
    levelOfKind,
    outcomeIn,
    pickKind,
    pointsFor,
    toRecord,
    type ArithmeticState,
    type ModeId,
  } from './logic';
  import { dueTasks, recordReview } from './reviews';
  import TaskPad from './TaskPad.svelte';
  import { trickFor } from './tricks';

  let { state: initial, mode, paused, onTrial, onProgress, onFinish }: RunProps<ArithmeticState> = $props();

  // svelte-ignore state_referenced_locally
  const modeId: ModeId = mode.id === 'precision' || mode.id === 'review' ? mode.id : 'sprint';
  // svelte-ignore state_referenced_locally
  const totalMs = 'seconds' in mode.budget ? mode.budget.seconds * 1000 : null;
  /** Aufgabenzahl des Laufs; im Fehlertraining höchstens so viele, wie fällig sind. */
  // svelte-ignore state_referenced_locally
  let limit = 'trials' in mode.budget ? mode.budget.trials : Infinity;
  // svelte-ignore state_referenced_locally
  let current: ArithmeticState = initial;
  let elapsed = 0;
  let score = 0;
  let done = 0;
  /** Fehlertraining: die fälligen Aufgaben dieser Sitzung; null, solange sie noch geladen werden. */
  let due: Task[] | null = null;
  /** Sprint und Präzision: die in den Einstellungen gewählten Rechenarten. */
  let kinds: readonly Kind[] = KINDS;
  /** Rechentrick nach Fehlern (Einstellung) – nur in den Modi ohne Uhr. */
  let tricks = false;
  /** Lädt einmal je Lauf, was vor der ersten Aufgabe feststehen muss. */
  let prepared: Promise<void> | null = null;
  /** Zählt jedes Fortsetzen und jede Pause: Nur das jüngste Fortsetzen stellt eine Aufgabe. */
  let resumes = 0;

  let task = $state.raw<Task | null>(null);
  let count = $state(0);
  let visible = $state(false);
  let feedback = $state<'good' | 'bad' | null>(null);
  /** Fehlertraining ohne fällige Aufgaben. */
  let nothingDue = $state(false);
  /** Rechenweg zur eben falsch gelösten Aufgabe; solange er steht, wartet der Lauf auf „Weiter“. */
  let trick = $state.raw<string[] | null>(null);
  let onset: number | null = null;
  let startedAt = 0;
  let pending: Handle<unknown> | null = null;
  let previous: { kind?: Kind; key?: string } = {};

  const progress = () => {
    if (totalMs === null) onProgress(done / limit, `${done} / ${limit}`);
  };

  function next() {
    if (paused) return;
    if (totalMs === null && done >= limit) return onFinish(current);
    if (modeId === 'review') {
      // Nach einer Pause kommt die verworfene Aufgabe wieder: Sie bleibt vorn, bis sie beantwortet ist.
      task = due![0]!;
    } else {
      const kind = pickKind(Math.random, previous.kind, kinds);
      task = nextTask(Math.random, kind, levelOfKind(current, kind), previous.key);
      previous = { kind, key: task.key };
    }
    feedback = null;
    trick = null;
    visible = false;
    onset = null;
    count++;
    progress();
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
    const outcome = outcomeIn(modeId, task, correct, rtMs);
    // Das Fehlertraining wiederholt alte Aufgaben – die Level der Rechenarten bleiben, wie sie sind.
    if (modeId === 'review') due!.shift();
    else current = applyAnswer(current, task, outcome);
    void recordReview(repo, task, outcome);
    done++;
    progress();
    feedback = correct ? 'good' : 'bad';
    trick = !correct && tricks ? trickFor(task) : null;
    if (trick) return;
    // Im Sprint läuft die Uhr weiter: Fehler kosten Zeit, Raten lohnt nicht. Ohne Uhr bleibt die Lösung länger stehen.
    const h = timing.wait(correct ? 250 : totalMs === null ? 1800 : 1200);
    pending = h;
    void h.done.then(next);
  }

  function prepare(): Promise<void> {
    prepared ??= (async () => {
      if (modeId === 'review') {
        // Die Auswahl steht damit für die ganze Sitzung fest.
        due = await dueTasks(repo, Date.now(), limit);
        limit = due.length;
        nothingDue = due.length === 0;
      } else {
        kinds = activeKinds(await repo.getSetting<unknown>(KINDS_SETTING, null));
      }
      tricks = totalMs === null && (await repo.getSetting(TRICKS_SETTING, true));
    })();
    return prepared;
  }

  /** Beginnt bzw. setzt fort, sobald alles da ist. */
  function resume() {
    const mine = ++resumes;
    void prepare().then(() => {
      if (mine === resumes && !nothingDue) next();
    });
  }

  // Uhr und Pause. Bei Pause steht die Uhr; die offene Aufgabe wird verworfen.
  $effect(() => {
    if (paused) {
      resumes++;
      untrack(() => (task = null));
      return;
    }
    untrack(resume);
    if (totalMs === null) return () => pending?.cancel();
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

{#if nothingDue}
  <div class="empty">
    <h2>Nichts fällig</h2>
    <p class="muted">
      Hierher kommen Aufgaben, die du falsch oder im Sprint zu langsam gelöst hast: falsche nach zehn Minuten, langsame am nächsten
      Tag, danach in wachsenden Abständen. Gerade ist keine dran.
    </p>
    <Button variant="secondary" onclick={() => onFinish(current)}>Zurück</Button>
  </div>
{:else if task}
  {#key count}
    <TaskPad {task} {visible} {feedback} {trick} onContinue={next} onSubmit={submit} />
  {/key}
{/if}

<style>
  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--s-4);
    padding: var(--s-5);
    text-align: center;
  }
</style>
