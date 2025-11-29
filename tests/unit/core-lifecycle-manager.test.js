import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LifecycleManager } from '../../static/js/core/lifecycle-manager.js';
import { appState } from '../../static/js/core/app-state.js';
import { clearPaletteCache, clearShaderCache } from '../../static/js/fractals/utils.js';

// Mock the utils functions
vi.mock('../../static/js/fractals/utils.js', () => ({
  clearPaletteCache: vi.fn(),
  clearShaderCache: vi.fn(),
}));

describe('LifecycleManager', () => {
  let manager;

  beforeEach(() => {
    manager = new LifecycleManager();
    vi.clearAllMocks();
  });

  describe('startSession', () => {
    it('should start a new session', () => {
      const sessionId = manager.startSession('fractal-change', 'mandelbrot');

      expect(sessionId).toBeDefined();
      expect(sessionId).toContain('fractal-change');
      expect(sessionId).toContain('mandelbrot');
      expect(manager.getCurrentSessionId()).toBe(sessionId);
      expect(manager.getSessionDuration()).toBeGreaterThanOrEqual(0);
    });

    it('should end previous session when starting new one', () => {
      const cancelSpy = vi.spyOn(appState, 'cancelWorkerTasks');

      manager.startSession('fractal-change', 'mandelbrot');
      manager.startSession('zoom', 'julia');

      expect(cancelSpy).toHaveBeenCalled();
      expect(manager.getCurrentSessionId()).toContain('zoom');
    });
  });

  describe('endSession', () => {
    it('should cleanup resources when ending session', () => {
      const cancelSpy = vi.spyOn(appState, 'cancelWorkerTasks');
      const frameCache = appState.getFrameCache();
      const clearSpy = vi.spyOn(frameCache, 'clear');

      manager.startSession('fractal-change', 'mandelbrot');
      manager.endSession();

      expect(cancelSpy).toHaveBeenCalled();
      expect(clearSpy).toHaveBeenCalled();
      expect(clearPaletteCache).toHaveBeenCalled();
      expect(clearShaderCache).toHaveBeenCalled();
      expect(manager.getCurrentSessionId()).toBeNull();
    });

    it('should do nothing if no active session', () => {
      const cancelSpy = vi.spyOn(appState, 'cancelWorkerTasks');

      manager.endSession();

      expect(cancelSpy).not.toHaveBeenCalled();
    });

    it('should run registered cleanup callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.registerCleanup(callback1);
      manager.registerCleanup(callback2);

      manager.startSession('fractal-change', 'mandelbrot');
      manager.endSession();

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      manager.registerCleanup(errorCallback);
      manager.startSession('fractal-change', 'mandelbrot');
      manager.endSession();

      expect(errorCallback).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('registerCleanup', () => {
    it('should register cleanup callbacks', () => {
      const callback = vi.fn();
      manager.registerCleanup(callback);

      manager.startSession('fractal-change', 'mandelbrot');
      manager.endSession();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('unregisterCleanup', () => {
    it('should unregister cleanup callbacks', () => {
      const callback = vi.fn();
      manager.registerCleanup(callback);
      manager.unregisterCleanup(callback);

      manager.startSession('fractal-change', 'mandelbrot');
      manager.endSession();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getSessionDuration', () => {
    it('should return session duration', async () => {
      manager.startSession('fractal-change', 'mandelbrot');

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      const duration = manager.getSessionDuration();
      expect(duration).toBeGreaterThanOrEqual(10);
    });

    it('should return 0 if no active session', () => {
      expect(manager.getSessionDuration()).toBe(0);
    });
  });
});
