import { expect, test, type Page } from '@playwright/test';

// Heute ist Donnerstag, der 19.11.2026; die Woche reicht vom 16. bis zum 22.11.
const stamp = (month: number, day: number) => new Date(2026, month - 1, day, 10, 0, 0).getTime();
const dayOf = (month: number, day: number) => `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

interface Opts {
  gameId: string;
  mode: string;
  month: number;
  day: number;
  completed?: boolean;
  score?: number;
  level?: number;
  accuracy?: number;
  medianRtMs?: number | null;
}
const session = (id: string, o: Opts) => ({
  id,
  gameId: o.gameId,
  mode: o.mode,
  day: dayOf(o.month, o.day),
  startedAt: stamp(o.month, o.day),
  endedAt: o.completed === false ? null : stamp(o.month, o.day) + 60_000,
  completed: o.completed ?? true,
  programRunId: null,
  summary:
    o.completed === false
      ? null
      : {
          score: o.score ?? 0,
          level: o.level ?? 1,
          accuracy: o.accuracy ?? 0.8,
          medianRtMs: o.medianRtMs === undefined ? 1500 : o.medianRtMs,
          trials: 10,
          headline: { label: 'Punkte', value: String(o.score ?? 0) },
          extra: [],
        },
});
const trial = (sessionId: string, kind: string, month: number, day: number, i: number, correct: boolean, rtMs: number, difficulty: number) => ({
  sessionId,
  gameId: 'arithmetic',
  kind,
  ts: stamp(month, day) + i * 1000,
  task: { text: kind },
  response: 1,
  rtMs,
  correct,
  difficulty,
});

const BACKUP = {
  app: 'brainup',
  schemaVersion: 1,
  exportedAt: stamp(11, 19),
  tables: {
    sessions: [
      session('r-oct', { gameId: 'rotation', mode: 'standard', month: 10, day: 20, score: 40, level: 1 }),
      session('r-1', { gameId: 'rotation', mode: 'standard', month: 11, day: 15, score: 50, level: 2 }),
      session('r-2', { gameId: 'rotation', mode: 'standard', month: 11, day: 16, score: 70, level: 3 }),
      session('r-3', { gameId: 'rotation', mode: 'standard', month: 11, day: 19, score: 60, level: 4, accuracy: 0.8, medianRtMs: 1500 }),
      session('a-sprint', { gameId: 'arithmetic', mode: 'sprint', month: 11, day: 16, score: 12, level: 3 }),
      session('a-precision', { gameId: 'arithmetic', mode: 'precision', month: 11, day: 19, score: 9, level: 5, accuracy: 0.6, medianRtMs: 2400 }),
      session('r-abort', { gameId: 'rotation', mode: 'standard', month: 11, day: 18, completed: false }),
    ],
    trials: [
      // Einmaleins: 3 von 4 richtig, Median der richtigen 2000 ms, Schwierigkeit im Mittel 3.
      trial('a-sprint', 'table', 11, 16, 0, true, 1000, 2),
      trial('a-sprint', 'table', 11, 16, 1, true, 2000, 3),
      trial('a-sprint', 'table', 11, 16, 2, false, 1500, 3),
      trial('a-sprint', 'table', 11, 16, 3, true, 3000, 4),
      // Prozent: 1 von 2 richtig, 1200 ms, Schwierigkeit im Mittel 5,5.
      trial('a-precision', 'percent', 11, 19, 0, true, 1200, 5),
      trial('a-precision', 'percent', 11, 19, 1, false, 800, 6),
    ],
    gameState: [],
    settings: [],
    reviews: [],
    programRuns: [],
  },
};

async function open(page: Page, backup?: typeof BACKUP): Promise<void> {
  await page.clock.setFixedTime(new Date(2026, 10, 19, 12, 0, 0));
  if (backup) {
    await page.goto('#/einstellungen');
    await page.getByTestId('backup-file').setInputFiles({ name: 'brainup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await expect(page.getByTestId('backup-message')).toContainText('Eingelesen');
  }
  await page.goto('#/fortschritt');
}

test('Fortschritt: Woche, Kalender, Spiele, Rechenarten aus gespeicherten Daten', async ({ page }) => {
  await open(page, BACKUP);

  // Woche: 16. und 19. – der 15. gehört zur Vorwoche, der abgebrochene 18. zählt nicht.
  await expect(page.getByTestId('week-count')).toHaveText('2 von 4');
  await expect(page.getByText('Ziel: an 4 Tagen der Woche trainieren.')).toBeVisible();

  // Kalender November 2026.
  await expect(page.getByTestId('month-title')).toHaveText('November 2026');
  await expect(page.locator('[data-day][data-active="true"]')).toHaveCount(3);
  for (const d of ['15', '16', '19']) await expect(page.locator(`[data-day="2026-11-${d}"]`)).toHaveAttribute('data-active', 'true');
  await expect(page.locator('[data-day="2026-11-18"]')).toHaveAttribute('data-active', 'false');
  await expect(page.getByRole('button', { name: 'Monat vor' })).toBeDisabled();

  await page.getByRole('button', { name: 'Monat zurück' }).click();
  await expect(page.getByTestId('month-title')).toHaveText('Oktober 2026');
  await expect(page.locator('[data-day][data-active="true"]')).toHaveCount(1);
  await expect(page.locator('[data-day="2026-10-20"]')).toHaveAttribute('data-active', 'true');
  await page.getByRole('button', { name: 'Monat vor' }).click();
  await expect(page.getByTestId('month-title')).toHaveText('November 2026');

  // Spiele.
  const rotation = page.locator('[data-game="rotation"]');
  await expect(rotation).toContainText('Mentale Rotation');
  await expect(rotation).toContainText('Level 4');
  await expect(rotation).toContainText('Level-Verlauf, geglättet über drei Sitzungen');
  await expect(rotation).toContainText(/Trefferquote\s*80 %/);
  await expect(rotation).toContainText(/Median-Zeit\s*1,50 s/);
  await expect(rotation.locator('[data-best="standard"]')).toHaveText('Bestwert 70 (16.11.)');

  const arithmetic = page.locator('[data-game="arithmetic"]');
  await expect(arithmetic).toContainText('Level 5');
  await expect(arithmetic.locator('[data-best="sprint"]')).toHaveText('Bestwert Sprint 12 (16.11.)');
  await expect(arithmetic.locator('[data-best="precision"]')).toHaveText('Bestwert Präzision 9 (19.11.)');

  await expect(page.getByText(/^Noch nicht gespielt:.*Blickfeld/)).toBeVisible();
  await expect(page.getByText('Sobald du gespielt hast')).toHaveCount(0);

  // Rechenarten: genau die zwei gesäten, in der Reihenfolge der Rechenarten.
  const rows = page.locator('[data-testid="kinds"] tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toHaveAttribute('data-kind', 'table');
  await expect(rows.nth(0).locator('th')).toHaveText('Einmaleins');
  await expect(rows.nth(0).locator('td')).toHaveText(['3,0', '75 %', '2,00 s']);
  await expect(rows.nth(1).locator('th')).toHaveText('Prozent');
  await expect(rows.nth(1).locator('td')).toHaveText(['5,5', '50 %', '1,20 s']);
  await expect(page.getByText('aus den letzten 30 Tagen')).toBeVisible();

  // Kein horizontales Scrollen.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Fortschritt: ohne Daten', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('week-count')).toHaveText('0 von 4');
  await expect(page.locator('[data-day]').first()).toBeVisible();
  await expect(page.locator('[data-day][data-active="true"]')).toHaveCount(0);
  await expect(page.getByText('Sobald du gespielt hast, siehst du hier deinen Verlauf.')).toBeVisible();
  await expect(page.locator('[data-game]')).toHaveCount(0);
});
