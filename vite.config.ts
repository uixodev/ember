/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tests build dates in local time; pin the zone so they behave the same everywhere.
process.env.TZ = process.env.VITEST ? 'UTC' : process.env.TZ;

export default defineConfig({
  // GitHub Pages serves from /<repo>/, set VITE_BASE=/ember/ there.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
