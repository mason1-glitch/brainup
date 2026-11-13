// Verbindet die Rechenaufgaben mit der Spaced-Repetition-Warteschlange (core/srs).
// Jeder Modus meldet hier seine Antworten; das Fehlertraining liest mit `dueTasks`.
import { schedule, type Outcome } from '../../core/srs';
import type { Repo } from '../../data/repo';
import type { Task } from './generators';
import { fromRecord, toRecord, type TaskRecord } from './logic';

export const GAME_ID = 'arithmetic';

type ReviewRepo = Pick<Repo, 'getReview' | 'putReview' | 'deleteReview' | 'dueReviews'>;

/** Falsche und langsame Aufgaben kommen in die Warteschlange, gelernte fallen heraus. */
export async function recordReview(repo: ReviewRepo, task: Task, outcome: Outcome, now = Date.now()): Promise<void> {
  const prev = await repo.getReview(task.key);
  const next = schedule(prev, outcome, now);
  if (next) await repo.putReview({ key: task.key, gameId: GAME_ID, kind: task.kind, task: toRecord(task), ...next });
  else if (prev) await repo.deleteReview(task.key);
}

/** Fällige Aufgaben, älteste zuerst. */
export async function dueTasks(repo: ReviewRepo, now = Date.now()): Promise<Task[]> {
  const due = await repo.dueReviews(GAME_ID, now);
  return due.sort((a, b) => a.due - b.due).map((r) => fromRecord(r.task as TaskRecord));
}
