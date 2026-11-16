import type { Page } from '@playwright/test';

/** Schaltet den Bot-Modus ein: Spiele markieren die richtige Antwort mit `data-correct`. */
export async function openGame(page: Page, id: string): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__brainupE2E = true;
  });
  await page.goto(`#/spiel/${id}`);
}

/** Wischt über ein Element (für Dreh-Gesten). */
export async function drag(page: Page, testId: string): Promise<void> {
  const box = (await page.getByTestId(testId).boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x - 60, y - 30);
  await page.mouse.down();
  await page.mouse.move(x + 60, y + 40, { steps: 8 });
  await page.mouse.up();
}

// ---------- Bots, die ein Spiel von der Einstiegsseite bis zum Ergebnis fehlerfrei spielen ----------
// Voraussetzung: Bot-Modus an (`__brainupE2E`), Einstiegsseite des Spiels offen, Tutorial noch nicht gespielt.

export async function playSchulte(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Kurz üben' }).click();
  // Tutorial (4 + 9 Zahlen), dann drei Tafeln: zweimal 3×3, einmal 4×4.
  for (let i = 0; i < 4 + 9 + 9 + 9 + 16; i++) await page.locator('.board.visible .cell[data-correct="true"]').click();
  await page.getByTestId('result-headline').waitFor();
}

export async function playRotation(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Kurz üben' }).click();
  for (const name of ['Weiter', 'Verstanden']) {
    await drag(page, 'rotate-area');
    await page.getByRole('button', { name }).click();
  }
  for (const n of [1, 2]) {
    await page.getByText(`Übung ${n} von 2`).waitFor();
    await page.locator('[data-correct="true"]:enabled').click();
  }
  for (let i = 1; i <= 20; i++) {
    await page.locator('.board.visible [data-correct="true"]:enabled').click();
    await page.getByText(`${i} / 20`).waitFor();
  }
  await page.getByTestId('result-headline').waitFor();
}

export async function playUfov(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Kurz üben' }).click();
  // 3 Tutorial-Schritte, dann 30 Durchgänge.
  for (let i = 0; i < 33; i++) {
    const field = page.locator('.field[data-phase="respond"]');
    await field.locator('.choice[data-correct="true"]').click();
    const spot = field.locator('.spot[data-correct="true"]');
    if (await spot.count()) await spot.click();
  }
  await page.getByTestId('result-headline').waitFor();
}

export async function playArithmetic(page: Page): Promise<void> {
  // Zeitlimit nur im Sprint: Läuft die Zeit mitten im Tippen ab, verschwindet die Tastatur.
  const type = async (input: string, timeout?: number) => {
    for (const key of [...input, 'ok']) await page.locator(`.key[data-key="${key}"]`).click({ timeout });
  };
  await page.getByRole('button', { name: 'Kurz üben' }).click();
  await type('13');
  await page.getByRole('heading', { name: 'Mit Komma' }).waitFor();
  await type('0,5');
  await page.getByRole('heading', { name: 'Überschlag' }).waitFor();
  await type('1000');
  // Sprint: Lösung aus data-answer lesen und tippen, bis die Zeit um ist.
  const result = page.getByTestId('result-headline');
  while (!(await result.isVisible())) {
    const prompt = await page.locator('.prompt.visible').elementHandle({ timeout: 2000 }).catch(() => null);
    const answer = await prompt?.getAttribute('data-answer').catch(() => null);
    if (!prompt || !answer) continue;
    if (await type(answer, 3000).then(() => true, () => false)) await prompt.waitForElementState('hidden', { timeout: 5000 }).catch(() => {});
  }
}
