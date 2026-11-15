<script lang="ts">
  // Eine Antwort: das Vieleck in wahrer Ansicht, in sein Feld eingepasst (Größe zählt nicht).
  import type { P2 } from './logic';

  let { points }: { points: readonly P2[] } = $props();

  const box = $derived.by(() => {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const half = Math.max(x1 - x0, y1 - y0) / 2;
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, half: half * 1.08 };
  });
</script>

<svg viewBox="{box.cx - box.half} {box.cy - box.half} {2 * box.half} {2 * box.half}" aria-hidden="true">
  <polygon points={points.map((p) => p.join(',')).join(' ')} vector-effect="non-scaling-stroke" />
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  polygon {
    fill: var(--accent-soft);
    stroke: var(--ink);
    stroke-width: 2px;
    stroke-linejoin: round;
  }
</style>
