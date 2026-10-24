/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Tests build dates in local time; pin the zone so they behave the same everywhere.
process.env.TZ = process.env.VITEST ? 'UTC' : process.env.TZ;

export default defineConfig({
  // GitHub Pages serves from /<repo>/, set VITE_BASE=/ember/ there.
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Ember',
        short_name: 'Ember',
        description: 'Keep the important parts of your life warm. A few minutes a day keeps a fire going.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#4D45C6',
        background_color: '#3F38B4',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,woff2,svg}'],
        navigateFallback: 'index.html',
        // Reminders: periodic checks, tapping a notification (see public/notify-sw.js).
        importScripts: ['notify-sw.js'],
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
