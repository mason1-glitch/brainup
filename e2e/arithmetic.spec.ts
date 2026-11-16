import { expect, test, type Page } from '@playwright/test';
import { openGame } from './helpers';

/**
 * Tippt eine Eingabe auf der Zahlentastatur und bestätigt.
 * @param timeout nur im Sprint kurz: Läuft die Zeit mitten im Tippen ab, verschwindet die Tastatur.
 */
async function type(page: Page, input: string, timeout?: number): Promise<void> {
  for (const key of [...input, 'ok']) await page.locator(`.key[data-key="${key}"]`).click({ timeout });
}

test('Kopfrechnen: Tutorial, 60-s-Sprint, Ergebnis', async ({ page }) => {
  await openGame(page, 'arithmetic');
  await page.getByRole('button', { name: 'Ohne Einstufung' }).click();
  await page.getByRole('button', { name: 'Kurz üben' }).click();

  // Tutorial: erst ein Fehler (Lösung erscheint, Aufgabe kommt wieder), dann drei richtige Schritte.
  await type(page, '12');
  await expect(page.getByText('Richtig: 13')).toBeVisible();
  await expect(page.getByText('Richtig: 13')).toBeHidden();
  await type(page, '13');
  await expect(page.getByRole('heading', { name: 'Mit Komma' })).toBeVisible();
  await type(page, '0,5');
  await expect(page.getByRole('heading', { name: 'Überschlag' })).toBeVisible();
  await type(page, '1000');

  // Sprint: Der Bot liest die Lösung aus data-answer und tippt sie; jede fünfte Antwort ist falsch.
  const result = page.getByTestId('result-headline');
  let answered = 0;
  let sentWrong = 0;
  while (!(await result.isVisible())) {
    const prompt = await page.locator('.prompt.visible').elementHandle({ timeout: 2000 }).catch(() => null);
    const answer = await prompt?.getAttribute('data-answer').catch(() => null);
    if (!prompt || !answer) continue;
    const wrong = (answered + 1) % 5 === 0;
    const sent = await type(page, wrong ? '99999999' : answer, 3000).then(() => true, () => false);
    if (!sent) continue;
    answered++;
    if (wrong) sentWrong++;
    // Warten, bis diese Aufgabe verschwunden ist (nächste Aufgabe oder Ergebnis).
    await prompt.waitForElementState('hidden', { timeout: 5000 }).catch(() => {});
  }

  expect(answered).toBeGreaterThan(8);
  await expect(result).toHaveText(/^\d+$/);
  await expect(page.getByText(/\d+ von \d+/)).toBeVisible();

  // Rohdaten: jede Antwort gespeichert; Fehler stehen in der Wiederholungsliste.
  const counts = await page.evaluate(
    () =>
      new Promise<{ trials: number; wrong: number; reviews: number }>((resolve) => {
        const open = indexedDB.open('brainup');
        open.onsuccess = () => {
          const tx = open.result.transaction(['trials', 'reviews']);
          const trials = tx.objectStore('trials').getAll();
          const reviews = tx.objectStore('reviews').count();
          tx.oncomplete = () =>
            resolve({ trials: trials.result.length, wrong: trials.result.filter((t) => !t.correct).length, reviews: reviews.result });
        };
      }),
  );
  // Die letzte Eingabe kann mit dem Zeitablauf zusammenfallen – daher ±1.
  expect(Math.abs(counts.trials - answered)).toBeLessThanOrEqual(1);
  expect(Math.abs(counts.wrong - sentWrong)).toBeLessThanOrEqual(1);
  expect(counts.reviews).toBeGreaterThan(0);
});

/** Spielt das Tutorial fehlerfrei; danach beginnt der Lauf im gewählten Modus. */
async function tutorial(page: Page, skipPlacement = true): Promise<void> {
  // Beim allerersten Mal bietet das Spiel eine Einstufung an; die meisten Läufe hier prüfen einen bestimmten Modus.
  if (skipPlacement) await page.getByRole('button', { name: 'Ohne Einstufung' }).click();
  await page.getByRole('button', { name: 'Kurz üben' }).click();
  await type(page, '13');
  await expect(page.getByRole('heading', { name: 'Mit Komma' })).toBeVisible();
  await type(page, '0,5');
  await expect(page.getByRole('heading', { name: 'Überschlag' })).toBeVisible();
  await type(page, '1000');
}

