<script lang="ts">
  // Timing-Messung (Abnahmekriterium): 200 Darbietungen über die Timing-Engine, Soll- gegen Ist-Dauer.
  // Läuft auf jedem Gerät – so lässt sich die Genauigkeit auch auf dem eigenen iPhone ablesen.
  import { flushSync, onDestroy } from 'svelte';
  import { link } from '../../app/router.svelte';
  import { timing, type Handle, type Presentation } from '../../core/timing';
  import { reportTiming, type TimingReport } from '../../core/timingReport';
  import Button from '../../ui/Button.svelte';
  import Card from '../../ui/Card.svelte';
  import ProgressBar from '../../ui/ProgressBar.svelte';

  const TOTAL = 200;
  /** Darbietungsdauern in Frames – von einem Frame bis etwa eine Viertelsekunde bei 60 Hz. */
  const FRAMES = [1, 2, 3, 4, 6, 9, 12, 15];
  /** Pause zwischen zwei Darbietungen. */
  const GAP_MS = 100;

  let running = $state(false);
  let done = $state(0);
  let lit = $state(false);
  let report = $state.raw<TimingReport | null>(null);

  let pending: Handle<unknown> | null = null;
  let generation = 0;

  function hold<T>(h: Handle<T>): Promise<T> {
    pending = h;
    return h.done;
  }

  async function measure() {
    const gen = ++generation;
    running = true;
    report = null;
    done = 0;
    const frameMs = await timing.calibrate();
    const log: Presentation[] = [];
    for (let i = 0; i < TOTAL; i++) {
      if (gen !== generation) return;
      await hold(timing.wait(GAP_MS));
      if (gen !== generation) return;
      const shown = await hold(
        timing.present(
          FRAMES[i % FRAMES.length]! * frameMs,
          () => {
            lit = true;
            flushSync();
          },
          () => {
            lit = false;
            flushSync();
          },
        ),
      );
      if (gen !== generation) return;
      log.push(shown);
      done = log.length;
    }
    report = reportTiming(log, frameMs);
    running = false;
  }

  onDestroy(() => {
    generation++;
    pending?.cancel();
  });

  const ms = (value: number) => value.toFixed(1).replace('.', ',');
</script>

<main>
  <a class="muted back" href={link('/einstellungen')}>Zurück</a>
  <h1>Timing-Messung</h1>
  <p class="muted">
    Zeigt {TOTAL}-mal kurz ein Feld und vergleicht die geplante mit der gemessenen Dauer. Während der Messung die App offen lassen
    und nichts antippen.
  </p>

  <Card>
    <div class="stage"><span class="dot" class:lit></span></div>
    <ProgressBar value={done / TOTAL} label="Fortschritt der Messung" />
    <p class="num count">{done} / {TOTAL}</p>
    <Button block disabled={running} onclick={measure}>{report ? 'Noch einmal messen' : 'Messung starten'}</Button>
  </Card>

  {#if report}
    <Card>
      <h2>Ergebnis</h2>
      <dl data-testid="timing-report" data-count={report.count} data-within={report.within}>
        <div><dt>Bildrate</dt><dd class="num">{Math.round(1000 / report.frameMs)} Hz ({ms(report.frameMs)} ms je Frame)</dd></div>
        <div><dt>Auf ±1 Frame genau</dt><dd class="num">{report.within} von {report.count}</dd></div>
        <div><dt>Größte Abweichung</dt><dd class="num">{ms(report.maxAbsMs)} ms</dd></div>
        <div><dt>Mittlere Abweichung</dt><dd class="num">{ms(report.meanMs)} ms</dd></div>
      </dl>
      <table>
        <thead>
          <tr><th>Frames</th><th>Soll</th><th>Ist (Mittel)</th><th>Anzahl</th></tr>
        </thead>
        <tbody>
          {#each report.byFrames as row (row.frames)}
            <tr class="num">
              <td>{row.frames}</td><td>{ms(row.plannedMs)} ms</td><td>{ms(row.meanActualMs)} ms</td><td>{row.count}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </Card>
  {/if}
</main>

<style>
  main {
    display: grid;
    gap: var(--s-4);
    max-width: var(--content);
    margin-inline: auto;
    padding: calc(var(--safe-top) + var(--s-5)) calc(var(--safe-right) + var(--s-4)) calc(var(--safe-bottom) + var(--s-6))
      calc(var(--safe-left) + var(--s-4));
  }
  h1 {
    font-size: var(--text-xl);
  }
  .back {
    font-size: var(--text-sm);
    text-decoration: underline;
  }
  .stage {
    display: grid;
    place-items: center;
    height: calc(2 * var(--tap));
  }
  .dot {
    width: var(--tap);
    height: var(--tap);
    border-radius: var(--r-md);
    background: var(--sunken);
  }
  /* Ohne Übergang: Die Dauer bestimmt allein die Timing-Engine. */
  .dot.lit {
    background: var(--accent);
  }
  .count {
    margin: var(--s-2) 0 var(--s-4);
    text-align: center;
    color: var(--ink-2);
  }
  dl {
    display: grid;
    gap: var(--s-2);
    margin: var(--s-3) 0 var(--s-4);
  }
  dl div {
    display: flex;
    justify-content: space-between;
    gap: var(--s-3);
  }
  dt {
    color: var(--ink-2);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }
  th {
    color: var(--ink-3);
    font-weight: var(--weight-medium);
  }
  th,
  td {
    padding: var(--s-1) 0;
    text-align: right;
  }
  th:first-child,
  td:first-child {
    text-align: left;
  }
</style>
