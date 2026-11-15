// Ablauf des Tagesprogramms (docs/DECISIONS.md, D6): reine Funktionen auf `ProgramRun`.
// Gespeichert wird über `repo.putProgramRun`; gespielt wird jeder Schritt im normalen Host.
import type { GameId, ProgramRun, ProgramStep, Session } from '../data/types';

/** Neuer Durchlauf aus einem Plan (`planDaily`). */
export function createRun(steps: ProgramStep[], id: string, day: string, now: number): ProgramRun {
  return { id, day, startedAt: now, finishedAt: null, steps: steps.map((s) => ({ ...s, sessionId: null })) };
}

/** Index des nächsten offenen Schritts; null, wenn alle gespielt sind. */
export function nextStep(run: ProgramRun): number | null {
  const index = run.steps.findIndex((s) => s.sessionId === null);
  return index === -1 ? null : index;
}

/**
 * Trägt eine beendete Sitzung beim ersten offenen Schritt dieses Spiels ein. Ist danach kein
 * Schritt mehr offen, gilt der Durchlauf als beendet. Passt kein Schritt, bleibt alles, wie es ist.
 */
export function completeStep(run: ProgramRun, gameId: GameId, sessionId: string, now: number): ProgramRun {
  const index = run.steps.findIndex((s) => s.gameId === gameId && s.sessionId === null);
  if (index === -1) return run;
  const steps = run.steps.map((s, i) => (i === index ? { ...s, sessionId } : s));
  return { ...run, steps, finishedAt: steps.every((s) => s.sessionId !== null) ? now : null };
}

/**
 * Der Durchlauf, den „Heute“ zeigt: der zuletzt begonnene unfertige des Tages – er wird
 * fortgesetzt –, sonst der zuletzt beendete, sonst keiner.
 */
export function currentRun(runsOfDay: ProgramRun[]): ProgramRun | null {
  const newestFirst = [...runsOfDay].sort((a, b) => b.startedAt - a.startedAt);
  return newestFirst.find((r) => r.finishedAt === null) ?? newestFirst[0] ?? null;
}

/** Route eines Schritts: derselbe Host wie beim Einzelspiel, mit `run` als Kennzeichen. */
export function stepPath(run: ProgramRun, index: number): string {
  const step = run.steps[index]!;
  return `/spiel/${step.gameId}?mode=${step.mode}&run=${run.id}`;
}

/** `recent` für `planDaily`: Spiele beendeter Sitzungen, zuletzt gespieltes zuerst, jedes einmal. */
export function recentGames(sessions: Session[]): GameId[] {
  const played = sessions.filter((s) => s.completed).sort((a, b) => b.startedAt - a.startedAt);
  return [...new Set(played.map((s) => s.gameId))];
}