/** Beantwortet die sichtbare Aufgabe und wartet, bis sie verschwunden ist. Liefert ihren Text. */
async function solve(page: Page, wrong = false): Promise<string> {
  const prompt = await page.locator('.prompt.visible').elementHandle();
  const answer = (await prompt!.getAttribute('data-answer'))!;
  const text = (await (await prompt!.$('.task'))!.innerText()).trim();
  await type(page, wrong ? '99999999' : answer);
  if (wrong) {
    // Ohne Uhr bleibt nach einem Fehler der Rechentrick stehen, bis man weitertippt – wenn es für die Aufgabe einen gibt.
    const next = page.getByTestId('trick').getByRole('button', { name: 'Weiter' });
    await Promise.race([prompt!.waitForElementState('hidden').catch(() => {}), next.waitFor().catch(() => {})]);
    if (await next.isVisible()) await next.click();
  }
  await prompt!.waitForElementState('hidden');
  return text;
}

interface StoredReview {
  due: number;
  task: { text: string };
}

const storedReviews = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<StoredReview[]>((resolve) => {
        const open = indexedDB.open('brainup');
        open.onsuccess = () => {
          const all = open.result.transaction('reviews').objectStore('reviews').getAll();
          all.onsuccess = () => resolve(all.result);
        };
      }),
  );

test('Kopfrechnen: Präzision – 15 Aufgaben ohne Uhr, Fehler landen in der Wiederholungsliste', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__brainupE2E = true;
  });
  await page.goto('#/spiel/arithmetic?mode=precision');
  // Erst ohne Einstufung erscheint die Modusauswahl; der Modus aus der Adresse ist vorgewählt.
  await page.getByRole('button', { name: 'Ohne Einstufung' }).click();
  await expect(page.getByRole('radio', { name: 'Präzision' })).toBeChecked();
  await tutorial(page, false);

  await expect(page.getByText('0 / 15')).toBeVisible();
  for (let i = 1; i <= 15; i++) {
    await solve(page, i === 4 || i === 9);
    if (i < 15) await expect(page.getByText(`${i} / 15`)).toBeVisible();
  }
  await expect(page.getByTestId('result-headline')).toHaveText(/^\d+$/);
  await expect(page.getByText('13 von 15')).toBeVisible();

  const sessions = await page.evaluate(
    () =>
      new Promise<{ mode: string; completed: boolean }[]>((resolve) => {
        const open = indexedDB.open('brainup');
        open.onsuccess = () => {
          const all = open.result.transaction('sessions').objectStore('sessions').getAll();
          all.onsuccess = () => resolve(all.result);
        };
      }),
  );
  expect(sessions).toEqual([expect.objectContaining({ mode: 'precision', completed: true })]);
  // Ohne Uhr gibt es kein „langsam“: In der Liste stehen nur die falschen Aufgaben.
  const reviews = await storedReviews(page);
  expect(reviews.length).toBeGreaterThanOrEqual(1);
  expect(reviews.length).toBeLessThanOrEqual(2);
});

test('Kopfrechnen: Fehlertraining bringt falsche Aufgaben wieder, sobald sie fällig sind', async ({ page }) => {
  const start = new Date(2026, 5, 15, 12, 0, 0).getTime();
  const MINUTE = 60_000;
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__brainupE2E = true;
  });
  await page.clock.setFixedTime(start);
  await page.goto('#/spiel/arithmetic?mode=review');
  await tutorial(page);

  // Noch nie etwas falsch gemacht: nichts fällig, zurück zur Einstiegsseite – ohne Ergebnis.
  await expect(page.getByRole('heading', { name: 'Nichts fällig' })).toBeVisible();
  await page.getByRole('button', { name: 'Zurück', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();

  // Präzision mit drei Fehlern.
  await page.getByRole('radio', { name: 'Präzision' }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  const missed: string[] = [];
  for (let i = 1; i <= 15; i++) {
    const wrong = i === 2 || i === 7 || i === 12;
    const text = await solve(page, wrong);
    if (wrong) missed.push(text);
  }
  await expect(page.getByTestId('result-headline')).toBeVisible();
  await page.getByRole('button', { name: 'Nochmal' }).waitFor();

  // Fünf Minuten später ist noch nichts fällig.
  await page.clock.setFixedTime(start + 5 * MINUTE);
  await page.goto('#/spiel/arithmetic?mode=review');
  await page.reload();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { name: 'Nichts fällig' })).toBeVisible();
  await page.getByRole('button', { name: 'Zurück', exact: true }).click();

  // Nach elf Minuten sind die falschen Aufgaben dran (kam eine davon später noch einmal und war richtig, erst morgen).
  await page.clock.setFixedTime(start + 11 * MINUTE);
  const due = (await storedReviews(page)).filter((r) => r.due <= start + 11 * MINUTE).map((r) => r.task.text.trim());
  expect(due.length).toBeGreaterThanOrEqual(1);
  expect(due.length).toBeLessThanOrEqual(3);
  for (const text of due) expect(missed).toContain(text);
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText(`0 / ${due.length}`)).toBeVisible();
  const asked: string[] = [];
  for (let i = 0; i < due.length; i++) asked.push(await solve(page, i === 0));
  expect([...asked].sort()).toEqual([...due].sort());
  await expect(page.getByTestId('result-headline')).toBeVisible();
  await expect(page.getByText(`${due.length - 1} von ${due.length}`)).toBeVisible();

  // Die eben falsch beantwortete kommt in zehn Minuten wieder, die richtigen frühestens morgen.
  const after = await storedReviews(page);
  const soon = after.filter((r) => r.due <= start + 22 * MINUTE).map((r) => r.task.text.trim());
  expect(soon).toEqual([asked[0]]);
  for (const r of after.filter((x) => x.task.text.trim() !== asked[0])) expect(r.due).toBeGreaterThanOrEqual(start + 24 * 60 * MINUTE);
});

