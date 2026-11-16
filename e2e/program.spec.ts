import { expect, test } from '@playwright/test';
import { playArithmetic, playRotation, playSchulte, playUfov } from './helpers';

test('Tagesprogramm: starten, unterbrechen, am selben Tag fortsetzen, bis zum Ende spielen', async ({ page }) => {
  test.setTimeout(300_000);
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__brainupE2E = true;
  });
  // Feste Uhrzeit am Mittag: Ein Durchlauf gilt nur am selben Tag – läuft der Test über Mitternacht,
  // würde er sonst scheitern. Timer und Bildtakt laufen normal weiter.
  await page.clock.setFixedTime(new Date(2026, 5, 15, 12, 0, 0));
  await page.goto('./');
  await expect(page.getByText('Montag, 15. Juni')).toBeVisible();

  // Plan: ein Aufwärm-Spiel, zwei Trainingsspiele, dann Kopfrechnen.
  await expect(page.getByText('4 Spiele nacheinander: Aufwärmen, Training, Kopfrechnen.')).toBeVisible();
  await expect(page.locator('.row strong')).toHaveText(['Zahlensuche', 'Mentale Rotation', 'Blickfeld', 'Kopfrechnen']);
  await page.getByRole('button', { name: 'Programm starten' }).click();

  // Schritt 1 im normalen Spiel-Host: Aufwärmen.
  await expect(page.getByText('Tagesprogramm · Schritt 1 von 4')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Zahlensuche' })).toBeVisible();
  await playSchulte(page);
  await expect(page.getByRole('button', { name: 'Nochmal' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Weiter' }).click();

  await expect(page.getByText('Tagesprogramm · Schritt 2 von 4')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mentale Rotation' })).toBeVisible();
  await playRotation(page);
  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page.getByText('Tagesprogramm · Schritt 3 von 4')).toBeVisible();

  // Unterbrechen: App neu laden. „Heute“ kennt den Durchlauf noch und setzt ihn fort.
  await page.goto('#/');
  await page.reload();
  await expect(page.getByText('Montag, 15. Juni')).toBeVisible();
  await expect(page.locator('.row')).toHaveCount(4);
  await expect(page.locator('.row.done')).toHaveCount(2);
  await page.getByRole('button', { name: 'Fortsetzen' }).click();
  await expect(page.getByRole('heading', { name: 'Blickfeld' })).toBeVisible();
  await playUfov(page);
  await page.getByRole('button', { name: 'Weiter' }).click();

  await expect(page.getByText('Tagesprogramm · Schritt 4 von 4')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kopfrechnen' })).toBeVisible();
  await playArithmetic(page);
  await expect(page.getByRole('button', { name: 'Weiter' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fertig' }).click();

  // Zurück auf „Heute“: alles abgehakt.
  await expect(page.getByText('Für heute geschafft.')).toBeVisible();
  await expect(page.locator('.row.done')).toHaveCount(4);

  // Gespeichert: ein beendeter Durchlauf, dessen Schritte auf vier beendete Sitzungen zeigen.
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
  expect(played).toHaveLength(4);
  expect(run.steps.map((s) => s.sessionId).sort()).toEqual([...played].sort());

  // Ein weiterer Durchlauf bringt die Trainingsspiele, die noch nicht dran waren.
  await page.getByRole('button', { name: 'Noch ein Durchlauf' }).click();
  await expect(page.getByText('Tagesprogramm · Schritt 1 von 4')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Blockfolge' })).toBeVisible();
  await page.goto('#/');
  await expect(page.locator('.row strong')).toHaveText(['Blockfolge', 'Papierfalten', 'Schnittansichten', 'Kopfrechnen']);
});
