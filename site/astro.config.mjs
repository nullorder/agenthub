// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://agenthub.nullorder.org',
  base: '/',
  server: {
    port: 3000
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
