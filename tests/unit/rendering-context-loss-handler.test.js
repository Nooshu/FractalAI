import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ContextLossHandler,
  createContextLossHandler,
} from '../../static/js/rendering/context-loss-handler.js';

describe('rendering/context-loss-handler', () => {
  let canvas;
  let handler;
  let mockSaveState;
  let mockRestoreState;
  let mockOnContextLost;
  let mockOnContextRestored;
  let consoleWarnSpy;
  let consoleErrorSpy;
  let devLogSpy;

  beforeEach(async () => {
    // Suppress expected console logs during tests
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock devLog
    const { devLog } = await import('../../static/js/core/logger.js');
    devLogSpy = vi.spyOn(devLog, 'log').mockImplementation(() => {});

    canvas = document.createElement('canvas');
    mockSaveState = vi.fn(() => ({ test: 'state' }));
    mockRestoreState = vi.fn();
    mockOnContextLost = vi.fn();
    mockOnContextRestored = vi.fn();

    handler = new ContextLossHandler(canvas, {
      saveState: mockSaveState,
      restoreState: mockRestoreState,
      onContextLost: mockOnContextLost,
      onContextRestored: mockOnContextRestored,
    });
  });

  afterEach(() => {
    if (handler) {
      handler.dispose();
    }
    handler = null;
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    devLogSpy.mockRestore();
  });

  describe('ContextLossHandler', () => {
    it('should initialize with provided options', () => {
      expect(handler.canvas).toBe(canvas);
      expect(handler.saveState).toBe(mockSaveState);
      expect(handler.restoreState).toBe(mockRestoreState);
      expect(handler.isContextLost).toBe(false);
    });

    it('should handle context lost event', () => {
      const event = new Event('webglcontextlost');
      event.preventDefault = vi.fn();

      handler.handleContextLost(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(handler.isContextLost).toBe(true);
      expect(mockSaveState).toHaveBeenCalled();
      expect(mockOnContextLost).toHaveBeenCalled();
    });

    it('should handle context restored event', () => {
      handler.isContextLost = true;
      handler.savedState = { test: 'state' };

      const event = new Event('webglcontextrestored');
      handler.handleContextRestored(event);

      expect(handler.isContextLost).toBe(false);
      expect(mockOnContextRestored).toHaveBeenCalled();
      expect(mockRestoreState).toHaveBeenCalledWith({ test: 'state' });
    });

    it('should check if context is lost', () => {
      expect(handler.isLost()).toBe(false);
      handler.isContextLost = true;
      expect(handler.isLost()).toBe(true);
    });

    it('should cleanup event listeners on dispose', () => {
      const removeEventListener = vi.spyOn(canvas, 'removeEventListener');
      handler.dispose();

      expect(removeEventListener).toHaveBeenCalled();
      expect(handler.onContextLost).toBeNull();
      expect(handler.onContextRestored).toBeNull();
    });

    it('should handle errors in saveState gracefully', () => {
      const errorSaveState = vi.fn(() => {
        throw new Error('Save failed');
      });
      handler.saveState = errorSaveState;

      const event = new Event('webglcontextlost');
      event.preventDefault = vi.fn();

      handler.handleContextLost(event);

      expect(handler.savedState).toBeNull();
      expect(mockOnContextLost).toHaveBeenCalled();
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('createContextLossHandler', () => {
    it('should create a handler instance', () => {
      const instance = createContextLossHandler(canvas, {
        saveState: mockSaveState,
      });
      expect(instance).toBeInstanceOf(ContextLossHandler);
      instance.dispose();
    });
  });
});

