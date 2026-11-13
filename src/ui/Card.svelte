<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Mit href wird die ganze Karte zum Link. */
    href?: string;
    /** Zurückhaltende Variante ohne eigene Fläche (für Gruppen auf --bg). */
    flat?: boolean;
    children: Snippet;
  }

  let { href, flat = false, children }: Props = $props();
</script>

{#if href}
  <a class="card link" class:flat {href}>{@render children()}</a>
{:else}
  <div class="card" class:flat>{@render children()}</div>
{/if}

<style>
  .card {
    display: block;
    padding: var(--s-5);
    background: var(--surface);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow);
  }
  .flat {
    background: transparent;
    box-shadow: none;
    border: 1px solid var(--line);
  }
  .link {
    transition: transform var(--dur-fast) var(--ease);
  }
  .link:active {
    transform: scale(0.985);
  }
</style>
