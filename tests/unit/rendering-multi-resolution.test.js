import { describe, it, expect, beforeEach } from 'vitest';
import {
  MultiResolutionManager,
  createMultiResolutionManager,
} from '../../static/js/rendering/multi-resolution.js';

describe('rendering/multi-resolution', () => {
  let manager;

  beforeEach(() => {
    manager = new MultiResolutionManager({
      lowResScale: 0.5,
      enableHighRes: true,
      highResDelay: 100,
    });
  });

  describe('MultiResolutionManager', () => {
    it('should initialize with default values', () => {
      expect(manager.lowResScale).toBe(0.5);
      expect(manager.enableHighRes).toBe(true);
      expect(manager.highResDelay).toBe(100);
      expect(manager.isRendering).toBe(false);
      expect(manager.currentResolution).toBe('low');
    });

    it('should calculate low-res dimensions', () => {
      const dims = manager.getLowResDimensions(800, 600);
      expect(dims.width).toBe(400);
      expect(dims.height).toBe(300);
    });

    it('should ensure minimum dimensions of 1', () => {
      const dims = manager.getLowResDimensions(1, 1);
      expect(dims.width).toBeGreaterThanOrEqual(1);
      expect(dims.height).toBeGreaterThanOrEqual(1);
    });

    it('should get current resolution', () => {
      expect(manager.getCurrentResolution()).toBe('low');
      manager.currentResolution = 'high';
      expect(manager.getCurrentResolution()).toBe('high');
    });

    it('should check if high-res rendering is active', () => {
      expect(manager.isHighResRendering()).toBe(false);
      manager.isRendering = true;
      manager.currentResolution = 'high';
      expect(manager.isHighResRendering()).toBe(true);
    });

    it('should cleanup resources', () => {
      manager.lowResFramebuffer = { destroy: () => {} };
      manager.highResFramebuffer = { destroy: () => {} };
      manager.cleanup();
      expect(manager.lowResFramebuffer).toBeNull();
      expect(manager.highResFramebuffer).toBeNull();
      expect(manager.isRendering).toBe(false);
    });

    it('should get statistics', () => {
      const stats = manager.getStats();
      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('isRendering');
      expect(stats).toHaveProperty('currentResolution');
      expect(stats).toHaveProperty('lowResScale');
    });

    it('should disable multi-resolution', () => {
      manager.setEnabled(false);
      expect(manager.isEnabled).toBe(false);
    });
  });

  describe('createMultiResolutionManager', () => {
    it('should create a manager instance', () => {
      const instance = createMultiResolutionManager();
      expect(instance).toBeInstanceOf(MultiResolutionManager);
    });

    it('should accept options', () => {
      const instance = createMultiResolutionManager({
        lowResScale: 0.3,
        enableHighRes: false,
      });
      expect(instance.lowResScale).toBe(0.3);
      expect(instance.enableHighRes).toBe(false);
    });
  });
});

