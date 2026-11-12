<script lang="ts">
  // Eigene Zahlentastatur (keine System-Tastatur). Reagiert auf pointerdown – ohne Klick-Verzögerung –
  // und am Mac zusätzlich auf die echte Tastatur. Das Raster bleibt immer gleich; nicht benötigte
  // Tasten sind nur deaktiviert, damit die Finger ihre Wege behalten.
  import Icon from './Icon.svelte';

  interface Props {
    value?: string;
    onSubmit: (value: string) => void;
    /** Komma-Taste aktiv. */
    decimal?: boolean;
    /** Bruchstrich aktiv. */
    fraction?: boolean;
    /** Minus aktiv. */
    negative?: boolean;
    maxLength?: number;
    disabled?: boolean;
  }

  let {
    value = $bindable(''),
    onSubmit,
    decimal = false,
    fraction = false,
    negative = false,
    maxLength = 9,
    disabled = false,
  }: Props = $props();

  function press(key: string) {
    if (disabled) return;
    if (key === 'ok') {
      if (value !== '') onSubmit(value);
    } else if (key === 'del') {
      value = value.slice(0, -1);
    } else if (key === '−') {
      if (negative) value = value.startsWith('−') ? value.slice(1) : '−' + value;
    } else if (value.length < maxLength) {
      if (key === ',' && (!decimal || /[,/]/.test(value))) return;
      if (key === '/' && (!fraction || /[,/]/.test(value) || value === '' || value === '−')) return;
      value += key;
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key =
      e.key === 'Enter' ? 'ok'
      : e.key === 'Backspace' ? 'del'
      : e.key === '.' ? ','
      : e.key === '-' ? '−'
      : e.key;
    if (key === 'ok' || key === 'del' || /^[0-9,/−]$/.test(key)) {
      e.preventDefault();
      press(key);
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#snippet key(k: string, enabled = true, cls = '')}
  <button
    type="button"
    class="key {cls}"
    disabled={disabled || !enabled}
    aria-label={k === 'del' ? 'Löschen' : k === 'ok' ? 'Bestätigen' : k === '−' ? 'Minus' : k === '/' ? 'Bruchstrich' : k === ',' ? 'Komma' : k}
    data-key={k}
    onpointerdown={(e) => {
      e.preventDefault();
      press(k);
    }}
    onclick={(e) => {
      // Nur Tastatur-Aktivierung (Enter/Leertaste); Zeiger wurde schon bei pointerdown behandelt.
      if (e.detail === 0) press(k);
    }}
  >
    {#if k === 'del'}<Icon name="backspace" />{:else if k === 'ok'}<Icon name="check" size={28} />{:else}{k}{/if}
  </button>
{/snippet}

<div class="pad">
  {@render key('1')}{@render key('2')}{@render key('3')}{@render key('del', true, 'aux')}
  {@render key('4')}{@render key('5')}{@render key('6')}{@render key('−', negative, 'aux')}
  {@render key('7')}{@render key('8')}{@render key('9')}{@render key('/', fraction, 'aux')}
  {@render key(',', decimal, 'aux')}{@render key('0')}{@render key('ok', value !== '', 'ok')}
</div>

<style>
  .pad {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--s-2);
    width: 100%;
    max-width: 24rem;
    margin-inline: auto;
  }
  .key {
    display: grid;
    place-items: center;
    height: 3.5rem;
    border: 0;
    border-radius: var(--r-md);
    background: var(--surface);
    box-shadow: var(--shadow);
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: var(--weight-medium);
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    transition:
      background-color var(--dur-fast) var(--ease),
      transform var(--dur-fast) var(--ease);
  }
  .key:active:not(:disabled) {
    background: var(--sunken);
    transform: scale(0.96);
  }
  .aux {
    background: var(--sunken);
    box-shadow: none;
    color: var(--ink-2);
  }
  .aux:active:not(:disabled) {
    background: var(--line);
  }
  .ok {
    grid-column: span 2;
    background: var(--accent);
    color: var(--on-accent);
    box-shadow: none;
  }
  .ok:active:not(:disabled) {
    background: var(--accent);
  }
  .key:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .aux:disabled {
    opacity: 0.25;
  }
</style>
