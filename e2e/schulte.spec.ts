import { expect, test, type Page } from '@playwright/test';
import { openGame } from './helpers';

const target = (page: Page) => page.locator('.board.visible .cell[data-correct="true"]');
const other = (page: Page) => page.locator('.board.visible .cell[data-correct="false"]:enabled').first();

/** Tippt die gesuchten Zahlen der Reihe nach an. */
async function find(page: Page, count: number): Promise<void> {
  for (let i = 0; i < count; i++) await target(page).click();
}

async function tutorial(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Kurz üben' }).click();
  await find(page, 4);
  await expect(page.getByRole('heading', { name: 'Jetzt ohne Hilfe' })).toBeVisible();
  await find(page, 9);
}

test('Zahlensuche: Tutorial, kompletter Lauf, Ergebnis', async ({ page }) => {
  await openGame(page, 'schulte');
  await page.getByRole('button', { name: 'Kurz üben' }).click();

  // Tutorial: die nächste Zahl ist markiert; ein Fehltipp wird erklärt und bringt nicht weiter.
  await expect(page.locator('.cell.hint')).toHaveText('1');
  await other(page).click();
  await expect(page.getByText(/^Das war die [234]\. Gesucht ist die 1\.$/)).toBeVisible();
  await expect(page.locator('.cell.found')).toHaveCount(0);
  await find(page, 4);
  await expect(page.getByRole('heading', { name: 'Jetzt ohne Hilfe' })).toBeVisible();
  await expect(page.locator('.cell')).toHaveCount(9);
  await expect(page.locator('.cell.hint')).toHaveCount(0);
  await find(page, 9);

  // Lauf: drei Tafeln. Zwei schnelle 3×3-Tafeln, dann wächst die Tafel auf 4×4.
  await expect(page.getByText('Tafel 1 / 3')).toBeVisible();
  await expect(page.getByText('Der Reihe nach: 1, 2, 3 …')).toBeVisible();
  await expect(page.locator('.cell')).toHaveCount(9);
  await find(page, 3);
  // Gefundene Zahlen verblassen (sie stehen irgendwo auf der Tafel – verglichen wird die Menge).
  await expect(page.locator('.cell.found')).toHaveCount(3);
  expect((await page.locator('.cell.found').allInnerTexts()).sort()).toEqual(['1', '2', '3']);
  await other(page).click(); // Fehltipp: Die gesuchte Zahl wird genannt.
  await expect(page.getByText('Gesucht: 4')).toBeVisible();
  await find(page, 6);
  await expect(page.getByText(/^\d+,\d s · Zielzeit 10,0 s$/)).toBeVisible();

  await expect(page.getByText('Tafel 2 / 3')).toBeVisible();
  await find(page, 9);
  await expect(page.locator('.cell')).toHaveCount(16);
  await other(page).click();
  await find(page, 16);

  await expect(page.getByTestId('result-headline')).toBeVisible();
  await expect(page.getByText('Tafel 1 · 3×3')).toBeVisible();
  await expect(page.getByText('Tafel 3 · 4×4')).toBeVisible();
  await expect(page.locator('.row', { hasText: 'Fehltipps' })).toContainText('2');

  // Rohdaten: je Tafel ein Durchgang mit allen Tipps; die Zeit ist der Zeitpunkt des letzten Tipps.
  const trials = await page.evaluate(
    () =>
      new Promise<{ kind: string; correct: boolean; rtMs: number; difficulty: number; task: { cells: number[] }; response: { taps: { n: number; t: number }[] } }[]>((resolve) => {
        const open = indexedDB.open('brainup');
        open.onsuccess = () => {
          const all = open.result.transaction('trials').objectStore('trials').getAll();
          all.onsuccess = () => resolve(all.result);
        };
      }),
  );
  expect(trials.map((t) => t.kind)).toEqual(['3x3', '3x3', '4x4']);
  expect(trials.map((t) => t.difficulty)).toEqual([1, 1, 3]);
  expect(trials.map((t) => t.response.taps.length)).toEqual([10, 9, 17]);
  for (const t of trials) {
    expect(t.correct).toBe(true);
    expect([...t.task.cells].sort((a, b) => a - b)).toEqual(t.task.cells.map((_, i) => i + 1));
    const times = t.response.taps.map((tap) => tap.t);
    expect(times.every((time, i) => time > 0 && (i === 0 || time > times[i - 1]!))).toBe(true);
    expect(t.rtMs).toBe(times.at(-1));
  }
  expect(trials[1]!.response.taps.map((tap) => tap.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  // Zustand bleibt erhalten: Level ist gestiegen, Tutorial wird nicht mehr erzwungen.
  await page.getByRole('button', { name: 'Fertig' }).click();
  await page.goto('#/spiel/schulte');
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  await expect(page.getByText('Level 3', { exact: true })).toBeVisible();
});

test('Zahlensuche: Pause verwirft die Tafel, Beenden führt zurück', async ({ page }) => {
  await openGame(page, 'schulte');
  await tutorial(page);
  await expect(page.getByText('Tafel 1 / 3')).toBeVisible();
  await find(page, 4);
  await expect(page.locator('.cell.found')).toHaveCount(4);
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('dialog', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();
  // Neue Tafel von vorn; die angefangene zählt nicht.
  await expect(target(page)).toHaveText('1');
  await expect(page.locator('.cell.found')).toHaveCount(0);
  await expect(page.getByText('Tafel 1 / 3')).toBeVisible();
  await find(page, 9);
  await expect(page.getByText('Tafel 2 / 3')).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Beenden' }).click();
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
});
