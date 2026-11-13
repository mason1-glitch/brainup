<script lang="ts">
  // Interaktives Tutorial: drei Aufgaben, die die Tastatur, das Komma und den Überschlag zeigen.
  // Jede wird wiederholt, bis sie richtig ist.
  import { onDestroy } from 'svelte';
  import { frac } from '../../core/fraction';
  import { timing, type Handle } from '../../core/timing';
  import type { TutorialProps } from '../types';
  import { check, type Task } from './generators';
  import TaskPad from './TaskPad.svelte';

  let { onDone }: TutorialProps = $props();

  const base = { level: 1, hint: '', tolerance: 0, expr: { op: 'value' as const, args: [] } };
  const STEPS: { title: string; text: string; task: Task }[] = [
    {
      title: 'Tippen und bestätigen',
      text: 'Gib das Ergebnis ein und bestätige mit dem Haken.',
      task: { ...base, kind: 'add', key: 'tutorial:1', text: '8 + 5', answer: frac(13), format: 'int' },
    },
    {
      title: 'Mit Komma',
      text: 'Manche Ergebnisse sind Dezimalzahlen. Dann ist die Komma-Taste aktiv.',
      task: { ...base, kind: 'fraction', key: 'tutorial:2', text: '1/2', hint: 'als Dezimalzahl', answer: frac(1, 2), format: 'decimal' },
    },
    {
      title: 'Überschlag',
      text: 'Hier zählt jede Antwort, die höchstens 10 % danebenliegt. Rechne grob – etwa 50 × 20.',
      task: { ...base, kind: 'estimate', key: 'tutorial:3', text: '49 × 21', hint: 'Überschlag · ±10 %', answer: frac(1029), format: 'decimal', tolerance: 10 },
    },
  ];

  let index = $state(0);
  let attempt = $state(0);
  let feedback = $state<'good' | 'bad' | null>(null);
  let pending: Handle<void> | null = null;
  onDestroy(() => pending?.cancel());

  function submit(input: string) {
    if (feedback !== null) return;
    const correct = check(STEPS[index]!.task, input);
    feedback = correct ? 'good' : 'bad';
    pending = timing.wait(correct ? 600 : 1600);
    void pending.done.then(() => {
      feedback = null;
      if (correct) {
        if (index + 1 >= STEPS.length) return onDone();
        index++;
      }
      attempt++;
    });
  }
</script>

<div class="tutorial">
  <div class="text">
    <p class="label">Schritt {index + 1} von {STEPS.length}</p>
    <h2>{STEPS[index]!.title}</h2>
    <p class="muted">{STEPS[index]!.text}</p>
  </div>
  {#key attempt}
    <TaskPad task={STEPS[index]!.task} {feedback} onSubmit={submit} />
  {/key}
</div>

<style>
  .tutorial {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .text {
    display: grid;
    gap: var(--s-2);
  }
  .tutorial > :global(.taskpad) {
    padding-inline: 0;
    padding-bottom: 0;
  }
</style>
