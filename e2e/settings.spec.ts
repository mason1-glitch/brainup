import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { openGame } from './helpers';

/** Wert einer Einstellung aus IndexedDB (Schreiben braucht einen Augenblick – darauf mit `expect.poll` warten). */
const stored = (page: Page, key: string) =>
  page.evaluate(
    (k) =>
      new Promise<unknown>((resolve) => {
        const open = indexedDB.open('brainup');
        open.onsuccess = () => {
          const get = open.result.transaction('settings').objectStore('settings').get(k);
          get.onsuccess = () => resolve(get.result?.value);
        };
      }),
    key,
  );

/** Schulte bis zum ersten Fehltipp im Lauf (das Tutorial zählt nicht). */
async function schulteWrongTap(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Kurz üben' }).click();
  for (let i = 0; i < 4 + 9; i++) await page.locator('.board.visible .cell[data-correct="true"]').click();
  await page.locator('.board.visible .cell[data-correct="false"]').first().click();
  await expect(page.getByText(/Gesucht: /)).toBeVisible();
}

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

test('Bewegung reduzieren bleibt nach dem Neuladen und lässt sich wieder ausschalten', async ({ page }) => {
  await page.goto('#/einstellungen');
  const html = page.locator('html');
  const motion = page.getByRole('switch', { name: 'Bewegung reduzieren' });
  await expect(html).not.toHaveAttribute('data-motion', /.*/);
  await motion.click();
  await expect(html).toHaveAttribute('data-motion', 'reduced');
  await expect.poll(() => stored(page, 'motion')).toBe('reduced');
  await page.reload();
  await expect(html).toHaveAttribute('data-motion', 'reduced');
  await expect(motion).toBeChecked();
  await motion.click();
  await expect(html).not.toHaveAttribute('data-motion', /.*/);
});

test('Tagesprogramm: Der gewählte Umfang gilt auf der Startseite', async ({ page }) => {
  await page.goto('#/einstellungen');
  await page.getByRole('radio', { name: 'Kurz' }).click();
  await expect(page.getByText('1 Aufwärm-Spiel, 1 Trainingsspiel, 1 Runde Kopfrechnen')).toBeVisible();
  await expect.poll(() => stored(page, 'daily')).toEqual({ warmup: 1, training: 1, arithmetic: 1 });
  await page.goto('#/');
  await expect(page.getByText(/^3 Spiele nacheinander/)).toBeVisible();

  await page.goto('#/einstellungen');
  await page.getByRole('radio', { name: 'Lang' }).click();
  await expect.poll(() => stored(page, 'daily')).toEqual({ warmup: 2, training: 3, arithmetic: 1 });
  await page.goto('#/');
  await expect(page.getByText(/^6 Spiele nacheinander/)).toBeVisible();
});

test('Wochenziel: Der Wert gilt im Fortschritt und ist auf 1 bis 7 begrenzt', async ({ page }) => {
  await page.goto('#/einstellungen');
  const more = page.getByRole('button', { name: 'Wochenziel (Tage) erhöhen' });
  await more.click();
  await expect.poll(() => stored(page, 'weeklyGoal')).toBe(5);
  await page.goto('#/fortschritt');
  await expect(page.getByTestId('week-count')).toHaveText('0 von 5');

  await page.goto('#/einstellungen');
  await more.click();
  await more.click();
  await expect(more).toBeDisabled();
});

test('Erinnerung: Die Kalenderdatei hat Uhrzeit, Wochentage und bei jeder neuen Datei dieselbe Kennung', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined }));
  await page.goto('#/einstellungen');
  await page.getByLabel('Uhrzeit').fill('07:30');
  const days = page.getByRole('group', { name: 'Wochentage' });
  for (const day of ['Di', 'Do', 'Sa', 'So']) await days.getByRole('button', { name: day, exact: true }).click();

  const create = async () => {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Kalenderdatei erstellen' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('brainup-erinnerung.ics');
    return readFile(await file.path(), 'utf8');
  };
  const first = await create();
  expect(first).toMatch(/DTSTART:\d{8}T073000/);
  expect(first).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR');
  expect(first).toContain('\r\n');
  expect(first.replace(/\r\n/g, '')).not.toContain('\n');
  const uid = (text: string) => text.match(/^UID:(.+)$/m)![1]!.trim();
  expect(uid(await create())).toBe(uid(first));

  // Ohne Wochentag gibt es nichts zu erinnern.
  for (const day of ['Mo', 'Mi', 'Fr']) await days.getByRole('button', { name: day, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Kalenderdatei erstellen' })).toBeDisabled();
});

test('Vibration: Ein Fehltipp vibriert, nach dem Ausschalten nicht mehr', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __vibrations: unknown[] };
    w.__vibrations = [];
    Object.defineProperty(navigator, 'vibrate', { value: (p: unknown) => (w.__vibrations.push(p), true), configurable: true });
  });
  const count = () => page.evaluate(() => (window as unknown as { __vibrations: unknown[] }).__vibrations.length);

  await openGame(page, 'schulte');
  await schulteWrongTap(page);
  await expect.poll(count).toBeGreaterThan(0);

  await page.goto('#/einstellungen');
  await page.getByRole('switch', { name: 'Vibration' }).click();
  await expect.poll(() => stored(page, 'haptics')).toBe(false);
  const before = await count();
  await page.goto('#/spiel/schulte');
  await page.getByRole('button', { name: 'Start' }).click();
  await page.locator('.board.visible .cell[data-correct="false"]').first().click();
  await expect(page.getByText(/Gesucht: /)).toBeVisible();
  expect(await count()).toBe(before);
});

test('Ton: Mit eingeschaltetem Ton klingt eine Rückmeldung', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __tones: number };
    w.__tones = 0;
    const create = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (this: AudioContext) {
      w.__tones++;
      return create.call(this);
    };
  });
  const tones = () => page.evaluate(() => (window as unknown as { __tones: number }).__tones);

  await openGame(page, 'schulte');
  await page.goto('#/einstellungen');
  await page.getByRole('switch', { name: 'Ton' }).click();
  await expect.poll(() => stored(page, 'sound')).toBe(true);
  await page.goto('#/spiel/schulte');
  await schulteWrongTap(page);
  await expect.poll(tones).toBeGreaterThan(0);
});
