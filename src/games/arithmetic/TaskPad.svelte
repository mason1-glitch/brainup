<script lang="ts">
  // Aufgabe + Eingabe + Zahlentastatur. Von allen Kopfrechen-Modi und vom Tutorial genutzt.
  // Für jede neue Aufgabe neu einhängen ({#key}), damit die Eingabe leer beginnt.
  import Button from '../../ui/Button.svelte';
  import Numpad from '../../ui/Numpad.svelte';
  import { e2e } from '../e2e';
  import { answerInput, KIND_TITLES, solutionText, type Task } from './generators';

  interface Props {
    task: Task;
    /** Erst true, wenn die Timing-Engine die Aufgabe freigibt. */
    visible?: boolean;
    /** Nach der Antwort: richtig oder falsch (dann erscheint die Lösung). */
    feedback?: 'good' | 'bad' | null;
    /** Rechenweg nach einem Fehler; solange er steht, geht es erst mit „Weiter“ weiter. */
    trick?: readonly string[] | null;
    onContinue?: () => void;
    onSubmit: (input: string, timeStamp: number) => void;
  }

  let { task, visible = true, feedback = null, trick = null, onContinue, onSubmit }: Props = $props();
  let value = $state('');
</script>

<div class="taskpad">
  <div class="prompt" class:visible data-answer={e2e ? answerInput(task) : undefined}>
    <p class="label">{task.hint || KIND_TITLES[task.kind]}</p>
    <p class="task num">{task.text}</p>
    <p class="entry num" class:good={feedback === 'good'} class:bad={feedback === 'bad'} aria-live="polite">
      {value || ' '}
    </p>
    <p class="solution num" aria-live="polite">{feedback === 'bad' ? `Richtig: ${solutionText(task)}` : ' '}</p>
  </div>
  <div class="pad">
    <div class="numpad" class:covered={trick !== null}>
      <Numpad
        bind:value
        {onSubmit}
        decimal={task.format === 'decimal'}
        fraction={task.format === 'fraction'}
        maxLength={12}
        disabled={feedback !== null || !visible}
      />
    </div>
    {#if trick}
      <!-- Liegt über der Tastatur, damit die Aufgabe darüber nicht springt. -->
      <div class="trick" data-testid="trick">
        <p class="label">So geht es leichter</p>
        <div class="lines">
          {#each trick as line (line)}<p class="num">{line}</p>{/each}
        </div>
        <Button block onclick={onContinue}>Weiter</Button>
      </div>
    {/if}
  </div>
</div>

<style>
  .taskpad {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: var(--s-4);
    padding: var(--s-4);
  }
  .prompt {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    text-align: center;
    visibility: hidden;
  }
  .visible {
    visibility: visible;
  }
  .pad {
    display: grid;
  }
  .pad > * {
    grid-area: 1 / 1;
    min-width: 0;
  }
  .covered {
    visibility: hidden;
  }
  .trick {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    padding: var(--s-4);
    border-radius: var(--r-lg);
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  .lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--s-2);
    font-size: var(--text-md);
    line-height: var(--leading-tight);
    overflow-wrap: anywhere;
  }
  .task {
    font-size: var(--text-2xl);
    font-weight: var(--weight-bold);
    line-height: var(--leading-tight);
  }
  .entry {
    min-width: 8rem;
    margin-top: var(--s-3);
    padding: var(--s-2) var(--s-4);
    border-bottom: 2px solid var(--line);
    font-size: var(--text-xl);
    font-weight: var(--weight-medium);
    line-height: var(--leading-tight);
    color: var(--accent);
    transition:
      color var(--dur-fast) var(--ease),
      border-color var(--dur-fast) var(--ease);
  }
  .entry.good {
    color: var(--good);
    border-color: var(--good);
  }
  .entry.bad {
    color: var(--bad);
    border-color: var(--bad);
  }
  .solution {
    font-size: var(--text-md);
    font-weight: var(--weight-medium);
    color: var(--ink-2);
  }
</style>
