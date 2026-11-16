<script lang="ts">
  import { flushSync, untrack } from 'svelte';
  import { timing, type Handle } from '../../core/timing';
  import type { RunProps } from '../types';
  import Board from './Board.svelte';
  import { afterBlock, BLOCK, isCorrect, kindOf, levelOf, makeBlock, ON_MS, paramsFor, rateBlock, type NbackState } from './logic';

  let { state: initial, mode, paused, onTrial, onProgress, onFinish }: RunProps<NbackState> = $props();

  /** Ruhe vor dem ersten Feld eines Blocks. */
  const LEAD_MS = 1200;
  /** So lange steht die Auswertung zwischen zwei Blöcken. */
  const BETWEEN_MS = 3500;

  // svelte-ignore state_referenced_locally
  const total = 'trials' in mode.budget ? mode.budget.trials : 2 * BLOCK;
  // svelte-ignore state_referenced_locally
  let current: NbackState = initial;
  let done = 0;
  /** Ergebnisse des laufenden Blocks (bleiben über eine Pause hinweg erhalten). */
  let results: { target: boolean; pressed: boolean }[] = [];
  let blockIndex = 0;

  let n = $state(1);
  let lit = $state<number | null>(null);
  let step = $state(0);
  let target = $state<boolean | null>(null);
  let pressed = $state<'good' | 'bad' | null>(null);
  let note = $state('');
  let tone = $state<'plain' | 'good' | 'bad'>('plain');
  /** Auswertung zwischen zwei Blöcken; leer = Raster zeigen. */
  let between = $state<{ title: string; lines: string[] } | null>(null);
  let active = $state(false);

  /** Das Feld, auf das gerade geantwortet werden kann. */
  interface Live {
    onset: number;
    scored: boolean;
    target: boolean;
    rtMs: number | null;
    pressed: boolean;
  }
  let live: Live | null = null;
  /** Schließt das Antwortfenster und liefert, was bis dahin getippt wurde. */
  function closeWindow(): Live | null {
    const answer = live;
    live = null;
    return answer;
  }
  let pending: Handle<unknown> | null = null;
  /** Zählt jeden neuen Ablauf und jede Pause: Ein überholter Ablauf hört nach dem nächsten Warten auf. */
  let generation = 0;

  function hold<T>(h: Handle<T>): Promise<T> {
    pending = h;
    return h.done;
  }

  const label = () => `${done} / ${total} · ${n}-Back`;

  async function play() {
    if (paused) return;
    if (done >= total) return onFinish(current);
    const gen = ++generation;
    const level = levelOf(current);
    const params = paramsFor(level);
    const onMs = timing.quantize(ON_MS);
    const soaMs = timing.quantize(params.soaMs);
    const sequence = makeBlock(Math.random, params.n, Math.min(BLOCK - results.length, total - done));
    n = params.n;
    between = null;
    active = true;
    lit = null;
    target = null;
    pressed = null;
    note = '';
    tone = 'plain';
    live = null;
    onProgress(done / total, label());

    await hold(timing.wait(LEAD_MS));
    for (const [index, stimulus] of sequence.entries()) {
      if (gen !== generation) return;
      const scored = stimulus.back !== null;
      let startedAt = 0;
      const shown = await hold(
        timing.present(
          onMs,
          (onset) => {
            live = { onset, scored, target: stimulus.target, rtMs: null, pressed: false };
            startedAt = Date.now();
            lit = stimulus.position;
            step++;
            target = scored ? stimulus.target : null;
            pressed = null;
            flushSync();
          },
          () => {
            lit = null;
            flushSync();
          },
        ),
      );
      if (gen !== generation) return;
      // Das Antwortfenster reicht bis zum Beginn des nächsten Felds.
      await hold(timing.wait(soaMs - shown.plannedMs));
      if (gen !== generation) return;
      const answer = closeWindow();
      if (!answer) return;
      if (!scored) continue;

      const correct = isCorrect(stimulus, answer.pressed);
      onTrial({
        kind: kindOf(params.n),
        ts: startedAt,
        // Soll/Ist der Darbietung gehören zu den Rohdaten (Timing-Auswertung).
        task: { ...stimulus, n: params.n, soaMs, onMs, block: blockIndex, index, actualMs: shown.actualMs, frames: shown.frames },
        response: { pressed: answer.pressed },
        rtMs: answer.rtMs,
        correct,
        difficulty: level,
      });
      results.push({ target: stimulus.target, pressed: answer.pressed });
      done++;
      onProgress(done / total, label());
      // Die Rückmeldung zum Tipp verschwindet mit dem Feld; ein verpasster Treffer wird danach genannt.
      const missed = stimulus.target && !answer.pressed;
      tone = missed ? 'bad' : 'plain';
      note = missed ? 'Verpasst' : '';
    }
    if (gen !== generation) return;

    // Block zu Ende: bewerten, Level anpassen, kurz zeigen.
    if (results.length >= BLOCK) {
      const rating = rateBlock(results);
      const before = paramsFor(levelOf(current));
      current = afterBlock(current, rating.verdict);
      const after = paramsFor(levelOf(current));
      results = [];
      blockIndex++;
      if (done < total) {
        const change =
          after.n !== before.n
            ? `Weiter mit ${after.n}-Back`
            : after.soaMs < before.soaMs
              ? 'Weiter im schnelleren Tempo'
              : after.soaMs > before.soaMs
                ? 'Weiter im ruhigeren Tempo'
                : `Weiter mit ${after.n}-Back`;
        active = false;
        between = {
          title: change,
          lines: [`${rating.hits} von ${rating.hits + rating.misses} Treffern erkannt`, `${rating.falseAlarms} ${rating.falseAlarms === 1 ? 'Fehlalarm' : 'Fehlalarme'}`],
        };
        await hold(timing.wait(BETWEEN_MS));
        if (gen !== generation) return;
      }
    }
    void play();
  }

  function press(event: { timeStamp: number }) {
    if (!live || live.pressed || paused) return;
    live.pressed = true;
    live.rtMs = timing.rt(event, live.onset);
    // Vor dem ersten Vergleich (die ersten n Felder) gibt es nichts zu treffen.
    if (!live.scored) return;
    pressed = live.target ? 'good' : 'bad';
    tone = live.target ? 'good' : 'bad';
    note = live.target ? 'Treffer' : 'Kein Treffer';
  }

  // Pause: laufende Folge verwerfen; danach beginnt eine neue für den Rest des Blocks.
  $effect(() => {
    if (paused) {
      generation++;
      pending?.cancel();
      pending = null;
      live = null;
      untrack(() => {
        active = false;
        between = null;
        lit = null;
      });
    } else {
      untrack(() => void play());
    }
    return () => {
      generation++;
      pending?.cancel();
    };
  });
</script>

{#if between}
  <div class="between" data-testid="nback-between">
    <p class="label">Block geschafft</p>
    <h2>{between.title}</h2>
    {#each between.lines as line (line)}<p class="muted">{line}</p>{/each}
  </div>
{:else if active}
  <Board {n} {lit} {step} {target} {pressed} {note} {tone} onPress={press} />
{/if}

<style>
  .between {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--s-2);
    padding: var(--s-5);
    text-align: center;
  }
</style>