test('Kopfrechnen: In den Einstellungen gewählte Rechenarten gelten für den Lauf', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__brainupE2E = true;
  });
  await page.goto('#/einstellungen');
  const kind = (name: string) => page.getByRole('switch', { name, exact: true });
  await expect(kind('Einmaleins')).toBeChecked();
  for (const name of ['Addition', 'Subtraktion', 'Multiplikation', 'Division', 'Quadrate und Wurzeln', 'Brüche und Dezimalzahlen', 'Zehnerpotenzen', 'Überschlag']) {
    await kind(name).click();
    await expect(kind(name)).not.toBeChecked();
  }
  // Die letzte eingeschaltete lässt sich nicht ausschalten.
  await kind('Prozent').click();
  await expect(kind('Einmaleins')).toBeChecked();
  await expect(kind('Einmaleins')).toBeDisabled();
  await kind('Prozent').click();
  await expect(kind('Einmaleins')).toBeEnabled();

  // Die Auswahl ist gespeichert (erst nachsehen, dann neu laden – das Schreiben braucht einen Augenblick).
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<unknown>((resolve) => {
            const open = indexedDB.open('brainup');
            open.onsuccess = () => {
              const get = open.result.transaction('settings').objectStore('settings').get('arithmetic.kinds');
              get.onsuccess = () => resolve(get.result?.value);
            };
          }),
      ),
    )
    .toEqual(['table', 'percent']);
  await page.reload();
  await expect(kind('Prozent')).toBeChecked();
  await expect(kind('Addition')).not.toBeChecked();

  await page.goto('#/spiel/arithmetic?mode=precision');
  await tutorial(page);
  // Erst wenn der Lauf begonnen hat, steht die erste Aufgabe des Laufs da (vorher noch die letzte des Tutorials).
  await expect(page.getByText('0 / 15')).toBeVisible();
  for (let i = 1; i <= 15; i++) await solve(page);
  await expect(page.getByTestId('result-headline')).toBeVisible();
  const kinds = await page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const open = indexedDB.open('brainup');
        open.onsuccess = () => {
          const all = open.result.transaction('trials').objectStore('trials').getAll();
          all.onsuccess = () => resolve(all.result.map((t: { kind: string }) => t.kind));
        };
      }),
  );
  expect(kinds).toHaveLength(15);
  expect(new Set(kinds)).toEqual(new Set(['table', 'percent']));
  // Bei zwei Rechenarten wechseln sie sich ab.
  for (let i = 1; i < kinds.length; i++) expect(kinds[i]).not.toBe(kinds[i - 1]);
});

