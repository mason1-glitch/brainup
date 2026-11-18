import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { playSchulte } from './helpers';

// Barrierefreiheit mit axe-core: keine Verstöße der Stufen `serious` und `critical`,
// im hellen und im dunklen Schema, auf allen Seiten und in jedem Spiel (Einstieg, Tutorial, laufender Reiz).

const SCHEMES = ['light', 'dark'] as const;

/** Prüft die aktuelle Seite; die Fehlermeldung nennt Regel, Beschreibung und betroffene Elemente. */
async function expectNoViolations(page: Page, what: string): Promise<void> {
  // Einblend-Animationen abwarten: Mitten im Einblenden misst axe Mischfarben statt der Tokenfarben.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  const { violations } = await new AxeBuilder({ page }).analyze();
  const severe = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = severe
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.help}\n` +
        v.nodes.map((n) => `    ${n.target.join(' ')}\n      ${n.html.slice(0, 160)}\n      ${n.failureSummary?.replace(/\n/g, ' | ')}`).join('\n'),
    )
    .join('\n');
  expect(severe.length, `${what}: axe-Verstöße\n${report}`).toBe(0);
}

async function enableBot(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__brainupE2E = true;
  });
}

/** Legt für das Spiel einen Zustand mit erledigtem Tutorial ab, damit „Start“ gleich den Lauf beginnt. */
async function skipTutorial(page: Page, gameId: string): Promise<void> {
  await page.goto('#/spiele');
  await page.evaluate(
    (id) =>
      new Promise<void>((resolve, reject) => {
        const attempt = (left: number) => {
          const open = indexedDB.open('brainup');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            if (!db.objectStoreNames.contains('gameState')) {
              db.close();
              return left > 0 ? void setTimeout(() => attempt(left - 1), 100) : reject(new Error('gameState fehlt'));
            }
            const tx = db.transaction('gameState', 'readwrite');
            tx.objectStore('gameState').put({ gameId: id, stateVersion: 0, state: null, tutorialDone: true, updatedAt: 1 });
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        };
        attempt(30);
      }),
    gameId,
  );
}

const tabPages = ['#/', '#/spiele', '#/fortschritt', '#/einstellungen', '#/dev/timing'];

// Selektor des sichtbaren Reizes im laufenden Lauf je Spiel.
const stimulus: Record<string, string> = {
  rotation: '.board.visible',
  ufov: '.field[data-phase="respond"]',
  paperfold: '.board.visible',
  sections: '.board.visible',
  arithmetic: '.prompt.visible',
  schulte: '.board.visible',
  corsi: '.board[data-phase="respond"]',
  flanker: '.board[data-phase="respond"]',
  nback: '.board[data-step]',
  taskswitch: '.board[data-phase="respond"]',
};

for (const scheme of SCHEMES) {
  test.describe(`axe ${scheme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
    });

    for (const route of tabPages) {
      test(`Seite ${route}`, async ({ page }) => {
        await page.goto(route);
        await page.locator('#app > *').first().waitFor();
        await expectNoViolations(page, route);
      });
    }

    for (const id of Object.keys(stimulus)) {
      test(`Spiel ${id}: Einstieg, Tutorial, Lauf`, async ({ page }) => {
        await enableBot(page);
        await page.goto(`#/spiel/${id}`);
        await page.getByRole('button', { name: 'Kurz üben' }).waitFor();
        await expectNoViolations(page, `${id} Einstieg`);

        await page.getByRole('button', { name: 'Kurz üben' }).click();
        await page.getByRole('button', { name: 'Anleitung schließen' }).waitFor();
        await page.locator('.tutorial-body *').first().waitFor();
        await expectNoViolations(page, `${id} Tutorial`);

        await skipTutorial(page, id);
        await page.goto(`#/spiel/${id}`);
        if (id === 'arithmetic') await page.getByRole('button', { name: 'Ohne Einstufung' }).click();
        await page.getByRole('button', { name: 'Start', exact: true }).click();
        await page.locator(stimulus[id]).first().waitFor({ timeout: 15_000 });
        await expectNoViolations(page, `${id} Lauf`);
      });
    }

    test('Ergebnisbildschirm (Schulte)', async ({ page }) => {
      await enableBot(page);
      await page.goto('#/spiel/schulte');
      await playSchulte(page);
      await expectNoViolations(page, 'Ergebnis');
    });
  });
}
