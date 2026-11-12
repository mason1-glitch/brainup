import { describe, expect, it } from 'vitest';
import { createTimingEngine, measureFrameMs, toFrames, type Clock } from './timing';

/** Künstliche Uhr: `step()` liefert einen Frame aus. */
function fakeClock(frameMs: number, jitter: number[] = [0]) {
  let t = 1000;
  let n = 0;
  let nextId = 1;
  const queue = new Map<number, (t: number) => void>();
  const clock: Clock = {
    raf: (cb) => (queue.set(nextId, cb), nextId++),
    cancel: (id) => void queue.delete(id),
  };
  const step = (skip = 1) => {
    t += frameMs * skip;
    const cbs = [...queue.values()];
    queue.clear();
    const stamp = t + jitter[n++ % jitter.length]!;
    cbs.forEach((cb) => cb(stamp));
  };
  const run = async (frames: number) => {
    for (let i = 0; i < frames; i++) {
      step();
      await Promise.resolve();
    }
  };
  return { clock, step, run, pending: () => queue.size };
}

describe('toFrames', () => {
  it('rundet auf ganze Frames, mindestens einen', () => {
    const f = 1000 / 60;
    expect(toFrames(100, f)).toBe(6);
    expect(toFrames(108.4, f)).toBe(7);
    expect(toFrames(5, f)).toBe(1);
    expect(toFrames(100, 1000 / 120)).toBe(12);
  });
});

describe('measureFrameMs', () => {
  it.each([60, 120])('erkennt %i Hz trotz Jitter', async (hz) => {
    const c = fakeClock(1000 / hz, [0, 0.2, -0.15, 0.1]);
    const p = measureFrameMs(c.clock);
    await c.run(40);
    expect(await p).toBeCloseTo(1000 / hz, 6);
  });
});

describe('present', () => {
  it('zeigt genau die gerundete Frame-Zahl und protokolliert Soll/Ist', async () => {
    const c = fakeClock(1000 / 60);
    const engine = createTimingEngine(c.clock);
    const events: string[] = [];
    const h = engine.present(50, () => events.push('show'), () => events.push('hide'));
    c.step(); // Frame 0: show
    expect(events).toEqual(['show']);
    c.step();
    c.step();
    expect(events).toEqual(['show']);
    c.step(); // Frame 3: hide
    expect(events).toEqual(['show', 'hide']);
    const p = await h.done;
    expect(p.frames).toBe(3);
    expect(p.plannedMs).toBeCloseTo(50, 6);
    expect(p.actualMs).toBeCloseTo(50, 6);
    expect(engine.log).toHaveLength(1);
  });

  it('bleibt über 200 Darbietungen mit Jitter auf ±1 Frame genau', async () => {
    const c = fakeClock(1000 / 60, [0, 0.4, -0.4, 0.2, -0.3]);
    const engine = createTimingEngine(c.clock);
    for (let i = 0; i < 200; i++) {
      const h = engine.present(17 + (i % 12) * 16, () => {}, () => {});
      while (c.pending()) c.step();
      await h.done;
    }
    expect(engine.log).toHaveLength(200);
    for (const p of engine.log) expect(Math.abs(p.actualMs - p.plannedMs)).toBeLessThan(engine.frameMs);
  });

  it('macht einen ausgelassenen Frame im Protokoll sichtbar', async () => {
    const c = fakeClock(1000 / 60);
    const engine = createTimingEngine(c.clock);
    const h = engine.present(33, () => {}, () => {});
    c.step();
    c.step(3); // Ruckler
    const p = await h.done;
    expect(p.actualMs).toBeGreaterThan(p.plannedMs);
  });

  it('cancel verhindert hide und Protokoll', () => {
    const c = fakeClock(1000 / 60);
    const engine = createTimingEngine(c.clock);
    let hidden = false;
    const h = engine.present(100, () => {}, () => (hidden = true));
    c.step();
    h.cancel();
    for (let i = 0; i < 10; i++) c.step();
    expect(hidden).toBe(false);
    expect(engine.log).toHaveLength(0);
  });

  it('nutzt nach calibrate die gemessene Bildrate', async () => {
    const c = fakeClock(1000 / 120);
    const engine = createTimingEngine(c.clock);
    const cal = engine.calibrate();
    await c.run(40);
    await cal;
    expect(engine.quantize(50)).toBeCloseTo(50, 6);
    expect(engine.quantize(20)).toBeCloseTo(16.667, 2);
  });
});

describe('onset / rt', () => {
  it('RT ist Ereigniszeit minus Reizbeginn', async () => {
    const c = fakeClock(1000 / 60);
    const engine = createTimingEngine(c.clock);
    const h = engine.onset(() => {});
    c.step();
    const onset = await h.done;
    expect(engine.rt({ timeStamp: onset + 432.1 }, onset)).toBeCloseTo(432.1, 6);
  });
});
