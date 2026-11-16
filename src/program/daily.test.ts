import { describe, expect, it } from 'vitest';
import { DAILY_PRESETS, DEFAULT_DAILY, planDaily, presetOf } from './daily';

const g = (id: string, area: 'warmup' | 'training' | 'arithmetic') => ({ id, area, modes: [{ id: 'std' }] });
const games = [g('rot', 'training'), g('ufov', 'training'), g('fold', 'training'), g('math', 'arithmetic'), g('nback', 'warmup'), g('schulte', 'warmup')];

describe('planDaily', () => {
  it('ordnet Aufwärmen → Training → Kopfrechnen', () => {
    expect(planDaily(games, []).map((s) => s.gameId)).toEqual(['nback', 'rot', 'ufov', 'math']);
  });
  it('bevorzugt am längsten nicht Gespieltes', () => {
    const plan = planDaily(games, ['rot', 'nback', 'ufov']);
    expect(plan.map((s) => s.gameId)).toEqual(['schulte', 'fold', 'ufov', 'math']);
  });
  it('respektiert die Konfiguration', () => {
    expect(planDaily(games, [], { warmup: 0, training: 1, arithmetic: 1 }).map((s) => s.gameId)).toEqual(['rot', 'math']);
  });
  it('Voreinstellungen: kurz, normal, lang – mit wachsender Zahl an Spielen; „normal“ ist der Standard', () => {
    const steps = (['short', 'normal', 'long'] as const).map((id) => planDaily(games, [], DAILY_PRESETS[id]).length);
    expect(steps).toEqual([3, 4, 6]);
    expect(DAILY_PRESETS.normal).toEqual(DEFAULT_DAILY);
    for (const id of ['short', 'normal', 'long'] as const) expect(presetOf({ ...DAILY_PRESETS[id] })).toBe(id);
    expect(presetOf({ warmup: 0, training: 1, arithmetic: 1 })).toBeNull();
  });
});
