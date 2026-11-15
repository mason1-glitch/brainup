import { expect, test } from '@playwright/test';
import { playArithmetic, playRotation, playUfov } from './helpers';

test('Tagesprogramm: starten, unterbrechen, am selben Tag fortsetzen, bis zum Ende spielen', async ({ page }) => {
  test.setTimeout(300_000);
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__brainupE2E = true;
  });
  await page.goto('./');

  // Plan: zwei Trainingsspiele, dann Kopfrechnen.
  await expect(page.locator('.row strong')).toHaveText(['Mentale Rotation', 'Blickfeld', 'Kopfrechnen']);
  await page.getByRole('button', { name: 'Programm starten' }).click();

  // Schritt 1 im normalen Spiel-Host.
  await expect(page.getByText('Tagesprogramm · Schritt 1 von 3')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mentale Rotation' })).toBeVisible();
  await playRotation(page);
  await expect(page.getByRole('button', { name: 'Nochmal' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page.getByText('Tagesprogramm · Schritt 2 von 3')).toBeVisible();

  // Unterbrechen: App neu laden. „Heute“ kennt den Durchlauf noch und setzt ihn fort.
  await page.goto('#/');
  await page.reload();
  await expect(page.locator('.row')).toHaveCount(3);
  await expect(page.locator('.row.done')).toHaveCount(1);
  await page.getByRole('button', { name: 'Fortsetzen' }).click();
  await expect(page.getByRole('heading', { name: 'Blickfeld' })).toBeVisible();
  await playUfov(page);
  await page.getByRole('button', { name: 'Weiter' }).click();

  await expect(page.getByText('Tagesprogramm · Schritt 3 von 3')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kopfrechnen' })).toBeVisible();
  await playArithmetic(page);
  await expect(page.getByRole('button', { name: 'Weiter' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fertig' }).click();

  // Zurück auf „Heute“: alles abgehakt.
  await expect(page.getByText('Für heute geschafft.')).toBeVisible();
  await expect(page.locator('.row.done')).toHaveCount(3);

  // Gespeichert: ein beendeter Durchlauf, dessen Schritte auf drei beendete Sitzungen zeigen.
  const stored = await page.evaluate(
    () =>
      new Promise<{ runs: { id: string; finishedAt: number | null; steps: { sessionId: string | null }[] }[]; sessions: { id: string; completed: boolean; programRunId: string | null }[] }>((resolve) => {
        const open = indexedDB.open('brainup');
        open.onsuccess = () => {
          const tx = open.result.transaction(['programRuns', 'sessions']);
          const runs = tx.objectStore('programRuns').getAll();
          const sessions = tx.objectStore('sessions').getAll();
          tx.oncomplete = () => resolve({ runs: runs.result, sessions: sessions.result });
        };
      }),
  );
  expect(stored.runs).toHaveLength(1);
  const run = stored.runs[0]!;
  expect(run.finishedAt).not.toBeNull();
  const played = stored.sessions.filter((s) => s.programRunId === run.id && s.completed).map((s) => s.id);
  expect(played).toHaveLength(3);
  expect(run.steps.map((s) => s.sessionId).sort()).toEqual([...played].sort());

  // Ein weiterer Durchlauf bringt die Trainingsspiele, die noch nicht dran waren.
  await page.getByRole('button', { name: 'Noch ein Durchlauf' }).click();
  await expect(page.getByText('Tagesprogramm · Schritt 1 von 3')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Papierfalten' })).toBeVisible();
});
