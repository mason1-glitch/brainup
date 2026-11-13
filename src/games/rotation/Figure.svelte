<script lang="ts">
  // Leichtgewichtige 3D-Darstellung: SVG-Polygone, kein WebGL.
  import { boundingRadius, renderFaces, type Mat3, type Vec } from './logic';

  let { cells, view }: { cells: readonly Vec[]; view: Mat3 } = $props();

  const r = $derived(boundingRadius(cells));
  const faces = $derived(renderFaces(cells, view));
</script>

<svg viewBox="{-r} {-r} {2 * r} {2 * r}" aria-hidden="true">
  {#each faces as f, i (i)}
    <polygon
      points={f.points.map((p) => p.join(',')).join(' ')}
      style:fill="color-mix(in oklab, var(--accent) {Math.round(78 - 62 * f.light)}%, var(--surface))"
    />
  {/each}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  polygon {
    stroke: var(--ink);
    stroke-width: 0.045;
    stroke-linejoin: round;
  }
</style>
