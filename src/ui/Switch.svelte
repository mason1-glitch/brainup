<script lang="ts">
  /** Ein/Aus-Schalter mit Beschriftung – eine Zeile in Einstellungslisten. */
  interface Props {
    label: string;
    checked: boolean;
    disabled?: boolean;
    onChange?: (checked: boolean) => void;
  }

  let { label, checked = $bindable(), disabled = false, onChange }: Props = $props();
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  {disabled}
  onclick={() => {
    checked = !checked;
    onChange?.(checked);
  }}
>
  <span class="text">{label}</span>
  <span class="track"><span class="thumb"></span></span>
</button>

<style>
  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-4);
    width: 100%;
    min-height: var(--tap);
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ink);
    font-size: var(--text-md);
    text-align: left;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .track {
    flex: none;
    width: calc(var(--tap) + var(--s-1));
    padding: var(--s-1);
    border-radius: var(--r-full);
    background: var(--sunken);
    transition: background-color var(--dur) var(--ease);
  }
  .thumb {
    display: block;
    width: var(--s-5);
    height: var(--s-5);
    border-radius: var(--r-full);
    background: var(--surface);
    box-shadow: var(--shadow);
    transition: transform var(--dur) var(--ease);
  }
  [aria-checked='true'] .track {
    background: var(--accent);
  }
  [aria-checked='true'] .thumb {
    transform: translateX(calc(var(--tap) + var(--s-1) - 2 * var(--s-1) - var(--s-5)));
  }
</style>
