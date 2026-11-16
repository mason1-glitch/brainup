import { describe, expect, it } from 'vitest';
import type { ProgramRun, Session } from '../data/types';
import { planDaily } from './daily';
import { completeStep, createRun, currentRun, nextStep, recentGames, stepPath } from './run';

const steps = [
  { gameId: 'rotation', mode: 'standard', sessionId: null },
  { gameId: 'ufov', mode: 'standard', sessionId: null },
  { gameId: 'arithmetic', mode: 'sprint', sessionId: null },
];

describe('Tagesprogramm-Durchlauf', () => {
  it('beginnt offen, hakt Schritte in Reihenfolge ab und endet nach dem letzten', () => {
    let run = createRun(steps, 'r1', '2026-11-15', 1000);
    expect(run).toMatchObject({ id: 'r1', day: '2026-11-15', startedAt: 1000, finishedAt: null });
    expect(nextStep(run)).toBe(0);
    expect(stepPath(run, 0)).toBe('/spiel/rotation?mode=standard&run=r1');

    run = completeStep(run, 'rotation', 's1', 2000);
    expect(run.steps.map((s) => s.sessionId)).toEqual(['s1', null, null]);
    expect(run.finishedAt).toBeNull();
    expect(nextStep(run)).toBe(1);

    run = completeStep(run, 'ufov', 's2', 3000);
    run = completeStep(run, 'arithmetic', 's3', 4000);
    expect(run.steps.map((s) => s.sessionId)).toEqual(['s1', 's2', 's3']);
    expect(run.finishedAt).toBe(4000);
    expect(nextStep(run)).toBeNull();
    expect(stepPath(run, 2)).toBe('/spiel/arithmetic?mode=sprint&run=r1');
  });

  it('verändert den übergebenen Durchlauf nicht und ignoriert Sitzungen ohne passenden offenen Schritt', () => {
    const run = createRun(steps, 'r1', '2026-11-15', 1000);
    const next = completeStep(run, 'ufov', 's9', 2000);
    expect(run.steps.every((s) => s.sessionId === null)).toBe(true);
    // Außer der Reihe gespielt: zählt für seinen Schritt, der nächste offene bleibt der erste.
    expect(nextStep(next)).toBe(0);
    expect(completeStep(next, 'ufov', 's10', 3000)).toBe(next); // Schritt schon erledigt
    expect(completeStep(next, 'paperfold', 's11', 3000)).toBe(next); // gehört nicht zum Programm
  });

  it('„Heute“ zeigt den unfertigen Durchlauf des Tages, sonst den zuletzt beendeten', () => {
    const run = (id: string, startedAt: number, finishedAt: number | null): ProgramRun => ({ id, day: 'd', startedAt, finishedAt, steps: [] });
    expect(currentRun([])).toBeNull();
    expect(currentRun([run('a', 1, 5), run('b', 10, 20)])!.id).toBe('b');
    expect(currentRun([run('a', 1, null), run('b', 10, 20)])!.id).toBe('a');
    expect(currentRun([run('a', 1, null), run('b', 10, null), run('c', 5, 6)])!.id).toBe('b');
  });
});

describe('recentGames', () => {
  const session = (gameId: string, startedAt: number, completed = true): Session => ({
    id: `${gameId}-${startedAt}`, gameId, mode: 'standard', day: 'd', startedAt, endedAt: startedAt + 1, completed, programRunId: null, summary: null,
  });

  it('zuletzt Gespieltes zuerst, jedes Spiel einmal, Abgebrochenes zählt nicht', () => {
    const sessions = [session('rotation', 10), session('ufov', 30), session('rotation', 40), session('arithmetic', 20), session('paperfold', 50, false)];
    expect(recentGames(sessions)).toEqual(['rotation', 'ufov', 'arithmetic']);
    expect(recentGames([])).toEqual([]);
  });

  it('zusammen mit planDaily: Was gestern dran war, macht heute Platz', () => {
    const g = (id: string, area: 'training' | 'arithmetic') => ({ id, area, modes: [{ id: 'standard' }] });
    const games = [g('rotation', 'training'), g('ufov', 'training'), g('paperfold', 'training'), g('sections', 'training'), g('arithmetic', 'arithmetic')];
    const first = planDaily(games, recentGames([])).map((s) => s.gameId);
    expect(first).toEqual(['rotation', 'ufov', 'arithmetic']);
    const played = first.map((id, i) => session(id, 100 + i));
    expect(planDaily(games, recentGames(played)).map((s) => s.gameId)).toEqual(['paperfold', 'sections', 'arithmetic']);
    // Am dritten Tag kommt wieder das am längsten nicht Gespielte.
    const later = [...played, session('paperfold', 200), session('sections', 201), session('arithmetic', 202)];
    expect(planDaily(games, recentGames(later)).map((s) => s.gameId)).toEqual(['rotation', 'ufov', 'arithmetic']);
  });
});
