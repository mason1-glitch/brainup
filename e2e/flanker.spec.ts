import { expect, test, type Page } from '@playwright/test';
import { openGame } from './helpers';

interface StoredTrial {
  kind: string;
  correct: boolean;
  rtMs: number | null;
  difficulty: number;
  response: 'left' | 'right' | null;
  task: { target: 'left' | 'right'; windowMs: number; actualMs?: number; frames?: number };
}

const respond = (page: Page) => page.locator('.board[data-phase="respond"]');
const right = (page: Page) => page.locator('.board[data-phase="respond"] .key[data-correct="true"]');
const wrongKey = (page: Page) => page.locator('.board[data-phase="respond"] .key[data-correct="false"]');

/** Die drei Schritte des Tutorials; in Schritt 1 optional erst ein absichtlicher Fehler. */
async function tutorial(page: Page, mistake = false): Promise<void> {
  await page.getByRole('button', { name: 'Kurz üben' }).click();
  await respond(page).waitFor();
  if (mistake) {
    await wrongKey(page).click();
    await expect(page.getByText('Nicht ganz – nur der mittlere Pfeil zählt.')).toBeVisible();
    await respond(page).waitFor();
  }
  await right(page).click();
  await expect(page.getByRole('heading', { name: 'Ablenkung' })).toBeVisible();
  await respond(page).waitFor();
  await right(page).click();
  await expect(page.getByRole('heading', { name: 'Jetzt auf Zeit' })).toBeVisible();
  await respond(page).waitFor();
  await right(page).click();
}

test('Pfeilfokus: Tutorial, kompletter Lauf, Ergebnis, Timing', async ({ page }) => {
  await openGame(page, 'flanker');
  await tutorial(page, true);

  // Erster Durchgang (Fenster 1500 ms): nicht antworten, bis „Zu spät“ erscheint.
  await expect(page.getByText(/^0 \/ 40 · \d+ ms$/)).toBeVisible();
  await expect(page.getByText('Zu spät')).toBeVisible({ timeout: 8000 });
  // Danach zweimal absichtlich die falsche Taste.
  for (let i = 0; i < 2; i++) {
    await respond(page).waitFor();
    await wrongKey(page).click({ timeout: 3000 });
  }

  // Der Rest: so lange richtig antworten, bis das Ergebnis da ist. Das Fenster schrumpft; ein verpasster Durchgang schadet nicht.
  const result = page.getByTestId('result-headline');
  while (!(await result.isVisible())) await right(page).click({ timeout: 500 }).catch(() => {});
  await expect(result).toHaveText(/^\d+ ms$/);

  const trials = await page.evaluate(
    () =>
      new Promise<StoredTrial[]>((resolve) => {
        const open = indexedDB.open('brainup');
        open.onsuccess = () => {
          const all = open.result.transaction('trials').objectStore('trials').getAll();
          all.onsuccess = () => resolve(all.result);
        };
      }),
  );
  expect(trials).toHaveLength(40);
  expect(new Set(trials.map((t) => t.kind))).toEqual(new Set(['stimmig', 'widerspruch']));
  for (const t of trials) {
    expect(t.correct).toBe(t.response === t.task.target);
    if (t.response !== null) expect(t.rtMs).toBeGreaterThan(0);
  }
  const first = trials[0]!;
  expect(first.response).toBeNull();
  expect(first.rtMs).toBeNull();
  expect(Math.abs(first.task.actualMs! - first.task.windowMs)).toBeLessThanOrEqual(first.task.windowMs / first.task.frames! + 0.5);
  expect(trials[1]!.response).not.toBe(trials[1]!.task.target);
  expect(trials[2]!.response).not.toBe(trials[2]!.task.target);
  expect(trials.at(-1)!.difficulty).toBeLessThan(first.difficulty);
});

test('Pfeilfokus: Pause verwirft den Durchgang, Beenden führt zurück', async ({ page }) => {
  await openGame(page, 'flanker');
  await tutorial(page);
  await respond(page).waitFor();
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('dialog', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();
  // Neuer Durchgang; der angefangene zählt nicht.
  await expect(page.getByText(/^0 \/ 40/)).toBeVisible();
  await right(page).click();
  await expect(page.getByText(/^1 \/ 40/)).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Beenden' }).click();
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
});
