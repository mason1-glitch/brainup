<script lang="ts">
  // Eine Zeile der Spieleliste.
  import { link } from '../app/router.svelte';
  import type { GameDefinition } from '../games/types';
  import Icon from '../ui/Icon.svelte';

  let { game, step }: { game: GameDefinition; step?: number } = $props();
</script>

<a href={link(`/spiel/${game.id}`)}>
  {#if step}<span class="step num">{step}</span>{/if}
  <span class="text">
    <strong>{game.title}</strong>
    <span class="muted">{game.tagline}</span>
  </span>
  <span class="chev"><Icon name="chevron" size={20} /></span>
</a>

<style>
  a {
    display: flex;
    align-items: center;
    gap: var(--s-4);
    min-height: var(--tap);
    padding: var(--s-3) 0;
  }
  a:active {
    opacity: 0.6;
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
