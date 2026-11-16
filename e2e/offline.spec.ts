import { expect, test } from '@playwright/test';
import { drag } from './helpers';

test('PWA: Manifest passt zu GitHub Pages unter /brainup/ und alle Icons sind erreichbar', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe('/brainup/manifest.webmanifest');
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({ name: 'BrainUp', start_url: '/brainup/', scope: '/brainup/', display: 'standalone', lang: 'de' });
  expect(manifest.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes} ${i.purpose}`).sort()).toEqual([
    '192x192 any',
    '512x512 any',
    '512x512 maskable',
  ]);
  const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  for (const src of [...manifest.icons.map((i: { src: string }) => i.src), touchIcon!]) {
    const res = await request.get(new URL(src, 'http://localhost:4173/brainup/').href);
    expect(res.ok(), src).toBe(true);
    expect(res.headers()['content-type']).toBe('image/png');
  }
});

test('Offline: nach dem ersten Besuch lädt die App ohne Netz und ein Spiel läuft komplett durch', async ({ page, context }) => {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__brainupE2E = true;
  });
  // Erster Besuch mit Netz: Der Service Worker installiert sich (Precache vollständig) und übernimmt die Seite.
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);

  // Neu laden ohne Netz: Startseite kommt aus dem Cache.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Heute' })).toBeVisible();
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);

  // Direkt in ein Spiel einsteigen und neu laden – auch das ohne Netz.
  await page.goto('#/spiel/rotation');
  await page.reload();
  await page.getByRole('button', { name: 'Kurz üben' }).click();
  for (const name of ['Weiter', 'Verstanden']) {
    await drag(page, 'rotate-area');
    await page.getByRole('button', { name }).click();
  }
  for (const n of [1, 2]) {
    await expect(page.getByText(`Übung ${n} von 2`)).toBeVisible();
    await page.locator('[data-correct="true"]:enabled').click();
  }
  for (let i = 1; i <= 20; i++) {
    await page.locator('.board.visible [data-correct="true"]:enabled').click();
    await expect(page.getByText(`${i} / 20`)).toBeVisible();
  }
  await expect(page.getByTestId('result-headline')).toBeVisible();
  await expect(page.getByText('20 von 20')).toBeVisible();

  // Gespeichert wurde lokal: Nach erneutem Laden (weiter offline) ist das Level gestiegen.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  await expect(page.getByText('Level 1', { exact: true })).toHaveCount(0);
});
