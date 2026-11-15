<script lang="ts">
  // Schrägbild eines Körpers mit eingezeichnetem Schnitt: SVG-Vielecke, kein WebGL (wie die Rotation).
  // Kanten auf der Rückseite sind gestrichelt – auch die des Schnitts.
  import { findSolid, picture, type P2, type Plane } from './logic';

  let { solid, plane, yaw }: { solid: string; plane: Plane; yaw: number } = $props();

  const pic = $derived(picture(findSolid(solid), plane, yaw));
  // Rand für die Strichstärke.
  const half = $derived(pic.frame.half + 0.25);
  const outline = (points: readonly P2[]) => `M${points.map((p) => p.join(' ')).join('L')}Z`;
</script>

<svg viewBox="{pic.frame.cx - half} {pic.frame.cy - half} {2 * half} {2 * half}" aria-hidden="true">
  {#each pic.faces as f, i (i)}
    <path
      class="face"
      d={outline(f.points)}
      style:fill="color-mix(in oklab, var(--solid-shade) {Math.round(78 - 62 * f.light)}%, var(--solid-lit))"
    />
  {/each}
  {#each pic.edges as e, i (i)}
    <line class="edge" class:hidden={e.hidden} x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} />
  {/each}
  <path class="cut" d={outline(pic.cut.points)} />
  {#each pic.cut.edges as e, i (i)}
    <line class="cut-edge" class:hidden={e.hidden} x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} />
  {/each}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  line {
    stroke-linecap: round;
  }
  .edge {
    stroke: var(--ink-2);
    stroke-width: 0.05;
  }
  .cut {
    fill: var(--ink);
    opacity: 0.3;
  }
  .cut-edge {
    stroke: var(--ink);
    stroke-width: 0.11;
  }
  .hidden {
    stroke-dasharray: 0.22 0.2;
  }
  .edge.hidden {
    stroke: var(--ink-3);
  }
</style>
