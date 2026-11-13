<script lang="ts">
  // Spielrahmen: Fortschritt oben, Countdown vor dem Start und nach jeder Pause,
  // Pause (auch automatisch beim App-Wechsel) und Abbruch. Das Spiel selbst ist der Inhalt.
  import type { Snippet } from 'svelte';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';
  import ProgressBar from './ProgressBar.svelte';

  interface Props {
    title: string;
    /** Fortschritt 0..1. */
    progress?: number;
    /** Kurzer Text rechts, z. B. „12 / 30“ oder „42 s“. */
    label?: string;
    /** true, solange nicht gespielt wird (Countdown oder Pause). Das Spiel richtet sich danach. */
    paused?: boolean;
    /** Länge des Countdowns in Schritten; 0 = ohne. */
    countdown?: number;
    onAbort: () => void;
    children: Snippet;
  }

  let {
    title,
    progress = 0,
    label = '',
    paused = $bindable(true),
    countdown = 3,
    onAbort,
    children,
  }: Props = $props();

  let phase = $state<'countdown' | 'running' | 'paused'>('countdown');
  // svelte-ignore state_referenced_locally
  let count = $state(countdown);

  $effect(() => {
    paused = phase !== 'running';
  });

  $effect(() => {
    if (phase !== 'countdown') return;
    if (count <= 0) {
      phase = 'running';
      return;
    }
    const id = setTimeout(() => count--, 700);
    return () => clearTimeout(id);
  });

  function pause() {
    if (phase !== 'paused') phase = 'paused';
  }

  function resume() {
    count = countdown;
    phase = 'countdown';
  }

  function onVisibility() {
    if (document.hidden) pause();
  }
</script>

<svelte:document onvisibilitychange={onVisibility} />

<div class="frame">
  <header>
    <button type="button" class="icon-btn" aria-label="Pause" onclick={pause} disabled={phase !== 'running'}>
      <Icon name="pause" />
    </button>
    <div class="bar"><ProgressBar value={progress} label="Fortschritt in {title}" /></div>
    <span class="num meta" aria-live="off">{label}</span>
  </header>

  <div class="stage" inert={phase !== 'running'}>
    {@render children()}
  </div>

  {#if phase === 'countdown' && count > 0}
    <div class="overlay" aria-live="assertive">
      {#key count}
        <span class="count num">{count}</span>
      {/key}
    </div>
  {:else if phase === 'paused'}
    <div class="overlay" role="dialog" aria-modal="true" aria-label="Pause">
      <div class="pause">
        <p class="label">Pause</p>
        <h2>{title}</h2>
        <div class="actions">
          <Button size="lg" block onclick={resume}>Weiter</Button>
          <Button variant="ghost" block onclick={onAbort}>Beenden</Button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .frame {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
  }
  header {
    display: flex;
    align-items: center;
    gap: var(--s-3);
    padding: var(--s-2) var(--s-4) var(--s-2) var(--s-2);
  }
  .icon-btn {
    display: grid;
    place-items: center;
    width: var(--tap);
    height: var(--tap);
    border: 0;
    border-radius: var(--r-full);
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
  }
  .icon-btn:disabled {
    opacity: 0.3;
  }
  .bar {
    flex: 1;
  }
  .meta {
    min-width: 3.25rem;
    text-align: right;
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--ink-2);
  }
  .stage {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: var(--content);
    margin-inline: auto;
  }
  .overlay {
    position: absolute;
    inset: 0;
    top: calc(var(--safe-top) + var(--tap) + var(--s-4));
    display: grid;
    place-items: center;
    background: var(--bg);
    padding: var(--s-5);
  }
  .count {
    font-size: var(--text-3xl);
    font-weight: var(--weight-bold);
    color: var(--ink);
    animation: pop var(--dur-slow) var(--ease);
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
  }
  .pause {
    width: 100%;
    max-width: 20rem;
    text-align: center;
  }
  .pause h2 {
    margin-top: var(--s-2);
    font-size: var(--text-xl);
  }
  .actions {
    display: grid;
    gap: var(--s-2);
    margin-top: var(--s-6);
  }
</style>
