import { defineConfig } from 'vitest/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read app version from package.json (same as vite.config.js)
const packageJsonPath = resolve(process.cwd(), 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const appVersion = packageJson.version;

export default defineConfig({
  define: {
    // Inject app version as a global constant (same as Vite build)
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [
      // Third-party and build outputs
      'node_modules/**',
      'dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      // Visual regression tests are run by Playwright, not Vitest
      'tests/visual/**',
    ],
  },
});
