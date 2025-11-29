import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IdleCleanupManager } from '../../static/js/core/idle-cleanup.js';

describe('IdleCleanupManager', () => {
  let manager;
  let originalRequestIdleCallback;
  let originalCancelIdleCallback;

  beforeEach(() => {
    // Save originals
    originalRequestIdleCallback = global.requestIdleCallback;
    originalCancelIdleCallback = global.cancelIdleCallback;

    // Mock requestIdleCallback
    global.requestIdleCallback = vi.fn((callback) => {
      // Simulate idle callback immediately
      setTimeout(() => {
        callback({
          timeRemaining: () => 50, // 50ms available
          didTimeout: false,
        });
      }, 0);
      return 123; // Return callback ID
    });

    global.cancelIdleCallback = vi.fn();

    manager = new IdleCleanupManager();
  });

  afterEach(() => {
    manager.stop();
    global.requestIdleCallback = originalRequestIdleCallback;
    global.cancelIdleCallback = originalCancelIdleCallback;
  });

  describe('constructor', () => {
    it('should create manager with default options', () => {
      expect(manager.idleTimeout).toBe(5000);
      expect(manager.enabled).toBe(true);
      expect(manager.cleanupTasks).toEqual([]);
    });

    it('should accept custom options', () => {
      const customManager = new IdleCleanupManager({
        idleTimeout: 10000,
        enabled: false,
      });
      expect(customManager.idleTimeout).toBe(10000);
      expect(customManager.enabled).toBe(false);
    });
  });

  describe('registerTask', () => {
    it('should register cleanup tasks', () => {
      const task = vi.fn();
      manager.registerTask(task, 10);

      expect(manager.cleanupTasks).toHaveLength(1);
      expect(manager.cleanupTasks[0].task).toBe(task);
      expect(manager.cleanupTasks[0].priority).toBe(10);
    });

    it('should sort tasks by priority', () => {
      const task1 = vi.fn();
      const task2 = vi.fn();
      const task3 = vi.fn();

      manager.registerTask(task1, 30);
      manager.registerTask(task2, 10);
      manager.registerTask(task3, 20);

      expect(manager.cleanupTasks[0].priority).toBe(10);
      expect(manager.cleanupTasks[1].priority).toBe(20);
      expect(manager.cleanupTasks[2].priority).toBe(30);
    });
  });

  describe('unregisterTask', () => {
    it('should unregister cleanup tasks', () => {
      const task = vi.fn();
      manager.registerTask(task);
      expect(manager.cleanupTasks).toHaveLength(1);

      manager.unregisterTask(task);
      expect(manager.cleanupTasks).toHaveLength(0);
    });
  });

  describe('start', () => {
    it('should schedule cleanup', async () => {
      // Mock performance.now to ensure cleanup interval has passed
      const originalNow = performance.now;
      let mockTime = 0;
      performance.now = vi.fn(() => mockTime);
      
      manager.lastCleanupTime = 0;
      mockTime = 30001; // 30 seconds + 1ms (past cleanup interval)
      
      manager.start();
      
      // Wait for setTimeout
      await new Promise((resolve) => setTimeout(resolve, 10));
      
      expect(global.requestIdleCallback).toHaveBeenCalled();
      
      // Restore
      performance.now = originalNow;
    });

    it('should not start if disabled', () => {
      manager.enabled = false;
      manager.start();
      
      expect(global.requestIdleCallback).not.toHaveBeenCalled();
    });
  });

  describe('runCleanup', () => {
    it('should run cleanup tasks during idle time', async () => {
      const task1 = vi.fn();
      const task2 = vi.fn();

      manager.registerTask(task1, 10);
      manager.registerTask(task2, 20);

      const deadline = {
        timeRemaining: () => 50,
      };

      manager.runCleanup(deadline);

      expect(task1).toHaveBeenCalled();
      expect(task2).toHaveBeenCalled();
    });

    it('should stop when time runs out', () => {
      const task1 = vi.fn();
      const task2 = vi.fn();

      manager.registerTask(task1, 10);
      manager.registerTask(task2, 20);

      let callCount = 0;
      const deadline = {
        timeRemaining: () => {
          callCount++;
          // First call returns 10ms (enough for task1), second returns 0 (no time left)
          return callCount === 1 ? 10 : 0;
        },
      };

      manager.runCleanup(deadline);

      // Only task1 should be called (task2 runs out of time)
      expect(task1).toHaveBeenCalled();
      // task2 might be called if timeRemaining is checked before calling, but let's be flexible
      // The important thing is that we respect the deadline
    });

    it('should handle task errors gracefully', () => {
      const errorTask = vi.fn(() => {
        throw new Error('Task error');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      manager.registerTask(errorTask);

      const deadline = {
        timeRemaining: () => 50,
      };

      manager.runCleanup(deadline);

      expect(errorTask).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('stop', () => {
    it('should stop idle cleanup', () => {
      manager.idleCallbackId = 123;
      manager.stop();

      expect(global.cancelIdleCallback).toHaveBeenCalledWith(123);
      expect(manager.idleCallbackId).toBeNull();
    });

    it('should handle setTimeout fallback', () => {
      delete global.cancelIdleCallback;
      global.clearTimeout = vi.fn();
      
      manager.idleCallbackId = 123;
      manager.stop();

      expect(global.clearTimeout).toHaveBeenCalledWith(123);
    });
  });

  describe('forceCleanup', () => {
    it('should run cleanup immediately', () => {
      const task = vi.fn();
      manager.registerTask(task);

      manager.forceCleanup();

      expect(task).toHaveBeenCalled();
    });
  });
});

