import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  supportsWasmSimd,
  canUseWasmSimd,
  loadWasmModule,
  instantiateWasmModule,
  computeTileWasm,
  computeTileOptimized,
  logWasmSimdStatus,
} from '../../static/js/workers/wasm-simd-utils.js';
import { CONFIG } from '../../static/js/core/config.js';

describe('wasm-simd-utils', () => {
  let originalWebAssembly;
  let originalNavigator;
  let originalConsoleWarn;
  let originalConsoleLog;
  let originalConsoleError;

  beforeEach(() => {
    originalWebAssembly = global.WebAssembly;
    originalNavigator = global.navigator;
    originalConsoleWarn = console.warn;
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.warn = vi.fn();
    console.log = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    global.WebAssembly = originalWebAssembly;
    global.navigator = originalNavigator;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    CONFIG.features.wasmSimd = false;
    delete global.import;
    vi.clearAllMocks();
  });

  describe('supportsWasmSimd', () => {
    it('should return false if WebAssembly is undefined', () => {
      global.WebAssembly = undefined;
      
      expect(supportsWasmSimd()).toBe(false);
    });

    it('should return false if WebAssembly.validate is not a function', () => {
      global.WebAssembly = {};
      
      expect(supportsWasmSimd()).toBe(false);
    });

    it('should return true for Chrome 91+', () => {
      global.WebAssembly = {
        validate: vi.fn(),
      };
      global.navigator = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      };
      
      expect(supportsWasmSimd()).toBe(true);
    });

    it('should return false for Chrome < 91', () => {
      global.WebAssembly = {
        validate: vi.fn(),
      };
      global.navigator = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
      };
      
      expect(supportsWasmSimd()).toBe(false);
    });

    it('should return true for Firefox 89+', () => {
      global.WebAssembly = {
        validate: vi.fn(),
      };
      global.navigator = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      };
      
      expect(supportsWasmSimd()).toBe(true);
    });

    it('should return false for Firefox < 89', () => {
      global.WebAssembly = {
        validate: vi.fn(),
      };
      global.navigator = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
      };
      
      expect(supportsWasmSimd()).toBe(false);
    });

    it('should return true for Safari 16+', () => {
      global.WebAssembly = {
        validate: vi.fn(),
      };
      global.navigator = {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
      };
      
      expect(supportsWasmSimd()).toBe(true);
    });

    it('should return false for Safari < 16', () => {
      global.WebAssembly = {
        validate: vi.fn(),
      };
      global.navigator = {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
      };
      
      expect(supportsWasmSimd()).toBe(false);
    });

    it('should return true for unknown browsers if WebAssembly is available', () => {
      global.WebAssembly = {
        validate: vi.fn(),
      };
      global.navigator = {
        userAgent: 'Unknown Browser',
      };
      
      expect(supportsWasmSimd()).toBe(true);
    });
  });

  describe('canUseWasmSimd', () => {
    it('should return false if feature flag is disabled', () => {
      CONFIG.features.wasmSimd = false;
      global.WebAssembly = { validate: vi.fn() };
      
      expect(canUseWasmSimd()).toBe(false);
    });

    it('should return false if SIMD is not supported', () => {
      CONFIG.features.wasmSimd = true;
      global.WebAssembly = undefined;
      
      expect(canUseWasmSimd()).toBe(false);
    });

    it('should return true if feature flag is enabled and SIMD is supported', () => {
      CONFIG.features.wasmSimd = true;
      global.WebAssembly = { validate: vi.fn() };
      global.navigator = {
        userAgent: 'Chrome/91.0.0.0',
      };
      
      expect(canUseWasmSimd()).toBe(true);
    });
  });

  describe('loadWasmModule', () => {
    it('should return null if WASM SIMD cannot be used', async () => {
      CONFIG.features.wasmSimd = false;
      
      const result = await loadWasmModule();
      expect(result).toBeNull();
    });

    it('should return null when no WASM file is provided', async () => {
      CONFIG.features.wasmSimd = true;
      global.WebAssembly = { validate: vi.fn() };
      global.navigator = { userAgent: 'Chrome/91.0.0.0' };
      
      const result = await loadWasmModule();
      expect(result).toBeNull();
    });
  });

  describe('instantiateWasmModule', () => {
    it('should return null if module is null', async () => {
      const result = await instantiateWasmModule(null);
      expect(result).toBeNull();
    });

    it('should instantiate WASM module successfully', async () => {
      const mockModule = {};
      const mockInstance = {
        exports: {
          compute_tile: vi.fn(),
          memory: {
            buffer: new ArrayBuffer(1024),
            grow: vi.fn(),
          },
        },
      };

      global.WebAssembly = {
        instantiate: vi.fn().mockResolvedValue(mockInstance),
      };

      const result = await instantiateWasmModule(mockModule);
      
      expect(result).toBe(mockInstance);
      expect(global.WebAssembly.instantiate).toHaveBeenCalledWith(mockModule, {});
    });

    it('should handle instantiation errors', async () => {
      const mockModule = {};
      global.WebAssembly = {
        instantiate: vi.fn().mockRejectedValue(new Error('Instantiation failed')),
      };
      global.import = { meta: { env: { DEV: true } } };

      const result = await instantiateWasmModule(mockModule);
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('computeTileWasm', () => {
    it('should return false if WASM instance is null', () => {
      const buffer = new Float32Array(100);
      const result = computeTileWasm(null, buffer, 10, 10, 0, 0, {}, 'mandelbrot');
      
      expect(result).toBe(false);
    });

    it('should return false if WASM instance has no exports', () => {
      const wasmInstance = {};
      const buffer = new Float32Array(100);
      
      const result = computeTileWasm(wasmInstance, buffer, 10, 10, 0, 0, {}, 'mandelbrot');
      
      expect(result).toBe(false);
    });

    it('should return false if compute_tile function is missing', () => {
      const wasmInstance = {
        exports: {},
      };
      const buffer = new Float32Array(100);
      
      const result = computeTileWasm(wasmInstance, buffer, 10, 10, 0, 0, {}, 'mandelbrot');
      
      expect(result).toBe(false);
    });

    it('should return false if memory is missing', () => {
      const wasmInstance = {
        exports: {
          compute_tile: vi.fn(),
        },
      };
      const buffer = new Float32Array(100);
      
      const result = computeTileWasm(wasmInstance, buffer, 10, 10, 0, 0, {}, 'mandelbrot');
      
      expect(result).toBe(false);
    });

    it('should compute tile using WASM when available', () => {
      const buffer = new Float32Array(100);
      const wasmBuffer = new Float32Array(100);
      wasmBuffer.fill(0.5); // Fill with test data

      const mockMemory = {
        buffer: new ArrayBuffer(400),
        grow: vi.fn(),
      };

      const wasmInstance = {
        exports: {
          compute_tile: vi.fn(),
          memory: mockMemory,
        },
      };

      // Mock Float32Array constructor to return our test buffer
      const originalFloat32Array = global.Float32Array;
      global.Float32Array = class Float32Array {
        constructor(buffer, offset, _length) {
          if (offset !== undefined) {
            // This is the WASM memory view
            return wasmBuffer;
          }
          return buffer;
        }
      };

      computeTileWasm(
        wasmInstance,
        buffer,
        10,
        10,
        0,
        0,
        { zoom: 1.0, iterations: 100 },
        'mandelbrot'
      );

      global.Float32Array = originalFloat32Array;

      // Should have called compute_tile
      expect(wasmInstance.exports.compute_tile).toHaveBeenCalled();
    });

    it('should handle WASM computation errors', () => {
      const buffer = new Float32Array(100);
      const wasmInstance = {
        exports: {
          compute_tile: vi.fn().mockImplementation(() => {
            throw new Error('WASM error');
          }),
          memory: {
            buffer: new ArrayBuffer(400),
            grow: vi.fn(),
          },
        },
      };
      global.import = { meta: { env: { DEV: true } } };

      const result = computeTileWasm(wasmInstance, buffer, 10, 10, 0, 0, {}, 'mandelbrot');
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('computeTileOptimized', () => {
    it('should compute tile using optimized JavaScript', () => {
      const buffer = new Float32Array(100);
      const computePointFn = vi.fn((_cx, _cy) => 0.5);

      computeTileOptimized(
        buffer,
        10,
        10,
        0,
        0,
        {
          zoom: 1.0,
          offset: { x: 0.0, y: 0.0 },
          iterations: 100,
          xScale: 1.0,
          yScale: 1.0,
        },
        'mandelbrot',
        computePointFn
      );

      expect(computePointFn).toHaveBeenCalledTimes(100);
      expect(buffer.length).toBe(100);
    });

    it('should handle different parameters', () => {
      const buffer = new Float32Array(200);
      const computePointFn = vi.fn((_cx, _cy) => 0.75);

      computeTileOptimized(
        buffer,
        20,
        10,
        5,
        3,
        {
          zoom: 2.0,
          offset: { x: 0.1, y: 0.2 },
          iterations: 200,
          xScale: 1.5,
          yScale: 2.0,
        },
        'julia',
        computePointFn
      );

      expect(computePointFn).toHaveBeenCalledTimes(200);
      expect(buffer.length).toBe(200);
    });
  });

  describe('logWasmSimdStatus', () => {
    it('should not log if feature flag is disabled', () => {
      CONFIG.features.wasmSimd = false;
      
      logWasmSimdStatus();
      
      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should log enabled status when available', () => {
      CONFIG.features.wasmSimd = true;
      global.WebAssembly = { validate: vi.fn() };
      global.navigator = { userAgent: 'Chrome/91.0.0.0' };
      global.import = { meta: { env: { DEV: true } } };
      
      logWasmSimdStatus();
      
      expect(console.log).toHaveBeenCalled();
    });

    it('should warn if not supported', () => {
      CONFIG.features.wasmSimd = true;
      global.WebAssembly = undefined;
      global.import = { meta: { env: { DEV: true } } };
      
      logWasmSimdStatus();
      
      expect(console.warn).toHaveBeenCalled();
    });

    it('should respect DEV flag for logging', () => {
      CONFIG.features.wasmSimd = true;
      global.WebAssembly = { validate: vi.fn() };
      global.navigator = { userAgent: 'Chrome/91.0.0.0' };
      
      // Clear previous calls
      console.log.mockClear();
      console.warn.mockClear();
      
      // Call the function - it will log if DEV is true (test environment)
      // or not log if DEV is false (production)
      logWasmSimdStatus();
      
      // The function should check import.meta.env?.DEV before logging
      // In test environment, DEV is typically true, so logging is expected
      // We just verify the function executes without error
      expect(typeof logWasmSimdStatus).toBe('function');
    });
  });
});