test('Kopfrechnen: Nach einem Fehler erscheint ein Rechentrick – abschaltbar', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__brainupE2E = true;
  });
  // Nur Multiplikation: Dort gibt es zu jeder Aufgabe einen Rechenweg.
  await page.goto('#/einstellungen');
  for (const name of ['Einmaleins', 'Addition', 'Subtraktion', 'Division', 'Prozent', 'Quadrate und Wurzeln', 'Brüche und Dezimalzahlen', 'Zehnerpotenzen', 'Überschlag']) {
    await page.getByRole('switch', { name, exact: true }).click();
  }
  await expect(page.getByRole('switch', { name: 'Rechentrick nach Fehlern' })).toBeChecked();

  await page.goto('#/spiel/arithmetic?mode=precision');
  await tutorial(page);
  await expect(page.getByText('0 / 15')).toBeVisible();
  const task = (await page.locator('.prompt.visible .task').innerText()).trim();
  const [a, b] = task.split(' × ').map(Number);
  await type(page, '99999999');
  const trick = page.getByTestId('trick');
  await expect(trick).toBeVisible();
  // Der Rechenweg gehört zu dieser Aufgabe und endet bei ihrem Ergebnis; die Tastatur ist so lange weg.
  await expect(trick.locator('.lines')).toHaveText(new RegExp(`= ${a! * b!}$`));
  await expect(page.getByText(`Richtig: ${a! * b!}`)).toBeVisible();
  await expect(page.locator('.key[data-key="ok"]')).toBeHidden();
  await expect(page.getByText('1 / 15')).toBeVisible();
  await trick.getByRole('button', { name: 'Weiter' }).click();
  await expect(trick).toHaveCount(0);
  await expect(page.locator('.prompt.visible .task')).not.toHaveText(task);

  // Abgeschaltet: Nach einem Fehler geht es von selbst weiter.
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Beenden' }).click();
  await page.goto('#/einstellungen');
  await page.getByRole('switch', { name: 'Rechentrick nach Fehlern' }).click();
  await expect(page.getByRole('switch', { name: 'Rechentrick nach Fehlern' })).not.toBeChecked();
  await page.goto('#/spiel/arithmetic?mode=precision');
  // Noch kein Lauf wurde beendet – die Einstufung wird wieder angeboten.
  await page.getByRole('button', { name: 'Ohne Einstufung' }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  const prompt = await page.locator('.prompt.visible').elementHandle();
  await type(page, '99999999');
  await prompt!.waitForElementState('hidden');
  await expect(page.getByTestId('trick')).toHaveCount(0);
  await expect(page.getByText('1 / 15')).toBeVisible();
});

test('Kopfrechnen: Einstufung beim ersten Mal setzt die Startlevel', async ({ page }) => {
  await openGame(page, 'arithmetic');
  await expect(page.getByText('Zuerst eine kurze Einstufung')).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Modus' })).toHaveCount(0);
  await tutorial(page, false);

  // 20 Aufgaben: je Rechenart erst Level 4, dann – weil der Bot richtig und schnell antwortet – Level 7.
  await expect(page.getByText('0 / 20')).toBeVisible();
  for (let i = 1; i <= 20; i++) await solve(page);
  await expect(page.getByTestId('result-headline')).toBeVisible();

  const stored = await page.evaluate(
    () =>
      new Promise<{ trials: { kind: string; difficulty: number }[]; mode: string; reviews: number; stairs: Record<string, { value: number }> }>((resolve) => {
        const open = indexedDB.open('brainup');
        open.onsuccess = () => {
          const tx = open.result.transaction(['trials', 'sessions', 'reviews', 'gameState']);
          const trials = tx.objectStore('trials').getAll();
          const sessions = tx.objectStore('sessions').getAll();
          const reviews = tx.objectStore('reviews').count();
          const state = tx.objectStore('gameState').get('arithmetic');
          tx.oncomplete = () =>
            resolve({ trials: trials.result, mode: sessions.result[0].mode, reviews: reviews.result, stairs: state.result.state.stairs });
        };
      }),
  );
  expect(stored.mode).toBe('placement');
  expect(stored.trials.map((t) => t.difficulty)).toEqual(Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 4 : 7)));
  // Je Rechenart zwei Aufgaben hintereinander, alle zehn Rechenarten.
  stored.trials.forEach((t, i) => expect(t.kind).toBe(stored.trials[i - (i % 2)]!.kind));
  expect(new Set(stored.trials.map((t) => t.kind)).size).toBe(10);
  expect(Object.values(stored.stairs).map((s) => s.value)).toEqual(Array.from({ length: 10 }, () => 7));
  expect(stored.reviews).toBe(0);

  // Danach ist die Einstufung erledigt: normale Einstiegsseite mit Modusauswahl auf dem neuen Level.
  await page.getByRole('button', { name: 'Fertig' }).click();
  // Erst die Spieleliste abwarten: Sonst überholt der nächste Seitenwechsel den von „Fertig“.
  await expect(page.getByRole('heading', { name: 'Spiele' })).toBeVisible();
  await page.goto('#/spiel/arithmetic');
  await expect(page.getByText('Level 7', { exact: true })).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Modus' })).toBeVisible();
  await expect(page.getByText('Zuerst eine kurze Einstufung')).toHaveCount(0);
});
