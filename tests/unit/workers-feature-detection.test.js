import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  supportsWorkers,
  supportsSharedArrayBuffer,
  supportsOffscreenCanvas,
  getHardwareConcurrency,
  shouldEnableWorkerOptimizations,
  getWorkerCapabilities,
} from '../../static/js/workers/feature-detection.js';

describe('feature-detection', () => {
  let originalWorker;
  let originalSharedArrayBuffer;
  let originalOffscreenCanvas;
  let originalHardwareConcurrency;

  beforeEach(() => {
    // Save originals
    originalWorker = global.Worker;
    originalSharedArrayBuffer = global.SharedArrayBuffer;
    originalOffscreenCanvas = global.OffscreenCanvas;
    originalHardwareConcurrency = navigator.hardwareConcurrency;
  });

  afterEach(() => {
    // Restore originals
    global.Worker = originalWorker;
    global.SharedArrayBuffer = originalSharedArrayBuffer;
    global.OffscreenCanvas = originalOffscreenCanvas;
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      writable: true,
      value: originalHardwareConcurrency,
    });
  });

  describe('supportsWorkers', () => {
    it('should return true when Worker is available', () => {
      global.Worker = class Worker {};
      expect(supportsWorkers()).toBe(true);
    });

    it('should return false when Worker is not available', () => {
      delete global.Worker;
      expect(supportsWorkers()).toBe(false);
    });
  });

  describe('supportsSharedArrayBuffer', () => {
    it('should return true when SharedArrayBuffer is available', () => {
      global.SharedArrayBuffer = class SharedArrayBuffer {};
      expect(supportsSharedArrayBuffer()).toBe(true);
    });

    it('should return false when SharedArrayBuffer is not available', () => {
      delete global.SharedArrayBuffer;
      expect(supportsSharedArrayBuffer()).toBe(false);
    });
  });

  describe('supportsOffscreenCanvas', () => {
    it('should return true when OffscreenCanvas is available', () => {
      global.OffscreenCanvas = class OffscreenCanvas {};
      expect(supportsOffscreenCanvas()).toBe(true);
    });

    it('should return false when OffscreenCanvas is not available', () => {
      delete global.OffscreenCanvas;
      expect(supportsOffscreenCanvas()).toBe(false);
    });
  });

  describe('getHardwareConcurrency', () => {
    it('should return hardwareConcurrency when available', () => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        writable: true,
        value: 8,
      });
      expect(getHardwareConcurrency()).toBe(8);
    });

    it('should return 4 as fallback when not available', () => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        writable: true,
        value: undefined,
      });
      expect(getHardwareConcurrency()).toBe(4);
    });
  });

  describe('shouldEnableWorkerOptimizations', () => {
    it('should return true when all requirements are met', () => {
      global.Worker = class Worker {};
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        writable: true,
        value: 4,
      });

      expect(shouldEnableWorkerOptimizations()).toBe(true);
    });

    it('should return false when workers are not supported', () => {
      delete global.Worker;
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        writable: true,
        value: 4,
      });

      expect(shouldEnableWorkerOptimizations()).toBe(false);
    });

    it('should return false when insufficient CPU cores', () => {
      global.Worker = class Worker {};
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        writable: true,
        value: 1,
      });

      expect(shouldEnableWorkerOptimizations({ minCores: 2 })).toBe(false);
    });

    it('should return false when SharedArrayBuffer is required but not available', () => {
      global.Worker = class Worker {};
      delete global.SharedArrayBuffer;
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        writable: true,
        value: 4,
      });

      expect(shouldEnableWorkerOptimizations({ requireSharedArrayBuffer: true })).toBe(false);
    });

    it('should return true when SharedArrayBuffer is required and available', () => {
      global.Worker = class Worker {};
      global.SharedArrayBuffer = class SharedArrayBuffer {};
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        writable: true,
        value: 4,
      });

      expect(shouldEnableWorkerOptimizations({ requireSharedArrayBuffer: true })).toBe(true);
    });
  });

  describe('getWorkerCapabilities', () => {
    it('should return capabilities object', () => {
      global.Worker = class Worker {};
      global.SharedArrayBuffer = class SharedArrayBuffer {};
      global.OffscreenCanvas = class OffscreenCanvas {};
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        writable: true,
        value: 8,
      });

      const capabilities = getWorkerCapabilities();

      expect(capabilities).toHaveProperty('workers');
      expect(capabilities).toHaveProperty('sharedArrayBuffer');
      expect(capabilities).toHaveProperty('offscreenCanvas');
      expect(capabilities).toHaveProperty('hardwareConcurrency');
      expect(capabilities).toHaveProperty('recommended');

      expect(capabilities.workers).toBe(true);
      expect(capabilities.sharedArrayBuffer).toBe(true);
      expect(capabilities.offscreenCanvas).toBe(true);
      expect(capabilities.hardwareConcurrency).toBe(8);
      expect(capabilities.recommended).toBe(true);
    });

    it('should return false for recommended when workers not supported', () => {
      delete global.Worker;
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        writable: true,
        value: 4,
      });

      const capabilities = getWorkerCapabilities();
      expect(capabilities.recommended).toBe(false);
    });
  });
});
