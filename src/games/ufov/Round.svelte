<script lang="ts">
  // Ein Durchgang: Fixation → Reiz (frame-genau) → Maske → Antwort → Auflösung.
  // Von Lauf und Tutorial genutzt. Wird die Komponente entfernt (Pause), bricht alles ab.
  import { flushSync, onDestroy, onMount } from 'svelte';
  import { timing, type Handle, type Presentation } from '../../core/timing';
  import { e2e } from '../e2e';
  import { DIRECTIONS, isCorrect, slotPosition, type UfovResponse, type UfovTrial } from './logic';

  export interface RoundResult {
    response: UfovResponse;
    correct: boolean;
    presentation: Presentation;
    rtMs: number;
    /** Epoch-ms beim Reizbeginn. */
    ts: number;
  }

  let { trial, onDone }: { trial: UfovTrial; onDone: (result: RoundResult) => void } = $props();

  let phase = $state<'fixation' | 'stimulus' | 'mask' | 'respond' | 'feedback'>('fixation');
  let central = $state<0 | 1 | null>(null);
  let direction = $state<number | null>(null);

  let pending: Handle<unknown> | null = null;
  let presentation: Presentation;
  let respondOnset = 0;
  let ts = 0;

  const step = <T,>(h: Handle<T>): Promise<T> => ((pending = h), h.done);
  const show = (p: typeof phase) => {
    phase = p;
    flushSync();
  };

  onMount(async () => {
    await step(timing.wait(600));
    presentation = await step(
      timing.present(
        trial.durationMs,
        () => {
          ts = Date.now();
          show('stimulus');
        },
        () => show('mask'),
      ),
    );
    await step(timing.wait(150));
    respondOnset = await step(timing.onset(() => show('respond')));
  });
  onDestroy(() => pending?.cancel());

  const needsDirection = $derived(trial.direction !== null);

  function choose(event: { timeStamp: number }) {
    if (phase !== 'respond' || central === null || (needsDirection && direction === null)) return;
    const response = { central, direction };
    const correct = isCorrect(trial, response);
    phase = 'feedback';
    const result = { response, correct, presentation, rtMs: timing.rt(event, respondOnset), ts };
    void step(timing.wait(correct ? 450 : 1100)).then(() => onDone(result));
  }

  // Plätze, Ablenker und Maske für die Darstellung
  const slots = [0, 1].flatMap((ring) =>
    Array.from({ length: DIRECTIONS }, (_, d) => ({ ring, d, ...slotPosition(d, ring) })),
  );
  // svelte-ignore state_referenced_locally
  const target = trial.direction === null ? null : slotPosition(trial.direction, trial.ring);
  // svelte-ignore state_referenced_locally
  const distractors = trial.distractors ? slots.filter((s) => !(s.d === trial.direction && s.ring === trial.ring)) : [];
  const mask = Array.from({ length: 144 }, (_, i) => ({
    x: -48 + (i % 12) * 8,
    y: -48 + Math.floor(i / 12) * 8,
    o: 0.15 + Math.random() * 0.75,
  }));
  const answering = $derived(phase === 'respond' || phase === 'feedback');
</script>

<div class="field" data-phase={phase}>
  <svg viewBox="-50 -50 100 100" aria-hidden="true">
    {#if phase === 'fixation'}
      <path class="fix" d="M-3 0h6M0 -3v6" />
    {:else if phase === 'stimulus'}
      {#if trial.central === 0}
        <circle class="ink" r="5.5" />
      {:else}
        <rect class="ink" x="-5" y="-5" width="10" height="10" />
      {/if}
      {#if target}<circle class="ink" cx={target.x} cy={target.y} r="3.4" />{/if}
      {#each distractors as s (s.ring * 8 + s.d)}
        <path class="outline" d="M{s.x} {s.y - 3.6}l3.6 6.6h-7.2z" />
      {/each}
    {:else if phase === 'mask'}
      {#each mask as m, i (i)}
        <rect class="noise" x={m.x} y={m.y} width="8" height="8" opacity={m.o} />
      {/each}
    {/if}
  </svg>

  {#if answering}
    <div class="centre">
      {#each [0, 1] as const as shape (shape)}
        <button
          type="button"
          class="choice"
          class:picked={central === shape}
          class:good={phase === 'feedback' && trial.central === shape}
          class:bad={phase === 'feedback' && central === shape && trial.central !== shape}
          aria-label={shape === 0 ? 'Kreis' : 'Quadrat'}
          aria-pressed={central === shape}
          data-correct={e2e ? trial.central === shape : undefined}
          disabled={phase === 'feedback'}
          onpointerdown={(e) => {
            central = shape;
            choose(e);
          }}
        >
          <svg viewBox="-10 -10 20 20" aria-hidden="true">
            {#if shape === 0}<circle class="ink" r="6.5" />{:else}<rect class="ink" x="-6" y="-6" width="12" height="12" />{/if}
          </svg>
        </button>
      {/each}
    </div>
    {#if needsDirection}
      {#each Array.from({ length: DIRECTIONS }, (_, d) => d) as d (d)}
        {@const p = slotPosition(d, 1)}
        <button
          type="button"
          class="spot"
          class:picked={direction === d}
          class:good={phase === 'feedback' && trial.direction === d}
          class:bad={phase === 'feedback' && direction === d && trial.direction !== d}
          style:left="{50 + p.x}%"
          style:top="{50 + p.y}%"
          aria-label="Richtung {d + 1} von {DIRECTIONS}"
          aria-pressed={direction === d}
          data-correct={e2e ? trial.direction === d : undefined}
          disabled={phase === 'feedback'}
          onpointerdown={(e) => {
            direction = d;
            choose(e);
          }}
        ></button>
      {/each}
    {/if}
  {/if}
</div>

<style>
  .field {
    position: relative;
    width: min(100%, 26rem);
    aspect-ratio: 1;
    margin: auto;
    border-radius: var(--r-lg);
    background: var(--surface);
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  .field > svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .ink {
    fill: var(--ink);
  }
  .outline {
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.1;
    stroke-linejoin: round;
  }
  .fix {
    stroke: var(--ink-3);
    stroke-width: 0.8;
    stroke-linecap: round;
  }
  .noise {
    fill: var(--ink);
  }
  .centre {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    pointer-events: none;
  }
  .choice,
  .spot {
    border: 2px solid var(--line);
    background: var(--bg);
    cursor: pointer;
    pointer-events: auto;
    transition:
      border-color var(--dur-fast) var(--ease),
      background-color var(--dur-fast) var(--ease);
  }
  .choice {
    width: 3.5rem;
    height: 3.5rem;
    padding: var(--s-2);
    border-radius: var(--r-md);
  }
  .choice svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .spot {
    position: absolute;
    width: var(--tap);
    height: var(--tap);
    margin: calc(var(--tap) / -2) 0 0 calc(var(--tap) / -2);
    border-radius: var(--r-full);
  }
  .picked {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .good {
    border-color: var(--good);
    background: var(--good-soft);
  }
  .bad {
    border-color: var(--bad);
    background: var(--bad-soft);
  }
</style>
