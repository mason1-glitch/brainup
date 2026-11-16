import { expect, test, type Page } from '@playwright/test';
import { openGame } from './helpers';

const respond = (page: Page) => page.locator('.board[data-phase="respond"]');

/** Beantwortet die Karte, die gerade steht; `wrong` drückt absichtlich die falsche Taste. */
async function answer(page: Page, wrong = false, timeout?: number): Promise<void> {
  await respond(page).locator(`.key[data-correct="${!wrong}"]`).click({ timeout });
}

async function tutorial(page: Page, sabotage: boolean): Promise<void> {
  await page.getByRole('button', { name: 'Kurz üben' }).click();
  if (sabotage) {
    await answer(page, true);
    await expect(page.getByText('Nicht ganz – lies die Frage auf der Karte.')).toBeVisible();
  }
  await answer(page);
  await expect(page.getByRole('heading', { name: 'Kleiner oder größer als 5?' })).toBeVisible();
  await answer(page);
  await expect(page.getByRole('heading', { name: 'Im Wechsel' })).toBeVisible();
  for (let i = 0; i < 4; i++) await answer(page);
}

interface StoredTrial {
  kind: string;
  correct: boolean;
  response: 'left' | 'right' | null;
  rtMs: number | null;
  task: { rule: 'parity' | 'size'; digit: number; windowMs: number; actualMs?: number; frames?: number };
}

async function storedTrials(page: Page): Promise<StoredTrial[]> {
  return page.evaluate(
    () =>
      new Promise<StoredTrial[]>((resolve, reject) => {
        const open = indexedDB.open('brainup');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const all = open.result.transaction('trials').objectStore('trials').getAll();
          all.onsuccess = () => resolve(all.result);
        };
      }),
  );
}

test('Wechselspiel: Tutorial, kompletter Lauf, Ergebnis, Timing', async ({ page }) => {
  test.setTimeout(240_000);
  await openGame(page, 'taskswitch');
  await tutorial(page, true);

  // Lauf: Den ersten Durchgang nicht beantworten (Fenster dort 2500 ms), später zweimal die falsche Taste.
  await expect(page.getByText('0 / 40')).toBeVisible();
  await expect(page.getByText('Zu spät')).toBeVisible({ timeout: 10_000 });

  // Das Fenster schrumpft; einzelne Durchgänge dürfen verpasst werden. Gespielt wird bis zum Ergebnis.
  const result = page.getByTestId('result-headline');
  let clicks = 0;
  while (!(await result.isVisible())) {
    const wrong = clicks === 6 || clicks === 12;
    const hit = await answer(page, wrong, 1500).then(() => true, () => false);
    if (hit) clicks++;
  }
  await expect(result).toHaveText(/^\d+ ms$/);

  // Rohdaten: 40 Durchgänge; Kennzeichnung, Wertung und Darbietung stimmen.
  const trials = await storedTrials(page);
  expect(trials).toHaveLength(40);
  const first = trials[0]!;
  expect(first.kind).toBe('start');
  expect(first.response).toBeNull();
  expect(first.rtMs).toBeNull();
  expect(Math.abs(first.task.actualMs! - first.task.windowMs)).toBeLessThanOrEqual(first.task.windowMs / first.task.frames! + 0.5);
  const kinds = new Set(trials.slice(1).map((t) => t.kind));
  expect([...kinds].sort()).toEqual(['gleich', 'wechsel']);
  for (const [i, t] of trials.entries()) {
    if (i > 0) expect(t.kind === 'wechsel').toBe(t.task.rule !== trials[i - 1]!.task.rule);
    const right = t.task.rule === 'parity' ? t.task.digit % 2 === 0 : t.task.digit > 5;
    expect(t.correct).toBe(t.response === (right ? 'right' : 'left'));
    if (t.response !== null) expect(t.rtMs).toBeGreaterThan(0);
  }
});

test('Wechselspiel: Pause verwirft den Durchgang, Beenden führt zurück', async ({ page }) => {
  test.setTimeout(120_000);
  await openGame(page, 'taskswitch');
  await tutorial(page, false);

  await answer(page);
  await answer(page);
  await expect(page.getByText(/^2 \/ 40/)).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('dialog', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();

  // Neue Folge; der angefangene Durchgang zählt nicht.
  await expect(page.getByText(/^2 \/ 40/)).toBeVisible();
  await answer(page);
  await expect(page.getByText(/^3 \/ 40/)).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Beenden' }).click();
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();

  // Nach einer Pause beginnt die Folge neu: Der dritte gespeicherte Durchgang hat keine Karte davor.
  const trials = await storedTrials(page);
  expect(trials.length).toBeGreaterThanOrEqual(3);
  expect(trials[2]!.kind).toBe('start');
});
