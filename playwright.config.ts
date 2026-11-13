import { defineConfig, devices } from '@playwright/test';

// E2E gegen den echten Produktions-Build (vite preview), im iPhone-Viewport mit WebKit.
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
  projects: [{ name: 'iphone', use: { ...devices['iPhone 15'] } }],
});
