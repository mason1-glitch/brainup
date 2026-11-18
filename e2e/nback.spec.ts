import { expect, test, type Page } from '@playwright/test';
import { openGame } from './helpers';

interface Field {
  step: number;
  /** data-correct der Taste: 'true' = Treffer, 'false' = kein Treffer, null = Feld ohne Wertung. */
  correct: string | null;
}

/** Wartet auf das nächste Feld (laufende Nummer ≠ `last`) und liest dabei, ob es ein Treffer ist. */
async function nextField(page: Page, last: number): Promise<Field> {
  const handle = await page.waitForFunction(
    (previous: number) => {
      const board = document.querySelector('.board[data-step]');
      const step = board ? Number(board.getAttribute('data-step')) : 0;
      if (!board || step === 0 || step === previous) return null;
      return { step, correct: board.querySelector('.key')?.getAttribute('data-correct') ?? null };
    },
    last,
    { timeout: 25_000, polling: 'raf' },
  );
  return (await handle.jsonValue()) as Field;
}

/** Die laufende Nummer des Felds, das gerade im DOM steht (nach Pause und Zwischenbild bleibt sie stehen). */
async function currentStep(page: Page): Promise<number> {
  const board = page.locator('.board[data-step]');
  await board.waitFor();
  return Number(await board.getAttribute('data-step'));
}

/**
 * Spielt `count` Felder richtig: bei einem Treffer einmal tippen, sonst nichts.
 * `miss`: der Treffer mit dieser laufenden Nummer (ab 0) wird ausgelassen;
 * `alarm`: bei dem Nicht-Treffer mit dieser Nummer wird trotzdem getippt.
 * Liefert die laufende Nummer des letzten Felds.
 */
async function playFields(page: Page, last: number, count: number, plan: { miss?: number; alarm?: number } = {}): Promise<number> {
  let hits = 0;
  let others = 0;
  for (let i = 0; i < count; i++) {
    const field = await nextField(page, last);
    last = field.step;
    if (field.correct === 'true' && hits++ !== plan.miss) await page.locator('.key').click();
    if (field.correct === 'false' && others++ === plan.alarm) await page.locator('.key').click();
  }
  return last;
}

/** Tutorial; `sabotage`: im ersten Schritt den ersten Treffer auslassen. Liefert die letzte Feldnummer. */
async function tutorial(page: Page, sabotage: boolean): Promise<number> {
  await page.getByRole('button', { name: 'Kurz üben' }).click();
  let last = 0;
  if (sabotage) {
    // Felder 1–3 der festen Folge; das dritte ist der Treffer.
    last = await playFields(page, last, 3, { miss: 0 });
    await expect(page.getByText('Das war ein Treffer')).toBeVisible();
  }
  last = await playFields(page, last, 6);
  await expect(page.getByRole('heading', { name: 'Jetzt ohne Hilfe' })).toBeVisible();
  return playFields(page, last, 8);
}

interface StoredTrial {
  kind: string;
  correct: boolean;
  rtMs: number | null;
  response: { pressed: boolean };
  task: { position: number; back: number; target: boolean; onMs: number; actualMs: number; frames: number };
}

test('N-Back: Tutorial, zwei Blöcke, Ergebnis, Timing', { tag: '@lang' }, async ({ page }) => {
  test.setTimeout(240_000);
  await openGame(page, 'nback');
  let last = await tutorial(page, true);

  // Block 1 (1-Back): ein Vorlauf-Feld und 20 gewertete, fehlerfrei.
  last = await playFields(page, last, 21);
  await expect(page.getByTestId('nback-between')).toContainText('Weiter mit 2-Back');
  // Block 2 (2-Back): zwei Vorlauf-Felder; ein Treffer ausgelassen, einmal Fehlalarm.
  await playFields(page, last, 22, { miss: 2, alarm: 3 });

  await expect(page.getByTestId('result-headline')).toHaveText('11 von 12');
  await expect(page.locator('.row', { hasText: 'Fehlalarme' })).toContainText('1');
  await expect(page.getByText('1-Back, 2-Back')).toBeVisible();

  // Rohdaten: 40 gewertete Felder; Treffer und Wertung stimmen, die Leuchtdauer auf ±1 Frame.
  const trials = await page.evaluate(
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
  expect(trials).toHaveLength(40);
  expect(trials.slice(0, 20).every((t) => t.kind === '1-back')).toBe(true);
  expect(trials.slice(20).every((t) => t.kind === '2-back')).toBe(true);
  for (const t of trials) {
    expect(t.task.target).toBe(t.task.position === t.task.back);
    expect(t.correct).toBe(t.response.pressed === t.task.target);
    expect(t.rtMs === null).toBe(!t.response.pressed);
    expect(Math.abs(t.task.actualMs - t.task.onMs)).toBeLessThanOrEqual(t.task.onMs / t.task.frames + 0.5);
  }

  // Zustand bleibt erhalten: Nach dem fehlerfreien ersten Block ist das Level gestiegen.
  await page.getByRole('button', { name: 'Fertig' }).click();
  await page.goto('#/spiel/nback');
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  await expect(page.getByText('Level 2', { exact: true })).toBeVisible();
});

test('N-Back: Pause verwirft die Folge, Beenden führt zurück', async ({ page }) => {
  test.setTimeout(120_000);
  await openGame(page, 'nback');
  let last = await tutorial(page, false);

  // Vier Felder: das erste ohne Wertung, danach drei gewertete.
  last = await playFields(page, last, 4);
  await expect(page.getByText(/^3 \/ 40/)).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('dialog', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();

  // Neue Folge: Das erste Feld ist wieder ein Vorlauf-Feld; die Zählung bleibt.
  last = await currentStep(page);
  const first = await nextField(page, last);
  expect(first.correct).toBeNull();
  await expect(page.getByText(/^3 \/ 40/)).toBeVisible();
  await playFields(page, first.step, 2);
  await expect(page.getByText(/^5 \/ 40/)).toBeVisible();

  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Beenden' }).click();
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
});
