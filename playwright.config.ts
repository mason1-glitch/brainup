import { defineConfig, devices } from '@playwright/test';

// E2E gegen den echten Produktions-Build (vite preview) in zwei Profilen:
// iPhone (WebKit) und Pixel (Chromium, Android-Emulation).
// Die besonders langen Läufe (Tag `@lang`) laufen nur im iPhone-Profil, damit die CI nicht zu langsam wird;
// die Timing-Messung misst den Bildtakt, und der maßgebliche ist der von WebKit. Alles andere läuft in beiden.
const url = 'http://localhost:4173/brainup/';

export default defineConfig({
  testDir: 'e2e',
  reporter: 'line',
  timeout: 120_000,
  use: { baseURL: url },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
    { name: 'pixel', use: { ...devices['Pixel 7'] }, grepInvert: /@lang/ },
  ],
});
