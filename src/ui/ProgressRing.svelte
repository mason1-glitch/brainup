<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Fortschritt 0..1. */
    value: number;
    /** Durchmesser in rem. */
    size?: number;
    label?: string;
    /** Inhalt in der Mitte. */
    children?: Snippet;
  }

  let { value, size = 7, label = 'Fortschritt', children }: Props = $props();
  const R = 44;
  const C = 2 * Math.PI * R;
  const clamped = $derived(Math.min(1, Math.max(0, value)));
</script>

<div
  class="ring"
  style:width="{size}rem"
  style:height="{size}rem"
  role="progressbar"
  aria-label={label}
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow={Math.round(clamped * 100)}
>
  <svg viewBox="0 0 100 100">
    <circle class="track" cx="50" cy="50" r={R} />
    <circle class="fill" cx="50" cy="50" r={R} stroke-dasharray={C} stroke-dashoffset={C * (1 - clamped)} />
  </svg>
  <div class="center">{@render children?.()}</div>
</div>

<style>
  .ring {
    position: relative;
    flex: none;
  }
  svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  circle {
    fill: none;
    stroke-width: 7;
  }
  .track {
    stroke: var(--sunken);
  }
  .fill {
    stroke: var(--accent);
    stroke-linecap: round;
    transition: stroke-dashoffset var(--dur-slow) var(--ease);
  }
  .center {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    text-align: center;
  }
</style>
