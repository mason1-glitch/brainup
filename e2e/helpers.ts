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
