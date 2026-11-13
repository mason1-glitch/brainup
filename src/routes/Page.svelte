<script lang="ts">
  // Seitenkopf + Inhalt für die Tab-Seiten.
  import type { Snippet } from 'svelte';

  let { title, eyebrow = '', children }: { title: string; eyebrow?: string; children: Snippet } = $props();
</script>

<header>
  {#if eyebrow}<p class="label">{eyebrow}</p>{/if}
  <h1>{title}</h1>
</header>
<div class="body">{@render children()}</div>

<style>
  header {
    display: grid;
    gap: var(--s-1);
    margin-bottom: var(--s-5);
  }
  h1 {
    font-size: var(--text-2xl);
  }
  .body {
    display: grid;
    gap: var(--s-5);
  }
</style>
