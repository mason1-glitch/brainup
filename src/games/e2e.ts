/**
 * true nur im Playwright-Lauf (dort per addInitScript gesetzt). Spiele dürfen dann die
 * richtige Antwort als `data-correct` ins DOM schreiben, damit der Bot wirklich spielt.
 */
export const e2e: boolean = typeof window !== 'undefined' && '__brainupE2E' in window;
