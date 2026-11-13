// Erzeugt die PNG-Icons aus public/icons/icon.svg. Nur nötig, wenn sich das SVG ändert:
//   node scripts/make-icons.mjs
// Nutzt Playwright (ohnehin für E2E installiert) zum Rastern – keine weitere Abhängigkeit.
import { readFile } from 'node:fs/promises';
import { webkit } from '@playwright/test';

const dir = new URL('../public/icons/', import.meta.url);
const svg = await readFile(new URL('icon.svg', dir), 'utf8');
const sizes = { 'icon-192.png': 192, 'icon-512.png': 512, 'apple-touch-icon.png': 180 };

const browser = await webkit.launch();
for (const [name, size] of Object.entries(sizes)) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: new URL(name, dir).pathname });
  await page.close();
}
await browser.close();
