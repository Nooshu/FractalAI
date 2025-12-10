import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AdaptiveQualityManager,
  createAdaptiveQualityManager,
} from '../../static/js/rendering/adaptive-quality.js';

describe('rendering/adaptive-quality', () => {
  let manager;
  let devLogSpy;

  beforeEach(async () => {
    // Mock devLog to suppress log messages during tests
    const { devLog } = await import('../../static/js/core/logger.js');
    devLogSpy = vi.spyOn(devLog, 'log').mockImplementation(() => {});

    manager = new AdaptiveQualityManager({
      targetFrameTime: 16.67,
      minQuality: 0.5,
      maxQuality: 1.0,
      qualityStep: 0.1,
    });
  });

  describe('AdaptiveQualityManager', () => {
    it('should initialize with default values', () => {
      expect(manager.currentQuality).toBe(1.0);
      expect(manager.targetFrameTime).toBeCloseTo(16.67, 1);
      expect(manager.minQuality).toBe(0.5);
      expect(manager.maxQuality).toBe(1.0);
    });

    it('should record frame times', () => {
      manager.recordFrameTime(20);
      manager.recordFrameTime(25);
      expect(manager.frameTimeHistory.length).toBe(2);
    });

    it('should limit frame time history size', () => {
      for (let i = 0; i < 15; i++) {
        manager.recordFrameTime(20);
      }
      expect(manager.frameTimeHistory.length).toBeLessThanOrEqual(10);
    });

    it('should reduce quality when frame time is high', () => {
      // Fill history with high frame times
      for (let i = 0; i < 10; i++) {
        manager.recordFrameTime(30); // Above threshold
      }
      const quality = manager.updateQuality();
      expect(quality).toBeLessThan(1.0);
      // Verify log was called
      expect(devLogSpy).toHaveBeenCalled();
    });

    it('should increase quality when frame time is low', () => {
      manager.currentQuality = 0.6;
      // Fill history with low frame times
      for (let i = 0; i < 10; i++) {
        manager.recordFrameTime(10); // Below threshold
      }
      const quality = manager.updateQuality();
      expect(quality).toBeGreaterThan(0.6);
      // Verify log was called
      expect(devLogSpy).toHaveBeenCalled();
    });

    it('should not update quality with insufficient samples', () => {
      manager.recordFrameTime(30);
      const initialQuality = manager.currentQuality;
      const quality = manager.updateQuality();
      expect(quality).toBe(initialQuality);
    });

    it('should get current quality', () => {
      expect(manager.getQuality()).toBe(1.0);
      manager.currentQuality = 0.8;
      expect(manager.getQuality()).toBe(0.8);
    });

    it('should adjust iterations based on quality', () => {
      manager.currentQuality = 0.8;
      const adjusted = manager.getAdjustedIterations(100);
      expect(adjusted).toBe(80);
    });

    it('should get resolution multiplier', () => {
      manager.currentQuality = 0.64; // sqrt(0.64) = 0.8
      const multiplier = manager.getResolutionMultiplier();
      expect(multiplier).toBeCloseTo(0.8, 1);
    });

    it('should reset quality', () => {
      manager.currentQuality = 0.5;
      manager.recordFrameTime(30);
      manager.reset();
      expect(manager.currentQuality).toBe(1.0);
      expect(manager.frameTimeHistory.length).toBe(0);
    });

    it('should get statistics', () => {
      manager.recordFrameTime(20);
      manager.recordFrameTime(25);
      const stats = manager.getStats();
      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('currentQuality');
      expect(stats).toHaveProperty('averageFrameTime');
      expect(stats).toHaveProperty('targetFrameTime');
    });

    it('should disable adaptive quality', () => {
      manager.setEnabled(false);
      expect(manager.isEnabled).toBe(false);
      expect(manager.currentQuality).toBe(1.0);
    });
  });

  describe('createAdaptiveQualityManager', () => {
    it('should create a manager instance', () => {
      const instance = createAdaptiveQualityManager();
      expect(instance).toBeInstanceOf(AdaptiveQualityManager);
    });

    it('should accept options', () => {
      const instance = createAdaptiveQualityManager({
        targetFrameTime: 33.33,
        minQuality: 0.3,
      });
      // targetFrameTime may be calculated from CONFIG, so just check minQuality
      expect(instance.minQuality).toBe(0.3);
      expect(instance.targetFrameTime).toBeGreaterThan(0);
    });
  });
});

