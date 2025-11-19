import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for visual regression testing
 *
 * This configuration:
 * - Sets up screenshot comparison
 * - Configures test environments
 * - Handles baseline updates
 * - Generates HTML reports
 */
export default defineConfig({
  testDir: './tests/visual',

  // Maximum time one test can run
  timeout: 60000, // 60 seconds (some fractals take time to render)

  // Run tests in parallel
  fullyParallel: true, // Enable parallel execution
  workers: 4, // Use 4 workers for parallel tests

  // Retry failed tests
  retries: process.env.CI ? 2 : 0,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.TEST_URL || 'http://localhost:5173',

    // Screenshot settings
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Trace on failure
    trace: 'retain-on-failure',

    // Viewport size (should match your canvas size)
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            // WebGL settings for headless mode
            '--use-gl=egl',
          ],
        },
      },
    },
    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Web server configuration (for local testing)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  // Expect configuration for visual comparisons
  expect: {
    // Threshold for pixel comparison (0-1)
    // Lower = stricter, Higher = more tolerant
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixels: 100, // Maximum number of different pixels
    },

    // Timeout for assertions
    timeout: 10000,
  },

  // Global setup/teardown
  // globalSetup: './tests/visual/global-setup.js',
  // globalTeardown: './tests/visual/global-teardown.js',
});

