<script lang="ts">
  /** Linearer Fortschritt 0..1. */
  let { value, label = 'Fortschritt' }: { value: number; label?: string } = $props();
  const clamped = $derived(Math.min(1, Math.max(0, value)));
</script>

<div
  class="track"
  role="progressbar"
  aria-label={label}
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow={Math.round(clamped * 100)}
>
  <div class="fill" style:transform="scaleX({clamped})"></div>
</div>

<style>
  .track {
    height: 0.375rem;
    border-radius: var(--r-full);
    background: var(--sunken);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    border-radius: var(--r-full);
    background: var(--accent);
    transform-origin: left;
    transition: transform var(--dur) linear;
  }
</style>
