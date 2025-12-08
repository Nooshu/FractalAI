import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        Image: 'readonly',
        HTMLCanvasElement: 'readonly',
        ResizeObserver: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Blob: 'readonly',
        WebGL2RenderingContext: 'readonly',
        WebGLRenderingContext: 'readonly',
        performance: 'readonly',
        MediaRecorder: 'readonly',
        VideoEncoder: 'readonly',
        OffscreenCanvas: 'readonly',
        WebAssembly: 'readonly',
        GPUTextureUsage: 'readonly',
        GPUShaderStage: 'readonly',
        GPUBufferUsage: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        requestIdleCallback: 'readonly',
        cancelIdleCallback: 'readonly',
        PerformanceObserver: 'readonly',
        ImageData: 'readonly',
        Worker: 'readonly',
        CustomEvent: 'readonly',
        FileReader: 'readonly',
        Event: 'readonly',
        HTMLElement: 'readonly',
        localStorage: 'readonly',
        // ES2021 globals
        Promise: 'readonly',
        Symbol: 'readonly',
        WeakMap: 'readonly',
        WeakSet: 'readonly',
        Proxy: 'readonly',
        Reflect: 'readonly',
        BigInt: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-console': 'off',
      'no-debugger': 'warn',
    },
  },
  {
    // Web Worker files
    files: ['**/workers/**/*.js'],
    languageOptions: {
      globals: {
        self: 'readonly', // Web Worker global
        importScripts: 'readonly', // Web Worker API
      },
    },
  },
  {
    // Node.js environment for test files and config files
    files: [
      '**/*.test.js',
      '**/playwright.config.js',
      '**/vite.config.js',
      '**/vitest.config.js',
      'tests/**/*.js',
      'scripts/**/*.js',
    ],
    languageOptions: {
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        vi: 'readonly', // Vitest
        afterAll: 'readonly', // Vitest
        Event: 'readonly', // DOM API for tests
        HTMLElement: 'readonly', // DOM API for tests
        ImageData: 'readonly', // DOM API for tests
        Worker: 'readonly', // Web Workers for tests
        self: 'readonly', // Web Worker global
        WebGLRenderingContext: 'readonly', // WebGL API for tests
      },
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'playwright-report/',
      'test-results/',
      '*.min.js',
      'vite.config.js',
      'public/sw.js', // Service worker has its own globals
      'scripts/generate-presets-manifest.js', // Node.js script
    ],
  },
];
