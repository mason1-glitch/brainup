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

test('Blickfeld (UFOV): drei fehlerfreie Läufe schalten Stufe 2 und 3 frei; Stufe 3 zeigt Ablenker', async ({ page }) => {
  test.setTimeout(240_000);
  await openGame(page, 'ufov');
  await page.getByRole('button', { name: 'Kurz üben' }).click();
  for (let i = 0; i < 3; i++) await answer(page);

  // Im dritten Lauf mitzählen, was in der Darbietung steht (MutationObserver, da nur wenige Frames sichtbar).
  await page.evaluate(() => {
    const seen = { stimuli: 0, distractors: 0, targets: 0 };
    (window as unknown as { __seen: typeof seen }).__seen = seen;
    new MutationObserver(() => {
      const field = document.querySelector('.field[data-phase="stimulus"]');
      if (!field || field.hasAttribute('data-counted')) return;
      field.setAttribute('data-counted', '');
      seen.stimuli++;
      seen.distractors += field.querySelectorAll('svg .outline').length;
      seen.targets += field.querySelectorAll('svg circle.ink[cx]').length;
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-phase'] });
  });

  for (const stage of [1, 2, 3]) {
    for (let i = 1; i <= 30; i++) await answer(page);
    await expect(page.getByText(`${stage} von 3`)).toBeVisible();
    await expect(page.getByText('100 %')).toBeVisible();
    if (stage < 3) {
      await expect(page.getByText(`Stufe ${stage + 1} freigeschaltet`)).toBeVisible();
      await page.getByRole('button', { name: 'Nochmal' }).click();
    }
  }

  // Stufe 3: in jedem Durchgang genau ein Zielpunkt und 15 Ablenker (16 Plätze).
  const seen = await page.evaluate(() => (window as unknown as { __seen: { stimuli: number; distractors: number; targets: number } }).__seen);
  expect(seen.stimuli).toBe(90);
  expect(seen.targets).toBe(60);
  expect(seen.distractors).toBe(30 * 15);
});
