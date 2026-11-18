<script lang="ts">
  /** Uhrzeit wählen: Beschriftung links, die Zeitauswahl des Systems rechts. Wert als „HH:MM“. */
  interface Props {
    label: string;
    value: string;
    onChange?: (value: string) => void;
  }

  let { label, value = $bindable(), onChange }: Props = $props();
</script>

<label>
  <span class="text">{label}</span>
  <input
    type="time"
    {value}
    required
    onchange={(event) => {
      // Ein geleertes Feld liefert "" – dann bleibt die alte Zeit.
      const next = event.currentTarget.value;
      if (!next) return;
      value = next;
      onChange?.(next);
    }}
  />
</label>

<style>
  label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-4);
    min-height: var(--tap);
    color: var(--ink);
    font-size: var(--text-md);
  }
  input {
    flex: none;
    min-height: var(--tap);
    padding: 0 var(--s-3);
    border: 0;
    border-radius: var(--r-sm);
    background: var(--sunken);
    color: var(--ink);
    font: inherit;
    font-variant-numeric: tabular-nums;
  }
</style>
