import { defineConfig } from 'vite';
import { copyFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  plugins: [
    {
      name: 'copy-routes',
      closeBundle() {
        // Copy _routes.json to dist directory for Cloudflare Pages
        copyFileSync(
          resolve(__dirname, '_routes.json'),
          resolve(__dirname, 'dist', '_routes.json')
        );
      },
    },
  ],
});
