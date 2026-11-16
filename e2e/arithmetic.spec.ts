import { expect, test, type Page } from '@playwright/test';
import { openGame } from './helpers';

/**
 * Tippt eine Eingabe auf der Zahlentastatur und bestätigt.
 * @param timeout nur im Sprint kurz: Läuft die Zeit mitten im Tippen ab, verschwindet die Tastatur.
 */
async function type(page: Page, input: string, timeout?: number): Promise<void> {
  for (const key of [...input, 'ok']) await page.locator(`.key[data-key="${key}"]`).click({ timeout });
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
    const sent = await type(page, wrong ? '99999999' : answer, 3000).then(() => true, () => false);
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

/** Spielt das Tutorial fehlerfrei; danach beginnt der Lauf im gewählten Modus. */
async function tutorial(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Kurz üben' }).click();
  await type(page, '13');
  await expect(page.getByRole('heading', { name: 'Mit Komma' })).toBeVisible();
  await type(page, '0,5');
  await expect(page.getByRole('heading', { name: 'Überschlag' })).toBeVisible();
  await type(page, '1000');
}

/** Beantwortet die sichtbare Aufgabe und wartet, bis sie verschwunden ist. Liefert ihren Text. */
async function solve(page: Page, wrong = false): Promise<string> {
  const prompt = await page.locator('.prompt.visible').elementHandle();
  const answer = (await prompt!.getAttribute('data-answer'))!;
  const text = (await (await prompt!.$('.task'))!.innerText()).trim();
  await type(page, wrong ? '99999999' : answer);
  await prompt!.waitForElementState('hidden');
  return text;
}

interface StoredReview {
  due: number;
  task: { text: string };
}

const storedReviews = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<StoredReview[]>((resolve) => {
        const open = indexedDB.open('brainup');
        open.onsuccess = () => {
          const all = open.result.transaction('reviews').objectStore('reviews').getAll();
          all.onsuccess = () => resolve(all.result);
        };
      }),
  );

test('Kopfrechnen: Präzision – 15 Aufgaben ohne Uhr, Fehler landen in der Wiederholungsliste', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__brainupE2E = true;
  });
  await page.goto('#/spiel/arithmetic?mode=precision');
  await expect(page.getByRole('radio', { name: 'Präzision' })).toBeChecked();
  await tutorial(page);

  await expect(page.getByText('0 / 15')).toBeVisible();
  for (let i = 1; i <= 15; i++) {
    await solve(page, i === 4 || i === 9);
    if (i < 15) await expect(page.getByText(`${i} / 15`)).toBeVisible();
  }
  await expect(page.getByTestId('result-headline')).toHaveText(/^\d+$/);
  await expect(page.getByText('13 von 15')).toBeVisible();

  const sessions = await page.evaluate(
    () =>
      new Promise<{ mode: string; completed: boolean }[]>((resolve) => {
        const open = indexedDB.open('brainup');
        open.onsuccess = () => {
          const all = open.result.transaction('sessions').objectStore('sessions').getAll();
          all.onsuccess = () => resolve(all.result);
        };
      }),
  );
  expect(sessions).toEqual([expect.objectContaining({ mode: 'precision', completed: true })]);
  // Ohne Uhr gibt es kein „langsam“: In der Liste stehen nur die falschen Aufgaben.
  const reviews = await storedReviews(page);
  expect(reviews.length).toBeGreaterThanOrEqual(1);
  expect(reviews.length).toBeLessThanOrEqual(2);
});

test('Kopfrechnen: Fehlertraining bringt falsche Aufgaben wieder, sobald sie fällig sind', async ({ page }) => {
  const start = new Date(2026, 5, 15, 12, 0, 0).getTime();
  const MINUTE = 60_000;
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__brainupE2E = true;
  });
  await page.clock.setFixedTime(start);
  await page.goto('#/spiel/arithmetic?mode=review');
  await tutorial(page);

  // Noch nie etwas falsch gemacht: nichts fällig, zurück zur Einstiegsseite – ohne Ergebnis.
  await expect(page.getByRole('heading', { name: 'Nichts fällig' })).toBeVisible();
  await page.getByRole('button', { name: 'Zurück', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();

  // Präzision mit drei Fehlern.
  await page.getByRole('radio', { name: 'Präzision' }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  const missed: string[] = [];
  for (let i = 1; i <= 15; i++) {
    const wrong = i === 2 || i === 7 || i === 12;
    const text = await solve(page, wrong);
    if (wrong) missed.push(text);
  }
  await expect(page.getByTestId('result-headline')).toBeVisible();
  await page.getByRole('button', { name: 'Nochmal' }).waitFor();

  // Fünf Minuten später ist noch nichts fällig.
  await page.clock.setFixedTime(start + 5 * MINUTE);
  await page.goto('#/spiel/arithmetic?mode=review');
  await page.reload();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { name: 'Nichts fällig' })).toBeVisible();
  await page.getByRole('button', { name: 'Zurück', exact: true }).click();

  // Nach elf Minuten sind die falschen Aufgaben dran (kam eine davon später noch einmal und war richtig, erst morgen).
  await page.clock.setFixedTime(start + 11 * MINUTE);
  const due = (await storedReviews(page)).filter((r) => r.due <= start + 11 * MINUTE).map((r) => r.task.text.trim());
  expect(due.length).toBeGreaterThanOrEqual(1);
  expect(due.length).toBeLessThanOrEqual(3);
  for (const text of due) expect(missed).toContain(text);
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText(`0 / ${due.length}`)).toBeVisible();
  const asked: string[] = [];
  for (let i = 0; i < due.length; i++) asked.push(await solve(page, i === 0));
  expect([...asked].sort()).toEqual([...due].sort());
  await expect(page.getByTestId('result-headline')).toBeVisible();
  await expect(page.getByText(`${due.length - 1} von ${due.length}`)).toBeVisible();

  // Die eben falsch beantwortete kommt in zehn Minuten wieder, die richtigen frühestens morgen.
  const after = await storedReviews(page);
  const soon = after.filter((r) => r.due <= start + 22 * MINUTE).map((r) => r.task.text.trim());
  expect(soon).toEqual([asked[0]]);
  for (const r of after.filter((x) => x.task.text.trim() !== asked[0])) expect(r.due).toBeGreaterThanOrEqual(start + 24 * 60 * MINUTE);
});
