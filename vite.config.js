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
      name: 'copy-cloudflare-files',
      closeBundle() {
        // Copy _routes.json to dist directory for Cloudflare Pages
        copyFileSync(
          resolve(__dirname, '_routes.json'),
          resolve(__dirname, 'dist', '_routes.json')
        );
        // Copy _headers to dist directory for Cloudflare Pages
        copyFileSync(
          resolve(__dirname, '_headers'),
          resolve(__dirname, 'dist', '_headers')
        );
        // Copy _redirects to dist directory for Cloudflare Pages
        copyFileSync(
          resolve(__dirname, '_redirects'),
          resolve(__dirname, 'dist', '_redirects')
        );
      },
    },
  ],
});
