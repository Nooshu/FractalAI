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
  if (
    typeof message === 'string' &&
    message.includes('Not implemented: navigation to another Document')
  ) {
    // Suppress this benign jsdom warning
    return;
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    message.includes('Not implemented: navigation to another Document')
  ) {
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

// jsdom sometimes emits "Not implemented: navigation to another Document" directly to stderr/stdout
// (not through console.*). Filter it at the stream level so it doesn't add noise to test output.
const originalStderrWrite = process.stderr.write.bind(process.stderr);
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const NAVIGATION_NOT_IMPLEMENTED = 'Not implemented: navigation to another Document';

process.stderr.write = (chunk, encoding, cb) => {
  const text = typeof chunk === 'string' ? chunk : chunk?.toString?.(encoding);
  if (typeof text === 'string' && text.includes(NAVIGATION_NOT_IMPLEMENTED)) {
    if (typeof cb === 'function') cb();
    return true;
  }
  return originalStderrWrite(chunk, encoding, cb);
};

process.stdout.write = (chunk, encoding, cb) => {
  const text = typeof chunk === 'string' ? chunk : chunk?.toString?.(encoding);
  if (typeof text === 'string' && text.includes(NAVIGATION_NOT_IMPLEMENTED)) {
    if (typeof cb === 'function') cb();
    return true;
  }
  return originalStdoutWrite(chunk, encoding, cb);
};

// Ensure a deterministic localStorage implementation for unit tests.
// Some environments/tooling can provide a partial/incompatible localStorage that breaks tests.
{
  const store = new Map();

  const memoryLocalStorage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      const k = String(key);
      return store.has(k) ? store.get(k) : null;
    },
    key(index) {
      const i = Number(index);
      if (!Number.isFinite(i) || i < 0 || i >= store.size) return null;
      return Array.from(store.keys())[i] ?? null;
    },
    removeItem(key) {
      store.delete(String(key));
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryLocalStorage,
    configurable: true,
  });
}
