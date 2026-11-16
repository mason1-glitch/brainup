import { expect, test, type Page } from '@playwright/test';
import { corsiRound, openGame } from './helpers';

interface StoredTrial {
  kind: string;
  correct: boolean;
  difficulty: number;
  task: { length: number; sequence: number[]; shown: { plannedMs: number; actualMs: number; frames: number }[] };
  response: { taps: { cell: number; t: number }[] };
}

async function tutorial(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Kurz üben' }).click();
  await corsiRound(page, { length: 2 });
  await expect(page.getByRole('heading', { name: 'Jetzt ohne Hilfe' })).toBeVisible();
  await corsiRound(page, { length: 3 });
}

const label = (page: Page, text: RegExp) => page.getByText(text);

test('Blockfolge: Tutorial, kompletter Lauf, Ergebnis, Timing', async ({ page }) => {
  await openGame(page, 'corsi');
  await page.getByRole('button', { name: 'Kurz üben' }).click();

  // Tutorial, Schritt 1: Das nächste Feld ist markiert; ein Fehltipp wird erklärt, danach läuft die Folge noch einmal.
  await page.locator('.board[data-phase="show"]').waitFor();
  await page.locator('.board[data-phase="respond"]').waitFor();
  await expect(page.locator('.cell.hint')).toHaveCount(1);
  await page.locator('.cell[data-correct="false"]:enabled').first().click();
  await expect(page.getByText('Nicht ganz – schau noch einmal zu.')).toBeVisible();
  await expect(page.locator('.cell.reveal')).toHaveCount(1);
  await page.locator('.board[data-phase="show"]').waitFor();
  await corsiRound(page, { length: 2 });
  await expect(page.getByRole('heading', { name: 'Jetzt ohne Hilfe' })).toBeVisible();
  await page.locator('.board[data-phase="respond"]').waitFor();
  await expect(page.locator('.cell.hint')).toHaveCount(0);
  await corsiRound(page, { length: 3 });

  // Lauf: 10 Folgen, die dritte und die sechste mit einem falschen ersten Tipp.
  const lengths: number[] = [];
  for (let i = 1; i <= 10; i++) {
    lengths.push(await corsiRound(page, { wrong: i === 3 || i === 6 }));
    await expect(label(page, new RegExp(`^${i} / 10`))).toBeVisible();
  }

  await expect(page.getByTestId('result-headline')).toHaveText(/^\d Felder$/);
  await expect(page.locator('.row', { hasText: 'Richtig' })).toContainText('8 von 10');

  // Rohdaten.
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
  expect(trials).toHaveLength(10);
  expect(trials.map((t) => t.correct)).toEqual([true, true, false, true, true, false, true, true, true, true]);
  expect(trials.map((t) => t.task.length)).toEqual(lengths);
  trials.forEach((t, i) => {
    expect(t.difficulty).toBe(t.task.length);
    expect(t.task.shown).toHaveLength(t.task.length);
    for (const s of t.task.shown) expect(Math.abs(s.actualMs - s.plannedMs)).toBeLessThanOrEqual(s.plannedMs / s.frames + 0.5);
    expect(new Set(t.task.sequence).size).toBe(t.task.sequence.length);
    if (t.correct) expect(t.response.taps.map((tap) => tap.cell)).toEqual(t.task.sequence);
    const next = trials[i + 1];
    if (next) {
      const want = Math.min(9, Math.max(2, t.difficulty + (t.correct ? 1 : -1)));
      expect(next.difficulty).toBe(want);
    }
  });

  // Zustand bleibt erhalten: Das Tutorial wird nicht mehr erzwungen.
  await page.getByRole('button', { name: 'Fertig' }).click();
  await page.goto('#/spiel/corsi');
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
});

test('Blockfolge: Pause verwirft die Folge, Beenden führt zurück', async ({ page }) => {
  await openGame(page, 'corsi');
  await tutorial(page);
  await page.locator('.board[data-phase="respond"]').waitFor();
  await page.locator('.cell[data-correct="true"]').click();
  await expect(page.locator('.cell.tapped')).toHaveCount(1);
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('dialog', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();
  // Neue Folge von vorn; die angefangene zählt nicht.
  await expect(label(page, /^0 \/ 10/)).toBeVisible();
  await expect(page.locator('.cell.tapped')).toHaveCount(0);
  await corsiRound(page);
  await expect(label(page, /^1 \/ 10/)).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Beenden' }).click();
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
});
