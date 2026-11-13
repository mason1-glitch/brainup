import { expect, test, type Page } from '@playwright/test';
import { openGame } from './helpers';

/** Beantwortet den laufenden Durchgang; `wrong` tippt absichtlich die falsche Form. */
async function answer(page: Page, wrong = false): Promise<void> {
  const field = page.locator('.field[data-phase="respond"]');
  await field.locator(`.choice[data-correct="${!wrong}"]`).click();
  const spot = field.locator('.spot[data-correct="true"]');
  if (await spot.count()) await spot.click();
}

test('Blickfeld (UFOV): Tutorial, kompletter Lauf, Ergebnis, Timing', async ({ page }) => {
  await openGame(page, 'ufov');
  await page.getByRole('button', { name: 'Kurz üben' }).click();

  // Tutorial: erster Versuch absichtlich falsch → Wiederholung; dann drei richtige Schritte.
  await answer(page, true);
  await expect(page.getByText('Nicht ganz')).toBeVisible();
  for (const title of ['Die Mitte', 'Der Rand', 'Schneller']) {
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await answer(page);
  }

  // Lauf: 30 Durchgänge, zwei davon falsch.
  for (let i = 1; i <= 30; i++) {
    await answer(page, i === 4 || i === 11);
    // Nach dem letzten Durchgang erscheint sofort das Ergebnis.
    if (i < 30) await expect(page.getByText(`${i} / 30`)).toBeVisible();
  }

  await expect(page.getByTestId('result-headline')).toHaveText(/^\d+ ms$/);
  await expect(page.getByText('1 von 3')).toBeVisible();
  await expect(page.getByText('93 %')).toBeVisible();

  // Rohdaten: 30 Durchgänge gespeichert, Ist-Darbietung auf ±1 Frame an der Soll-Dauer.
  const trials = await page.evaluate(
    () =>
      new Promise<{ difficulty: number; task: { durationMs: number; actualMs: number; frames: number } }[]>((resolve, reject) => {
        const open = indexedDB.open('brainup');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const all = open.result.transaction('trials').objectStore('trials').getAll();
          all.onsuccess = () => resolve(all.result);
        };
      }),
  );
  expect(trials).toHaveLength(30);
  const frame = trials[0]!.task.durationMs / trials[0]!.task.frames;
  expect(frame).toBeGreaterThan(4);
  expect(frame).toBeLessThan(21);
  for (const t of trials) expect(Math.abs(t.task.actualMs - t.task.durationMs)).toBeLessThanOrEqual(frame + 0.5);
  // Der Staircase hat die Darbietung verkürzt.
  expect(trials.at(-1)!.difficulty).toBeLessThan(trials[0]!.difficulty);
});
