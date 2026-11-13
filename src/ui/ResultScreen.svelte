<script lang="ts">
  // Ergebnisbildschirm: eine große Zahl, wenige Kennzahlen, zwei Wege weiter.
  import type { Summary } from '../data/types';
  import Button from './Button.svelte';

  interface Props {
    title: string;
    summary: Summary;
    /** Neuer persönlicher Bestwert. */
    best?: boolean;
    /** Beschriftung der Hauptaktion („Fertig“ oder im Tagesprogramm „Weiter“). */
    primaryLabel?: string;
    onPrimary: () => void;
    onAgain?: () => void;
  }

  let { title, summary, best = false, primaryLabel = 'Fertig', onPrimary, onAgain }: Props = $props();

  const rows = $derived([
    { label: 'Level', value: String(summary.level) },
    { label: 'Trefferquote', value: `${Math.round(summary.accuracy * 100)} %` },
    ...(summary.medianRtMs === null
      ? []
      : [{ label: 'Median-Zeit', value: `${(summary.medianRtMs / 1000).toFixed(2).replace('.', ',')} s` }]),
    ...summary.extra,
  ]);
</script>

<section class="result">
  <div class="top">
    <p class="label">{title}</p>
    <p class="headline num" data-testid="result-headline">{summary.headline.value}</p>
    <p class="muted">{summary.headline.label}</p>
    {#if best}<p class="best">Neuer Bestwert</p>{/if}
  </div>

  <dl>
    {#each rows as row (row.label)}
      <div class="row">
        <dt>{row.label}</dt>
        <dd class="num">{row.value}</dd>
      </div>
    {/each}
  </dl>

  <div class="actions">
    <Button size="lg" block onclick={onPrimary}>{primaryLabel}</Button>
    {#if onAgain}<Button variant="ghost" block onclick={onAgain}>Nochmal</Button>{/if}
  </div>
</section>

<style>
  .result {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    gap: var(--s-6);
    max-width: var(--content);
    margin-inline: auto;
    padding: calc(var(--safe-top) + var(--s-7)) calc(var(--safe-right) + var(--s-5))
      calc(var(--safe-bottom) + var(--s-5)) calc(var(--safe-left) + var(--s-5));
  }
  .top {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    animation: rise var(--dur-slow) var(--ease);
  }
  .headline {
    font-size: var(--text-3xl);
    font-weight: var(--weight-bold);
    line-height: var(--leading-tight);
    margin-top: var(--s-3);
  }
  .best {
    margin-top: var(--s-4);
    padding: var(--s-1) var(--s-3);
    border-radius: var(--r-full);
    background: var(--accent-soft);
    color: var(--accent);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
  }
  dl {
    margin: 0;
    padding: var(--s-2) var(--s-5);
    background: var(--surface);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow);
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: var(--s-3) 0;
  }
  .row + .row {
    border-top: 1px solid var(--line);
  }
  dt {
    color: var(--ink-2);
  }
  dd {
    margin: 0;
    font-weight: var(--weight-bold);
  }
  .actions {
    display: grid;
    gap: var(--s-2);
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(0.5rem);
    }
  }
</style>
