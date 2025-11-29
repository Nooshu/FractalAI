import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceInstrumentation } from '../../static/js/performance/instrumentation.js';

describe('PerformanceInstrumentation', () => {
  let instrumentation;

  beforeEach(() => {
    instrumentation = new PerformanceInstrumentation({ enabled: true });
    instrumentation.reset();
  });

  describe('constructor', () => {
    it('should create instrumentation with default options', () => {
      const inst = new PerformanceInstrumentation();
      expect(inst.enabled).toBeDefined();
    });

    it('should accept custom options', () => {
      const inst = new PerformanceInstrumentation({ enabled: false });
      expect(inst.enabled).toBe(false);
    });
  });

  describe('recordRender', () => {
    it('should record render operations', () => {
      instrumentation.recordRender();
      instrumentation.recordRender();
      
      const metrics = instrumentation.getMetrics();
      expect(metrics.renderCount).toBe(2);
    });

    it('should not record if disabled', () => {
      instrumentation.enabled = false;
      instrumentation.recordRender();
      
      const metrics = instrumentation.getMetrics();
      expect(metrics.renderCount).toBe(0);
    });
  });

  describe('recordCacheHit', () => {
    it('should record cache hits', () => {
      instrumentation.recordCacheHit();
      instrumentation.recordCacheHit();
      
      const metrics = instrumentation.getMetrics();
      expect(metrics.cacheHits).toBe(2);
    });
  });

  describe('recordCacheMiss', () => {
    it('should record cache misses', () => {
      instrumentation.recordCacheMiss();
      
      const metrics = instrumentation.getMetrics();
      expect(metrics.cacheMisses).toBe(1);
    });
  });

  describe('recordWorkerTask', () => {
    it('should record worker tasks', () => {
      instrumentation.recordWorkerTask(10);
      instrumentation.recordWorkerTask(20);
      
      const metrics = instrumentation.getMetrics();
      expect(metrics.workerTasks).toBe(2);
      expect(metrics.workerTaskTime).toBe(30);
    });
  });

  describe('recordFrameTime', () => {
    it('should record frame times', () => {
      instrumentation.recordFrameTime(16.67);
      instrumentation.recordFrameTime(33.33);
      
      const metrics = instrumentation.getMetrics();
      expect(metrics.frameTime).toHaveLength(2);
    });

    it('should limit frame time samples', () => {
      for (let i = 0; i < 150; i++) {
        instrumentation.recordFrameTime(16.67);
      }
      
      const metrics = instrumentation.getMetrics();
      expect(metrics.frameTime.length).toBeLessThanOrEqual(100);
    });
  });

  describe('recordInvalidation', () => {
    it('should record invalidations', () => {
      instrumentation.recordInvalidation();
      instrumentation.recordInvalidation();
      
      const metrics = instrumentation.getMetrics();
      expect(metrics.invalidationCount).toBe(2);
    });
  });

  describe('getMetrics', () => {
    it('should calculate cache hit rate', () => {
      instrumentation.recordCacheHit();
      instrumentation.recordCacheHit();
      instrumentation.recordCacheMiss();
      
      const metrics = instrumentation.getMetrics();
      expect(metrics.cacheHitRate).toBeCloseTo(2 / 3, 2);
    });

    it('should calculate average worker task time', () => {
      instrumentation.recordWorkerTask(10);
      instrumentation.recordWorkerTask(20);
      instrumentation.recordWorkerTask(30);
      
      const metrics = instrumentation.getMetrics();
      expect(metrics.avgWorkerTaskTime).toBe(20);
    });

    it('should calculate average frame time', () => {
      instrumentation.recordFrameTime(16.67);
      instrumentation.recordFrameTime(33.33);
      instrumentation.recordFrameTime(20.0);
      
      const metrics = instrumentation.getMetrics();
      expect(metrics.avgFrameTime).toBeCloseTo(23.33, 1);
    });

    it('should return zero rates when no data', () => {
      const metrics = instrumentation.getMetrics();
      expect(metrics.cacheHitRate).toBe(0);
      expect(metrics.avgWorkerTaskTime).toBe(0);
      expect(metrics.avgFrameTime).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      instrumentation.recordRender();
      instrumentation.recordCacheHit();
      instrumentation.reset();
      
      const metrics = instrumentation.getMetrics();
      expect(metrics.renderCount).toBe(0);
      expect(metrics.cacheHits).toBe(0);
    });
  });

  describe('logMetrics', () => {
    it('should log metrics when enabled', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      instrumentation.recordRender();
      instrumentation.logMetrics();
      
      expect(consoleLogSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    it('should not log when disabled', () => {
      instrumentation.enabled = false;
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      instrumentation.logMetrics();
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });
  });
});

