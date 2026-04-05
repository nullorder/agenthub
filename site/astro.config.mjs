// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const isProd = process.env.NODE_ENV === 'production';

// https://astro.build/config
export default defineConfig({
  site: isProd ? 'https://nullorder.github.io' : undefined,
  base: isProd ? '/agenthub/' : '/',
  server: {
    port: 3000
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
