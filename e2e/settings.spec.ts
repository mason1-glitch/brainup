import { expect, test } from '@playwright/test';

test('Einstellungen zeigen, ob der Browser die Daten dauerhaft behält', async ({ page }) => {
  await page.goto('#/einstellungen');
  const note = page.getByTestId('persistence');
  await expect(note).toBeVisible();
  // Was der Browser antwortet, hängt von der Umgebung ab – angezeigt wird genau diese Antwort.
  const answer = await page.evaluate(async () =>
    navigator.storage?.persist ? ((await navigator.storage.persist()) ? 'granted' : 'denied') : 'unsupported',
  );
  await expect(note).toHaveAttribute('data-persistence', answer);
});
