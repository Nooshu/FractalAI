/**
 * Test setup file
 * Suppresses benign jsdom warnings and expected log messages during tests
 */

// Suppress jsdom "Not implemented: navigation to another Document" warning
// This is a known jsdom limitation and doesn't affect test functionality
// The warning appears when jsdom encounters navigation operations it doesn't support
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && message.includes('Not implemented: navigation to another Document')) {
    // Suppress this benign jsdom warning
    return;
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && message.includes('Not implemented: navigation to another Document')) {
    // Suppress this benign jsdom warning
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Suppress expected stdout messages via Vitest's onConsoleLog
// This is handled in vitest.config.js, but we also intercept console.log here as a fallback
const originalConsoleLog = console.log;
console.log = (...args) => {
  const message = args[0];
  if (typeof message === 'string') {
    // Suppress initialization and ML training messages
    if (
      message.includes('[Context Loss Handler]') ||
      message.includes('[WebGL2 UBO]') ||
      message.includes('[Occlusion Queries]') ||
      message.includes('[Adaptive Quality]') ||
      message.includes('[Multi-Resolution Rendering]') ||
      message.includes('Training new ML model') ||
      message.includes('Model version mismatch') ||
      message.includes('Not enough favorites to train model')
    ) {
      return; // Suppress these expected messages
    }
  }
  originalConsoleLog.apply(console, args);
};
