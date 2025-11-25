import { defineConfig } from 'vitest/config';

export default defineConfig({
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

