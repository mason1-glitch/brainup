<script lang="ts">
  // Ein Blatt als SVG: die Lagen von unten nach oben, optional der vorige Zustand gestrichelt
  // (dort lag das Papier vor der Faltung) und Löcher.
  import { SIZE, type Point, type Sheet } from './logic';

  interface Props {
    sheet: Sheet;
    /** Zustand vor der letzten Faltung. */
    before?: Sheet;
    holes?: readonly Point[];
  }

  let { sheet, before, holes = [] }: Props = $props();

  const outline = (poly: readonly Point[]) => `M${poly.map((p) => p.join(' ')).join('L')}Z`;
</script>

<svg viewBox="-1 -1 {SIZE + 2} {SIZE + 2}" aria-hidden="true">
  {#each before?.layers ?? [] as layer, i (i)}
    <path class="before" d={outline(layer)} />
  {/each}
  {#each sheet.layers as layer, i (i)}
    <path class="layer" class:flap={i >= sheet.layers.length - sheet.flap} d={outline(layer)} />
  {/each}
  {#each holes as hole (hole.join())}
    <circle class="hole" cx={hole[0]} cy={hole[1]} r="0.55" />
  {/each}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  path {
    stroke-linejoin: round;
  }
  .before {
    fill: none;
    stroke: var(--ink-3);
    stroke-width: 0.2;
    stroke-dasharray: 0.7 0.6;
  }
  .layer {
    fill: var(--surface);
    stroke: var(--ink);
    stroke-width: 0.25;
  }
  /* Die zuletzt umgeklappte Lasche ist getönt, damit man sieht, was sich bewegt hat. */
  .flap {
    fill: var(--accent-soft);
  }
  .hole {
    fill: var(--ink);
  }
</style>
