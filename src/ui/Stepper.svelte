<script lang="ts">
  /** Zahl in kleinen Schritten ändern (Wochenziel …): Beschriftung links, „−“ Wert „+“ rechts. */
  interface Props {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange?: (value: number) => void;
  }

  let { label, value = $bindable(), min, max, onChange }: Props = $props();

  function step(delta: number) {
    value = Math.min(max, Math.max(min, value + delta));
    onChange?.(value);
  }
</script>

<div class="stepper">
  <span class="text">{label}</span>
  <div class="control">
    <button type="button" aria-label="{label} verringern" disabled={value <= min} onclick={() => step(-1)}>−</button>
    <span class="num value" aria-live="polite">{value}</span>
    <button type="button" aria-label="{label} erhöhen" disabled={value >= max} onclick={() => step(1)}>+</button>
  </div>
</div>

<style>
  .stepper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-4);
    min-height: var(--tap);
    color: var(--ink);
    font-size: var(--text-md);
  }
  .control {
    flex: none;
    display: flex;
    align-items: center;
    gap: var(--s-1);
  }
  button {
    min-width: var(--tap);
    min-height: var(--tap);
    padding: 0;
    border: 0;
    border-radius: var(--r-full);
    background: var(--sunken);
    color: var(--ink);
    font-size: var(--text-lg);
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .value {
    min-width: var(--s-6);
    text-align: center;
    font-size: var(--text-lg);
  }
</style>
