import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LongTaskDetector } from '../../static/js/performance/long-task-detector.js';

describe('LongTaskDetector', () => {
  let originalPerformanceObserver;
  let mockObserver;

  beforeEach(() => {
    // Save original
    originalPerformanceObserver = global.PerformanceObserver;

    // Mock PerformanceObserver
    mockObserver = {
      observe: vi.fn(function () {
        // Simulate successful observe call
      }),
      disconnect: vi.fn(function () {
        // Simulate disconnect call
      }),
    };

    global.PerformanceObserver = vi.fn(function (callback) {
      // Store callback for triggering
      mockObserver.callback = callback;
      // Return mockObserver, but also set it as the observer
      return mockObserver;
    });

    // Mock supportedEntryTypes to include 'longtask' so the detector will actually create an observer
    global.PerformanceObserver.supportedEntryTypes = ['longtask'];
  });

  afterEach(() => {
    global.PerformanceObserver = originalPerformanceObserver;
  });

  describe('constructor', () => {
    it('should create detector with default options', () => {
      const detector = new LongTaskDetector();
      expect(detector.enabled).toBe(true);
      expect(detector.threshold).toBe(50);
      expect(detector.longTasks).toEqual([]);
    });

    it('should accept custom options', () => {
      const onLongTask = vi.fn();
      const detector = new LongTaskDetector({
        onLongTask,
        threshold: 100,
        enabled: false,
      });
      expect(detector.onLongTask).toBe(onLongTask);
      expect(detector.threshold).toBe(100);
      expect(detector.enabled).toBe(false);
    });
  });

  describe('start', () => {
    it('should start observing long tasks', () => {
      const detector = new LongTaskDetector();
      detector.start();

      expect(global.PerformanceObserver).toHaveBeenCalled();
      expect(mockObserver.observe).toHaveBeenCalledWith({ entryTypes: ['longtask'] });
      // Observer should be set if PerformanceObserver is supported
      if (detector.observer) {
        expect(detector.observer).toBe(mockObserver);
      }
    });

    it('should not start if disabled', () => {
      const detector = new LongTaskDetector({ enabled: false });
      detector.start();

      expect(global.PerformanceObserver).not.toHaveBeenCalled();
    });

    it('should handle missing PerformanceObserver gracefully', () => {
      delete global.PerformanceObserver;
      const detector = new LongTaskDetector();

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      detector.start();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LongTaskDetector] PerformanceObserver not supported'
      );
      consoleWarnSpy.mockRestore();
    });

    it('should handle unsupported entryTypes gracefully', () => {
      global.PerformanceObserver = vi.fn(() => {
        throw new TypeError('entryTypes not supported');
      });

      const detector = new LongTaskDetector();
      detector.start(); // Should not throw
    });
  });

  describe('handleLongTask', () => {
    let consoleWarnSpy;

    beforeEach(() => {
      // Mock console.warn to suppress development mode warnings during tests
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it('should record long tasks above threshold', () => {
      const onLongTask = vi.fn();
      const detector = new LongTaskDetector({ onLongTask, threshold: 50 });
      detector.start();

      const entry = {
        duration: 60,
        startTime: 1000,
        name: 'test-task',
        attribution: [],
      };

      detector.handleLongTask(entry);

      expect(detector.longTasks).toHaveLength(1);
      expect(detector.longTasks[0].duration).toBe(60);
      expect(onLongTask).toHaveBeenCalledWith(expect.objectContaining({ duration: 60 }));
    });

    it('should ignore tasks below threshold', () => {
      const onLongTask = vi.fn();
      const detector = new LongTaskDetector({ onLongTask, threshold: 50 });
      detector.start();

      const entry = {
        duration: 30,
        startTime: 1000,
        name: 'test-task',
        attribution: [],
      };

      detector.handleLongTask(entry);

      expect(detector.longTasks).toHaveLength(0);
      expect(onLongTask).not.toHaveBeenCalled();
    });

    it('should limit number of stored tasks', () => {
      const detector = new LongTaskDetector();
      // Override maxLongTasks for this test
      detector.maxLongTasks = 5;
      detector.start();

      for (let i = 0; i < 10; i++) {
        detector.handleLongTask({
          duration: 60,
          startTime: 1000 + i,
          name: `task-${i}`,
          attribution: [],
        });
      }

      expect(detector.longTasks).toHaveLength(5);
      // Should keep most recent (last 5 tasks: task-5 through task-9)
      expect(detector.longTasks[0].name).toBe('task-5');
      expect(detector.longTasks[4].name).toBe('task-9');
    });
  });

  describe('stop', () => {
    it('should stop observing', () => {
      const detector = new LongTaskDetector();
      detector.start();

      // Verify observer was created (if PerformanceObserver is supported)
      if (detector.observer) {
        detector.stop();
        expect(mockObserver.disconnect).toHaveBeenCalled();
        expect(detector.observer).toBeNull();
      } else {
        // If observer wasn't created (e.g., unsupported), stop should still work
        detector.stop();
        expect(detector.observer).toBeNull();
      }
    });
  });

  describe('getRecentLongTasks', () => {
    it('should return tasks within time window', () => {
      // Mock console.warn to suppress development mode warnings during tests
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const detector = new LongTaskDetector();
      detector.start();

      const now = performance.now();
      detector.handleLongTask({
        duration: 60,
        startTime: now - 2000, // 2 seconds ago
        name: 'old-task',
        attribution: [],
      });

      detector.handleLongTask({
        duration: 60,
        startTime: now - 1000, // 1 second ago
        name: 'recent-task',
        attribution: [],
      });

      const recent = detector.getRecentLongTasks(1.5); // 1.5 seconds
      expect(recent).toHaveLength(1);
      expect(recent[0].name).toBe('recent-task');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('getStats', () => {
    it('should return statistics about long tasks', () => {
      // Mock console.warn to suppress development mode warnings during tests
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const detector = new LongTaskDetector();
      detector.start();

      detector.handleLongTask({ duration: 50, startTime: 1000, name: 'task1', attribution: [] });
      detector.handleLongTask({ duration: 60, startTime: 2000, name: 'task2', attribution: [] });
      detector.handleLongTask({ duration: 70, startTime: 3000, name: 'task3', attribution: [] });

      const stats = detector.getStats();
      expect(stats.count).toBe(3);
      expect(stats.avgDuration).toBe(60);
      expect(stats.maxDuration).toBe(70);
      expect(stats.minDuration).toBe(50);

      consoleWarnSpy.mockRestore();
    });

    it('should return zero stats when no tasks', () => {
      const detector = new LongTaskDetector();
      const stats = detector.getStats();
      expect(stats.count).toBe(0);
      expect(stats.avgDuration).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all recorded tasks', () => {
      // Mock console.warn to suppress development mode warnings during tests
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const detector = new LongTaskDetector();
      detector.start();

      detector.handleLongTask({ duration: 60, startTime: 1000, name: 'task', attribution: [] });
      expect(detector.longTasks.length).toBeGreaterThan(0);

      detector.clear();
      expect(detector.longTasks).toEqual([]);

      consoleWarnSpy.mockRestore();
    });
  });
});
