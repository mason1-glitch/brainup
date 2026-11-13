// Timing-Engine. ALLE zeitkritischen Reize laufen hierüber (nie setTimeout):
// Reizbeginn im requestAnimationFrame-Callback, Dauer in ganzen Frames,
// Reaktionszeit = pointerdown.timeStamp − Reizbeginn (gleiche Zeitbasis wie performance.now()).

export interface Clock {
  raf: (cb: (t: number) => void) => number;
  cancel: (id: number) => void;
}

export const browserClock: Clock = {
  raf: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
};

const KNOWN_HZ = [50, 60, 72, 75, 90, 100, 120, 144, 165, 240];

/** Bildrate messen: Median der Frame-Abstände, auf eine bekannte Rate eingerastet (±4 %). */
export function measureFrameMs(clock: Clock, samples = 30): Promise<number> {
  return new Promise((resolve) => {
    const deltas: number[] = [];
    let last: number | null = null;
    const tick = (t: number) => {
      if (last !== null) deltas.push(t - last);
      last = t;
      if (deltas.length < samples) return void clock.raf(tick);
      deltas.sort((a, b) => a - b);
      const med = deltas[deltas.length >> 1]!;
      const snapped = KNOWN_HZ.map((hz) => 1000 / hz).find((ms) => Math.abs(ms - med) / ms < 0.04);
      resolve(snapped ?? med);
    };
    clock.raf(tick);
  });
}

/** Darbietungszeit auf ganze Frames runden (mindestens 1). */
export function toFrames(ms: number, frameMs: number): number {
  return Math.max(1, Math.round(ms / frameMs));
}

export interface Presentation {
  /** rAF-Zeitstempel des Frames, in dem der Reiz erschien. */
  onset: number;
  offset: number;
  frames: number;
  /** Soll-Dauer nach Frame-Rundung. */
  plannedMs: number;
  /** Ist-Dauer (offset − onset). */
  actualMs: number;
}

export interface Handle<T> {
  done: Promise<T>;
  /** Abbrechen (Pause/Abbruch); `done` wird dann nie erfüllt. */
  cancel: () => void;
}

export interface TimingEngine {
  /** Dauer eines Frames in ms; vor `calibrate()` 60 Hz angenommen. */
  readonly frameMs: number;
  calibrate: () => Promise<number>;
  /** ms → tatsächlich darstellbare Dauer (Vielfaches eines Frames). */
  quantize: (ms: number) => number;
  /**
   * Reiz für `durationMs` (frame-gerundet) zeigen. `show` und `hide` laufen synchron im
   * rAF-Callback und müssen das DOM direkt ändern (in Svelte: Zustand setzen + `flushSync()`).
   */
  present: (durationMs: number, show: () => void, hide: () => void) => Handle<Presentation>;
  /** Reiz zeigen, der bis zur Antwort bleibt; liefert den Reizbeginn. */
  onset: (show: () => void) => Handle<number>;
  /** Frame-genaue Wartezeit (Rückmeldung, Pausen zwischen Durchgängen) – abbrechbar, anders als setTimeout. */
  wait: (ms: number) => Handle<void>;
  /** Reaktionszeit eines Pointer-Ereignisses relativ zum Reizbeginn. */
  rt: (event: { timeStamp: number }, onset: number) => number;
  /** Soll/Ist aller Darbietungen (neueste zuletzt, max. 500) fürs Timing-Log. */
  readonly log: readonly Presentation[];
}

export function createTimingEngine(clock: Clock = browserClock): TimingEngine {
  let frameMs = 1000 / 60;
  const log: Presentation[] = [];

  return {
    get frameMs() {
      return frameMs;
    },
    log,
    async calibrate() {
      frameMs = await measureFrameMs(clock);
      return frameMs;
    },
    quantize: (ms) => toFrames(ms, frameMs) * frameMs,

    present(durationMs, show, hide) {
      let id = 0;
      let cancelled = false;
      const frames = toFrames(durationMs, frameMs);
      const plannedMs = frames * frameMs;
      const done = new Promise<Presentation>((resolve) => {
        id = clock.raf((onset) => {
          show();
          const tick = (t: number) => {
            // Halber Frame Toleranz: rAF-Zeitstempel schwanken leicht um das Raster.
            if (t - onset < plannedMs - frameMs / 2) return void (id = clock.raf(tick));
            hide();
            const p = { onset, offset: t, frames, plannedMs, actualMs: t - onset };
            log.push(p);
            if (log.length > 500) log.shift();
            resolve(p);
          };
          id = clock.raf(tick);
        });
      });
      return {
        done,
        cancel() {
          if (cancelled) return;
          cancelled = true;
          clock.cancel(id);
        },
      };
    },

    onset(show) {
      let id = 0;
      const done = new Promise<number>((resolve) => {
        id = clock.raf((t) => {
          show();
          resolve(t);
        });
      });
      return { done, cancel: () => clock.cancel(id) };
    },

    wait(ms) {
      let id = 0;
      const target = toFrames(ms, frameMs) * frameMs;
      const done = new Promise<void>((resolve) => {
        let start: number | null = null;
        const tick = (t: number) => {
          start ??= t;
          if (t - start < target - frameMs / 2) return void (id = clock.raf(tick));
          resolve();
        };
        id = clock.raf(tick);
      });
      return { done, cancel: () => clock.cancel(id) };
    },

    rt: (event, onset) => event.timeStamp - onset,
  };
}

/** Die eine Instanz der App. */
export const timing: TimingEngine = createTimingEngine();
