<script lang="ts">
  // Eine Zeile der Spieleliste.
  import { link } from '../app/router.svelte';
  import type { GameDefinition } from '../games/types';
  import Icon from '../ui/Icon.svelte';

  interface Props {
    game: GameDefinition;
    /** Nummer im Tagesprogramm. */
    step?: number;
    /** Schritt schon gespielt: Haken statt Nummer. */
    done?: boolean;
    /** Nur anzeigen, nicht verlinken (Schritte des Tagesprogramms). */
    plain?: boolean;
  }

  let { game, step, done = false, plain = false }: Props = $props();
</script>

<svelte:element this={plain ? 'div' : 'a'} class="row" class:done href={plain ? undefined : link(`/spiel/${game.id}`)}>
  {#if step}
    <span class="step num">
      {#if done}<Icon name="check" size={16} />{:else}{step}{/if}
    </span>
  {/if}
  <span class="text">
    <strong>{game.title}</strong>
    <span class="muted">{game.tagline}</span>
  </span>
  {#if !plain}<span class="chev"><Icon name="chevron" size={20} /></span>{/if}
</svelte:element>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: var(--s-4);
    min-height: var(--tap);
    padding: var(--s-3) 0;
  }
  a.row:active {
    opacity: 0.6;
  }
  .done .step {
    background: var(--accent);
    color: var(--on-accent);
  }
  .step {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: var(--r-full);
    background: var(--accent-soft);
    color: var(--accent);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
  }
  .text {
    flex: 1;
    display: grid;
  }
  strong {
    font-family: var(--font-display);
    font-weight: var(--weight-bold);
  }
  .muted {
    font-size: var(--text-sm);
  }
  .chev {
    color: var(--ink-3);
  }
</style>
