import { expect, test } from '@playwright/test';
import { drag, openGame } from './helpers';

test('Mentale Rotation: Tutorial, kompletter Lauf, Ergebnis', async ({ page }) => {
  await openGame(page, 'rotation');
  await page.getByRole('button', { name: 'Kurz üben' }).click();

  // Tutorial: drehen, Spiegelbild ansehen, zwei Übungen.
  for (const name of ['Weiter', 'Verstanden']) {
    await expect(page.getByRole('button', { name })).toBeDisabled();
    await drag(page, 'rotate-area');
    await page.getByRole('button', { name }).click();
  }
  await page.locator('[data-correct="false"]').click(); // absichtlich falsch: gleiche Übung noch einmal
  await expect(page.getByText('Das war das Spiegelbild')).toBeVisible();
  for (const n of [1, 2]) {
    await expect(page.getByText(`Übung ${n} von 2`)).toBeVisible();
    await page.locator('[data-correct="true"]:enabled').click();
  }

  // Lauf: 20 Durchgänge, 18 richtig, 2 falsch.
  for (let i = 1; i <= 20; i++) {
    await page.locator(`.board.visible [data-correct="${i % 7 === 0 ? 'false' : 'true'}"]:enabled`).click();
    await expect(page.getByText(`${i} / 20`)).toBeVisible();
  }

  await expect(page.getByTestId('result-headline')).toBeVisible();
  await expect(page.getByText('18 von 20')).toBeVisible();

  // Zustand bleibt erhalten: Level ist gestiegen, Tutorial wird nicht mehr erzwungen.
  await page.getByRole('button', { name: 'Fertig' }).click();
  await page.goto('#/spiel/rotation');
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  await expect(page.getByText('Level 1', { exact: true })).toHaveCount(0);
});

test('Mentale Rotation: Pause verwirft den Durchgang, Beenden führt zurück', async ({ page }) => {
  await openGame(page, 'rotation');
  await page.getByRole('button', { name: 'Kurz üben' }).click();
  for (const name of ['Weiter', 'Verstanden']) {
    await drag(page, 'rotate-area');
    await page.getByRole('button', { name }).click();
  }
  for (let n = 0; n < 2; n++) {
    await page.locator('[data-correct="true"]:enabled').click();
    await page.waitForTimeout(900);
  }
  await page.locator('.board.visible [data-correct="true"]:enabled').click();
  await expect(page.getByText('1 / 20')).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('dialog', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.locator('.board.visible [data-correct="true"]:enabled').click();
  await expect(page.getByText('2 / 20')).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Beenden' }).click();
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
});
