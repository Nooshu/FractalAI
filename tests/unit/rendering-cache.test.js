import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FrameCache } from '../../static/js/rendering/cache.js';

describe('rendering/cache', () => {
  let cache;
  let mockCanvas;
  let mockRegl;
  let mockFramebuffer;

  beforeEach(() => {
    cache = new FrameCache();
    mockCanvas = {
      width: 800,
      height: 600,
      parentElement: {
        getBoundingClientRect: () => ({ width: 800, height: 600 }),
        clientWidth: 800,
        clientHeight: 600,
      },
    };
    mockRegl = {};
    mockFramebuffer = {
      destroy: vi.fn(),
      color: {},
    };
  });

  describe('generateCacheKey', () => {
    it('should generate cache key from parameters', () => {
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        colorScheme: 'classic',
        xScale: 1.0,
        yScale: 1.0,
        juliaC: { x: 0, y: 0 },
      };

      const key = cache.generateCacheKey(mockCanvas, 'mandelbrot', params);
      expect(key).toBeTruthy();
      expect(typeof key).toBe('string');
    });

    it('should return null for invalid canvas', () => {
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        colorScheme: 'classic',
        xScale: 1.0,
        yScale: 1.0,
        juliaC: { x: 0, y: 0 },
      };

      const key = cache.generateCacheKey(null, 'mandelbrot', params);
      expect(key).toBeNull();
    });

    it('should include julia parameters for julia fractals', () => {
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        colorScheme: 'classic',
        xScale: 1.0,
        yScale: 1.0,
        juliaC: { x: 0.5, y: 0.3 },
      };

      const key = cache.generateCacheKey(mockCanvas, 'julia', params);
      expect(key).toContain('0.5');
      expect(key).toContain('0.3');
    });
  });

  describe('getCachedFrame', () => {
    it('should return null for non-existent cache entry', () => {
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        colorScheme: 'classic',
        xScale: 1.0,
        yScale: 1.0,
        juliaC: { x: 0, y: 0 },
      };

      const result = cache.getCachedFrame(mockCanvas, 'mandelbrot', params, mockRegl);
      expect(result).toBeNull();
    });

    it('should return cached frame when available', () => {
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        colorScheme: 'classic',
        xScale: 1.0,
        yScale: 1.0,
        juliaC: { x: 0, y: 0 },
      };

      cache.cacheFrame(mockCanvas, 'mandelbrot', params, mockFramebuffer);
      const result = cache.getCachedFrame(mockCanvas, 'mandelbrot', params, mockRegl);
      expect(result).toBeTruthy();
      expect(result.framebuffer).toBe(mockFramebuffer);
    });
  });

  describe('cacheFrame', () => {
    it('should cache a frame', () => {
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        colorScheme: 'classic',
        xScale: 1.0,
        yScale: 1.0,
        juliaC: { x: 0, y: 0 },
      };

      cache.cacheFrame(mockCanvas, 'mandelbrot', params, mockFramebuffer);
      const result = cache.getCachedFrame(mockCanvas, 'mandelbrot', params, mockRegl);
      expect(result).toBeTruthy();
    });

    it('should limit cache size', () => {
      cache.maxSize = 2;
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        colorScheme: 'classic',
        xScale: 1.0,
        yScale: 1.0,
        juliaC: { x: 0, y: 0 },
      };

      // Add more frames than max size
      for (let i = 0; i < 3; i++) {
        const frameParams = { ...params, zoom: 1.0 + i };
        cache.cacheFrame(mockCanvas, 'mandelbrot', frameParams, mockFramebuffer);
      }

      expect(cache.cache.size).toBeLessThanOrEqual(2);
    });
  });

  describe('clear', () => {
    it('should clear all cached frames', () => {
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        colorScheme: 'classic',
        xScale: 1.0,
        yScale: 1.0,
        juliaC: { x: 0, y: 0 },
      };

      cache.cacheFrame(mockCanvas, 'mandelbrot', params, mockFramebuffer);
      expect(cache.cache.size).toBeGreaterThan(0);
      cache.clear();
      expect(cache.cache.size).toBe(0);
      expect(mockFramebuffer.destroy).toHaveBeenCalled();
    });
  });
});

