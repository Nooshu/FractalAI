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
    // Suppress jsdom navigation warnings (benign - jsdom doesn't implement full navigation)
    setupFiles: ['./tests/setup.js'],
    // Suppress expected error messages and informational logs from tests
    onConsoleLog(log, type) {
      if (typeof log === 'string') {
        // Suppress expected error messages from tests
        if (type === 'stderr') {
          if (
            log.includes('Failed to setup sharing module:') ||
            log.includes('Failed to load benchmark UI:') ||
            log.includes('Failed to load discovery UI module:') ||
            log.includes('Failed to load footer height module:') ||
            log.includes('Not implemented: navigation to another Document')
          ) {
            return false; // Suppress these expected errors/warnings
          }
        }
        // Suppress expected informational messages from stdout
        if (type === 'stdout') {
          if (
            log.includes('[Context Loss Handler]') ||
            log.includes('[WebGL2 UBO]') ||
            log.includes('[Occlusion Queries]') ||
            log.includes('[Adaptive Quality]') ||
            log.includes('[Multi-Resolution Rendering]') ||
            log.includes('Training new ML model') ||
            log.includes('Model version mismatch') ||
            log.includes('Not enough favorites to train model')
          ) {
            return false; // Suppress these expected informational messages
          }
        }
      }
      return true; // Allow other console output
    },
    exclude: [
      // Third-party and build outputs
      'node_modules/**',
      'dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      // Visual regression tests are run by Playwright, not Vitest
      'tests/visual/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        'scripts/**',
        '**/*.config.js',
        '**/*.test.js',
        '**/index.html',
        '**/site.webmanifest',
        '**/_headers',
        '**/_redirects',
        '**/_routes.json',
      ],
      include: ['static/js/**/*.js'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
