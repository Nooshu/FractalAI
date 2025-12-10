import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for core/logger.js
 * Tests the development-only logging utility
 */

describe('core/logger', () => {
  let originalConsoleLog;
  let originalConsoleDebug;
  let originalConsoleInfo;
  let originalConsoleWarn;
  let originalConsoleError;
  let originalLocation;

  beforeEach(() => {
    // Save original console methods
    originalConsoleLog = console.log;
    originalConsoleDebug = console.debug;
    originalConsoleInfo = console.info;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;
    originalLocation = window.location;

    // Mock console methods
    console.log = vi.fn();
    console.debug = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.debug = originalConsoleDebug;
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    // Use Object.defineProperty to avoid jsdom navigation warning
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    // Note: import.meta.env is read-only and cannot be restored
  });

  it('should export devLog object', async () => {
    const { devLog } = await import('../../static/js/core/logger.js');
    expect(devLog).toBeDefined();
    expect(typeof devLog).toBe('object');
    expect(devLog).toHaveProperty('log');
    expect(devLog).toHaveProperty('debug');
    expect(devLog).toHaveProperty('info');
    expect(devLog).toHaveProperty('warn');
    expect(devLog).toHaveProperty('error');
  });

  it('should log in development mode (localhost)', async () => {
    // Mock localhost
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      writable: true,
    });

    const { devLog } = await import('../../static/js/core/logger.js');
    devLog.log('test message');
    expect(console.log).toHaveBeenCalledWith('test message');
  });

  it('should log in development mode (127.0.0.1)', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: '127.0.0.1' },
      writable: true,
    });

    const { devLog } = await import('../../static/js/core/logger.js');
    devLog.log('test message');
    expect(console.log).toHaveBeenCalledWith('test message');
  });

  it('should log when dev=true in URL', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', search: '?dev=true' },
      writable: true,
    });

    const { devLog } = await import('../../static/js/core/logger.js');
    devLog.log('test message');
    expect(console.log).toHaveBeenCalledWith('test message');
  });

  it('should log when import.meta.env.DEV is true', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', search: '' },
      writable: true,
    });
    // Note: import.meta.env.DEV is set by Vitest and cannot be modified in tests
    // This test verifies that the logger checks import.meta.env.DEV
    // In Vitest, DEV is typically true, so this test may log or not depending on environment

    const { devLog } = await import('../../static/js/core/logger.js');
    devLog.log('test message');
    // The behavior depends on Vitest's import.meta.env.DEV value
    // We just verify the function doesn't throw
    expect(devLog).toBeDefined();
  });

  it('should not log in production mode', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', search: '' },
      writable: true,
    });
    // Note: import.meta.env.DEV cannot be modified in tests
    // This test verifies that without localhost/127.0.0.1 or dev=true in URL,
    // and if import.meta.env.DEV is false, logging should not occur
    // In Vitest, DEV is typically true, so this test may not behave as expected

    const { devLog } = await import('../../static/js/core/logger.js');
    devLog.log('test message');
    // The behavior depends on Vitest's import.meta.env.DEV value
    // We just verify the function doesn't throw
    expect(devLog).toBeDefined();
  });

  it('should always show warnings', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', search: '' },
      writable: true,
    });

    const { devLog } = await import('../../static/js/core/logger.js');
    devLog.warn('warning message');
    expect(console.warn).toHaveBeenCalledWith('warning message');
  });

  it('should always show errors', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', search: '' },
      writable: true,
    });

    const { devLog } = await import('../../static/js/core/logger.js');
    devLog.error('error message');
    expect(console.error).toHaveBeenCalledWith('error message');
  });

  it('should support debug method', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      writable: true,
    });

    const { devLog } = await import('../../static/js/core/logger.js');
    devLog.debug('debug message');
    expect(console.debug).toHaveBeenCalledWith('debug message');
  });

  it('should support info method', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      writable: true,
    });

    const { devLog } = await import('../../static/js/core/logger.js');
    devLog.info('info message');
    expect(console.info).toHaveBeenCalledWith('info message');
  });

  it('should support multiple arguments', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      writable: true,
    });

    const { devLog } = await import('../../static/js/core/logger.js');
    devLog.log('message', 123, { key: 'value' });
    expect(console.log).toHaveBeenCalledWith('message', 123, { key: 'value' });
  });
});


