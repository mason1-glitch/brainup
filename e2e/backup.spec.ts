import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

// Kleine Sicherung von Hand: zwei Sitzungen, drei Durchgänge, je ein Eintrag in den übrigen Tabellen.
const session = (id: string, startedAt: number) => ({
  id, gameId: 'rotation', mode: 'standard', day: '2026-11-15', startedAt, endedAt: startedAt + 500,
  completed: true, programRunId: null, summary: null,
});
const trial = (sessionId: string, ts: number) => ({
  sessionId, gameId: 'rotation', kind: '', ts, task: { arms: 3, angle: 90, text: 'äöü' }, response: 1, rtMs: 812.5, correct: true, difficulty: 2,
});
const BACKUP = {
  app: 'brainup',
  schemaVersion: 1,
  exportedAt: 1_794_000_000_000,
  tables: {
    trials: [trial('s-1', 1001), trial('s-1', 1002), trial('s-2', 2001)],
    sessions: [session('s-1', 1000), session('s-2', 2000)],
    gameState: [{ gameId: 'rotation', stateVersion: 1, state: null, tutorialDone: true, updatedAt: 2500 }],
    settings: [{ key: 'theme', value: 'dark' }],
    reviews: [{ key: 'mul:7x13', gameId: 'arithmetic', kind: 'mul', task: null, due: 5, intervalDays: 1, streak: 0, lapses: 1 }],
    programRuns: [{ id: 'r-1', day: '2026-11-15', startedAt: 900, finishedAt: null, steps: [{ gameId: 'rotation', mode: 'standard', sessionId: 's-1' }] }],
  },
};

async function importFile(page: Page, content: string): Promise<void> {
  await page.getByTestId('backup-file').setInputFiles({ name: 'brainup.json', mimeType: 'application/json', buffer: Buffer.from(content) });
}

/** Ohne Teilen-Menü (Mac, Android-Browser ohne Dateifreigabe): Die Sicherung kommt als Download. */
async function exportByDownload(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Sicherung erstellen' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Datei speichern' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^brainup-\d{4}-\d{2}-\d{2}\.json$/);
  return readFile(await file.path(), 'utf8');
}

test('Sicherung: einlesen, als Datei exportieren, in leere App einlesen – nichts geht verloren', async ({ page, browser }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined }));
  await page.goto('#/einstellungen');
  const message = page.getByTestId('backup-message');

  await importFile(page, JSON.stringify(BACKUP));
  await expect(message).toHaveText('Eingelesen. Neu dazugekommen: 2 Sitzungen, 3 Durchgänge.');
  // Das dunkle Design aus der Sicherung gilt, weil auf dem Gerät noch nichts eingestellt war – nach dem nächsten Laden.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // Noch einmal dieselbe Datei: nichts doppelt.
  await importFile(page, JSON.stringify(BACKUP));
  await expect(message).toHaveText('Eingelesen. Neu dazugekommen: 0 Sitzungen, 0 Durchgänge.');

  const exported = await exportByDownload(page);
  await expect(message).toHaveText('Sicherung bereit: 2 Sitzungen, 3 Durchgänge.');
  expect(JSON.parse(exported).tables).toEqual(BACKUP.tables);

  // Frisches Gerät: die exportierte Datei einlesen und wieder exportieren.
  const other = await (await browser.newContext()).newPage();
  await other.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined }));
  await other.goto('http://localhost:4173/brainup/#/einstellungen');
  await importFile(other, exported);
  await expect(other.getByTestId('backup-message')).toHaveText('Eingelesen. Neu dazugekommen: 2 Sitzungen, 3 Durchgänge.');
  expect(JSON.parse(await exportByDownload(other)).tables).toEqual(BACKUP.tables);
  // Die eingelesenen Daten sind in der App angekommen: Das Tutorial der Rotation gilt als gespielt.
  await other.goto('http://localhost:4173/brainup/#/spiel/rotation');
  await expect(other.getByRole('button', { name: 'Start' })).toBeVisible();
});

test('Sicherung auf dem iPhone: Die Datei geht ans Teilen-Menü', async ({ page }) => {
  // Das Teilen-Menü selbst gehört dem System – geprüft wird, dass genau die Sicherungsdatei übergeben wird.
  await page.addInitScript(() => {
    const w = window as unknown as { shared: Promise<string> | null };
    w.shared = null;
    Object.defineProperty(navigator, 'canShare', { value: (data: ShareData) => (data.files?.length ?? 0) === 1 });
    Object.defineProperty(navigator, 'share', {
      value: async (data: ShareData) => {
        const file = data.files![0]!;
        w.shared = file.text().then((text) => JSON.stringify({ name: file.name, type: file.type, text }));
      },
    });
  });
  await page.goto('#/einstellungen');
  await importFile(page, JSON.stringify(BACKUP));
  await expect(page.getByTestId('backup-message')).toContainText('Eingelesen');
  await page.getByRole('button', { name: 'Sicherung erstellen' }).click();
  await expect(page.getByText('Im Teilen-Menü „In Dateien sichern“ wählen.')).toBeVisible();
  await page.getByRole('button', { name: 'Datei speichern' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { shared: unknown }).shared !== null)).toBe(true);
  const shared = JSON.parse(await page.evaluate(() => (window as unknown as { shared: Promise<string> }).shared));
  expect(shared.name).toMatch(/^brainup-\d{4}-\d{2}-\d{2}\.json$/);
  expect(shared.type).toBe('application/json');
  expect(JSON.parse(shared.text).tables).toEqual(BACKUP.tables);
});

test('Sicherung: Eine fremde Datei wird abgelehnt und ändert nichts', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined }));
  await page.goto('#/einstellungen');
  const message = page.getByTestId('backup-message');
  await importFile(page, JSON.stringify(BACKUP));
  await expect(message).toContainText('Eingelesen');
  await importFile(page, 'kein json');
  await expect(message).toHaveText('Die Datei ist keine BrainUp-Sicherung.');
  await importFile(page, JSON.stringify({ ...BACKUP, schemaVersion: 99 }));
  await expect(message).toContainText('neueren Version der App');
  expect(JSON.parse(await exportByDownload(page)).tables).toEqual(BACKUP.tables);
});
