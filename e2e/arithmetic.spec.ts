import { expect, test, type Page } from '@playwright/test';
import { openGame } from './helpers';

/** Tippt eine Eingabe auf der Zahlentastatur und bestätigt. */
async function type(page: Page, input: string): Promise<void> {
  // Kurzes Zeitlimit: Läuft die Zeit mitten im Tippen ab, verschwindet die Tastatur.
  for (const key of [...input, 'ok']) await page.locator(`.key[data-key="${key}"]`).click({ timeout: 3000 });
}

test('Kopfrechnen: Tutorial, 60-s-Sprint, Ergebnis', async ({ page }) => {
  await openGame(page, 'arithmetic');
  await page.getByRole('button', { name: 'Kurz üben' }).click();

  // Tutorial: erst ein Fehler (Lösung erscheint, Aufgabe kommt wieder), dann drei richtige Schritte.
  await type(page, '12');
  await expect(page.getByText('Richtig: 13')).toBeVisible();
  await expect(page.getByText('Richtig: 13')).toBeHidden();
  await type(page, '13');
  await expect(page.getByRole('heading', { name: 'Mit Komma' })).toBeVisible();
  await type(page, '0,5');
  await expect(page.getByRole('heading', { name: 'Überschlag' })).toBeVisible();
  await type(page, '1000');

  // Sprint: Der Bot liest die Lösung aus data-answer und tippt sie; jede fünfte Antwort ist falsch.
  const result = page.getByTestId('result-headline');
  let answered = 0;
  let sentWrong = 0;
  while (!(await result.isVisible())) {
    const prompt = await page.locator('.prompt.visible').elementHandle({ timeout: 2000 }).catch(() => null);
    const answer = await prompt?.getAttribute('data-answer').catch(() => null);
    if (!prompt || !answer) continue;
    const wrong = (answered + 1) % 5 === 0;
    const sent = await type(page, wrong ? '99999999' : answer).then(() => true, () => false);
    if (!sent) continue;
    answered++;
    if (wrong) sentWrong++;
    // Warten, bis diese Aufgabe verschwunden ist (nächste Aufgabe oder Ergebnis).
    await prompt.waitForElementState('hidden', { timeout: 5000 }).catch(() => {});
  }

  expect(answered).toBeGreaterThan(8);
  await expect(result).toHaveText(/^\d+$/);
  await expect(page.getByText(/\d+ von \d+/)).toBeVisible();

  // Rohdaten: jede Antwort gespeichert; Fehler stehen in der Wiederholungsliste.
  const counts = await page.evaluate(
    () =>
      new Promise<{ trials: number; wrong: number; reviews: number }>((resolve) => {
        const open = indexedDB.open('brainup');
        open.onsuccess = () => {
          const tx = open.result.transaction(['trials', 'reviews']);
          const trials = tx.objectStore('trials').getAll();
          const reviews = tx.objectStore('reviews').count();
          tx.oncomplete = () =>
            resolve({ trials: trials.result.length, wrong: trials.result.filter((t) => !t.correct).length, reviews: reviews.result });
        };
      }),
  );
  // Die letzte Eingabe kann mit dem Zeitablauf zusammenfallen – daher ±1.
  expect(Math.abs(counts.trials - answered)).toBeLessThanOrEqual(1);
  expect(Math.abs(counts.wrong - sentWrong)).toBeLessThanOrEqual(1);
  expect(counts.reviews).toBeGreaterThan(0);
});
