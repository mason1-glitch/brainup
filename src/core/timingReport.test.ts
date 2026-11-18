import { describe, expect, it } from 'vitest';
import type { Presentation } from './timing';
import { reportTiming } from './timingReport';

const frame = 1000 / 60;
const shown = (frames: number, actualMs: number): Presentation => ({ onset: 0, offset: actualMs, frames, plannedMs: frames * frame, actualMs });

describe('reportTiming', () => {
  it('zählt, was auf ±1 Frame genau war, und nennt die größte Abweichung', () => {
    const log = [
      shown(6, 100), // genau
      shown(6, 100.3), // Zeitstempel-Rauschen
      shown(6, 100 + frame), // ein Frame zu lang: noch innerhalb
      shown(3, 50 - frame), // ein Frame zu kurz: noch innerhalb
      shown(3, 50 + 2 * frame), // zwei Frames zu lang: außerhalb
    ];
    const report = reportTiming(log, frame);
    expect(report.count).toBe(5);
    expect(report.within).toBe(4);
    expect(report.maxAbsMs).toBeCloseTo(2 * frame, 6);
    expect(report.maxAbsFrames).toBeCloseTo(2, 6);
    expect(report.meanMs).toBeCloseTo((0.3 + frame - frame + 2 * frame) / 5, 6);
    expect(report.byFrames.map((g) => [g.frames, g.count])).toEqual([[3, 2], [6, 3]]);
    expect(report.byFrames[1]!.plannedMs).toBeCloseTo(100, 6);
    expect(report.byFrames[1]!.meanActualMs).toBeCloseTo((300.3 + frame) / 3, 6);
  });

  it('die Grenze liegt bei einem Frame plus einer halben Millisekunde', () => {
    expect(reportTiming([shown(6, 100 + frame + 0.4)], frame).within).toBe(1);
    expect(reportTiming([shown(6, 100 + frame + 0.6)], frame).within).toBe(0);
    expect(reportTiming([shown(6, 100 - frame - 0.6)], frame).within).toBe(0);
  });

  it('leeres Protokoll', () => {
    expect(reportTiming([], frame)).toEqual({ count: 0, frameMs: frame, within: 0, maxAbsMs: 0, maxAbsFrames: 0, meanMs: 0, byFrames: [] });
  });
});
