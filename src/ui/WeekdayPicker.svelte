<script lang="ts">
  /** Wochentage wählen: sieben Umschalt-Tasten. Wert: 0 = Montag … 6 = Sonntag. */
  interface Props {
    label: string;
    value: number[];
    onChange?: (value: number[]) => void;
  }

  let { label, value = $bindable(), onChange }: Props = $props();
  const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  function toggle(day: number) {
    value = [0, 1, 2, 3, 4, 5, 6].filter((d) => (d === day ? !value.includes(d) : value.includes(d)));
    onChange?.([...value]);
  }
</script>

<div class="days" role="group" aria-label={label}>
  {#each DAYS as name, day (day)}
    <button type="button" aria-pressed={value.includes(day)} onclick={() => toggle(day)}>{name}</button>
  {/each}
</div>

<style>
  .days {
    display: flex;
    gap: var(--s-1);
  }
  button {
    flex: 1;
    min-width: 0;
    min-height: var(--tap);
    padding: 0;
    border: 0;
    border-radius: var(--r-full);
    background: var(--sunken);
    color: var(--ink-2);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    cursor: pointer;
    transition:
      background-color var(--dur) var(--ease),
      color var(--dur) var(--ease);
  }
  button[aria-pressed='true'] {
    background: var(--accent);
    color: var(--on-accent);
  }
</style>
