<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'md' | 'lg';
    /** Volle Breite. */
    block?: boolean;
    /** Mit href wird ein Link gerendert. */
    href?: string;
    children: Snippet;
  }

  let { variant = 'primary', size = 'md', block = false, href, children, ...rest }: Props = $props();
</script>

{#if href}
  <a class="btn {variant} {size}" class:block {href}>{@render children()}</a>
{:else}
  <button class="btn {variant} {size}" class:block {...rest}>{@render children()}</button>
{/if}

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    min-height: var(--tap);
    padding: 0 var(--s-5);
    border: 0;
    border-radius: var(--r-full);
    font-family: var(--font-display);
    font-size: var(--text-md);
    font-weight: var(--weight-bold);
    cursor: pointer;
    transition:
      transform var(--dur-fast) var(--ease),
      background-color var(--dur-fast) var(--ease),
      opacity var(--dur-fast) var(--ease);
  }
  .btn:active {
    transform: scale(0.97);
  }
  .btn:disabled {
    opacity: 0.4;
    cursor: default;
    transform: none;
  }
  .lg {
    min-height: 3.5rem;
    padding: 0 var(--s-6);
    font-size: var(--text-lg);
  }
  .block {
    display: flex;
    width: 100%;
  }
  .primary {
    background: var(--accent);
    color: var(--on-accent);
  }
  .secondary {
    background: var(--sunken);
    color: var(--ink);
  }
  .ghost {
    background: transparent;
    color: var(--ink-2);
  }
</style>
