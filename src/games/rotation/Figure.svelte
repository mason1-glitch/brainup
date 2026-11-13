<script lang="ts">
  // Leichtgewichtige 3D-Darstellung: SVG-Polygone, kein WebGL.
  import { boundingRadius, renderFaces, type Mat3, type Vec } from './logic';

  interface Props {
    cells: readonly Vec[];
    view: Mat3;
    /** Bildausschnitt (aus `frameOf`). Ohne Angabe: Kugel um die Figur – passt in jeder Drehlage. */
    frame?: { cx: number; cy: number; half: number };
  }

  let { cells, view, frame }: Props = $props();

  // Rand für die halbe Strichstärke, damit Kanten am Bildrand nicht abgeschnitten werden.
  const box = $derived(frame ? { ...frame, half: frame.half + 0.05 } : { cx: 0, cy: 0, half: boundingRadius(cells) });
  const faces = $derived(renderFaces(cells, view));
</script>

<svg viewBox="{box.cx - box.half} {box.cy - box.half} {2 * box.half} {2 * box.half}" aria-hidden="true">
  {#each faces as f, i (i)}
    <polygon
      points={f.points.map((p) => p.join(',')).join(' ')}
      style:fill="color-mix(in oklab, var(--solid-shade) {Math.round(78 - 62 * f.light)}%, var(--solid-lit))"
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
