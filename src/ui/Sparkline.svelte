<script lang="ts">
  // Kleine Verlaufslinie ohne Achsen. Skaliert zwischen Minimum und Maximum der Werte.
  interface Props {
    values: number[];
    /** Beschreibung für Screenreader. */
    label: string;
  }

  let { values, label }: Props = $props();

  // Koordinaten in Prozent der Fläche (oben/unten etwas Rand für den Punkt).
  const points = $derived.by(() => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return values.map((v, i) => ({
      x: values.length < 2 ? 50 : (i / (values.length - 1)) * 100,
      y: max === min ? 50 : 90 - ((v - min) / (max - min)) * 80,
    }));
  });
  const last = $derived(points[points.length - 1]);
</script>

<div class="spark" role="img" aria-label={label}>
  {#if points.length >= 2}
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
    </svg>
  {/if}
  {#if last}<span class="dot" style:left="{last.x}%" style:top="{last.y}%"></span>{/if}
</div>

<style>
  .spark {
    position: relative;
    height: calc(1.5 * var(--tap));
    margin-inline: var(--s-2);
  }
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  polyline {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }
  .dot {
    position: absolute;
    width: var(--s-3);
    height: var(--s-3);
    transform: translate(-50%, -50%);
    border-radius: var(--r-full);
    background: var(--accent);
  }
</style>
