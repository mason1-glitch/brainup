import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages liegt unter /brainup/ – base, start_url und scope müssen dazu passen.
const base = '/brainup/';

export default defineConfig({
  base,
  plugins: [
    svelte(),
    // PWA (D13): der ganze Build im Precache, nach dem ersten Besuch ohne Netz nutzbar.
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'] },
      manifest: {
        name: 'BrainUp',
        short_name: 'BrainUp',
        description: 'Kurze Trainingseinheiten: räumliches Denken, Verarbeitungsgeschwindigkeit, Kopfrechnen.',
        lang: 'de',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f5f1',
        theme_color: '#f6f5f1',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
