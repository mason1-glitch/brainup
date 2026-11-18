import { expect, test } from '@playwright/test';
import { openGame } from './helpers';

test('Papierfalten: Tutorial, kompletter Lauf, Ergebnis', async ({ page }) => {
  await openGame(page, 'paperfold');
  await page.getByRole('button', { name: 'Kurz üben' }).click();

  // Tutorial: erst absichtlich falsch → neue Aufgabe derselben Art; dann drei richtige Schritte.
  await expect(page.getByRole('heading', { name: 'Einmal gefaltet' })).toBeVisible();
  await page.locator('[data-correct="false"]:enabled').first().click();
  await expect(page.getByText('Nicht ganz')).toBeVisible();
  for (const title of ['Einmal gefaltet', 'Zweimal gefaltet', 'Schräg gefaltet']) {
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await page.locator('[data-correct="true"]:enabled').click();
  }

  // Lauf: 12 Durchgänge, 10 richtig, 2 falsch.
  for (let i = 1; i <= 12; i++) {
    const wrong = i === 4 || i === 9;
    await page.locator(`.board.visible [data-correct="${!wrong}"]:enabled`).first().click();
    await expect(page.getByText(`${i} / 12`, { exact: true })).toBeVisible();
  }

  await expect(page.getByTestId('result-headline')).toHaveText(/^\d+$/);
  await expect(page.getByText('10 von 12')).toBeVisible();

  // Rohdaten: 12 Durchgänge mit rekonstruierbarer Aufgabe (Faltungen, Lochungen, vier Muster).
  const trials = await page.evaluate(
    () =>
      new Promise<{ correct: boolean; task: { folds: unknown[]; punches: unknown[]; options: unknown[][]; correct: number } }[]>((resolve, reject) => {
        const open = indexedDB.open('brainup');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const all = open.result.transaction('trials').objectStore('trials').getAll();
          all.onsuccess = () => resolve(all.result);
        };
      }),
  );
  expect(trials).toHaveLength(12);
  expect(trials.filter((t) => t.correct)).toHaveLength(10);
  for (const t of trials) {
    expect(t.task.folds.length).toBeGreaterThanOrEqual(1);
    expect(t.task.punches.length).toBeGreaterThanOrEqual(1);
    expect(t.task.options).toHaveLength(4);
  }

  // Zustand bleibt erhalten: Level ist gestiegen, Tutorial wird nicht mehr erzwungen.
  await page.getByRole('button', { name: 'Fertig' }).click();
  // Erst die Spieleliste abwarten: Chromium ist schnell genug, um den Hashwechsel zu überholen, bevor die Seite wechselt.
  await expect(page.getByRole('heading', { name: 'Spiele' })).toBeVisible();
  await page.goto('#/spiel/paperfold');
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  await expect(page.getByText('Level 1', { exact: true })).toHaveCount(0);
});
