<script lang="ts" generics="T extends string">
  /** Auswahl aus wenigen Optionen (Modus, Design …). */
  interface Props {
    options: { id: T; title: string }[];
    value: T;
    label: string;
    onChange?: (value: T) => void;
  }

  let { options, value = $bindable(), label, onChange }: Props = $props();
</script>

<div class="seg" role="radiogroup" aria-label={label}>
  {#each options as o (o.id)}
    <button
      type="button"
      role="radio"
      aria-checked={o.id === value}
      class:on={o.id === value}
      onclick={() => {
        value = o.id;
        onChange?.(o.id);
      }}
    >
      {o.title}
    </button>
  {/each}
</div>

<style>
  .seg {
    display: flex;
    padding: var(--s-1);
    border-radius: var(--r-full);
    background: var(--sunken);
  }
  button {
    flex: 1;
    min-height: calc(var(--tap) - 2 * var(--s-1));
    padding: 0 var(--s-3);
    border: 0;
    border-radius: var(--r-full);
    background: transparent;
    color: var(--ink-2);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    cursor: pointer;
    transition:
      background-color var(--dur) var(--ease),
      color var(--dur) var(--ease);
  }
  .on {
    background: var(--surface);
    color: var(--ink);
    box-shadow: var(--shadow);
  }
</style>
