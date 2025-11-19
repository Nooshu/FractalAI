import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FrameCache } from '../../static/js/rendering/cache.js';
import { CONFIG } from '../../static/js/core/config.js';

describe('FrameCache', () => {
  let cache;
  let mockCanvas;
  let mockRegl;
  let mockFramebuffer;

  beforeEach(() => {
    cache = new FrameCache();
    mockCanvas = {
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

  it('should create a new FrameCache instance', () => {
    expect(cache).toBeInstanceOf(FrameCache);
    expect(cache.cache).toBeInstanceOf(Map);
    expect(cache.maxSize).toBe(CONFIG.rendering.cacheSize);
  });

  it('should generate cache key', () => {
    const params = {
      zoom: 1.0,
      offset: { x: 0, y: 0 },
      iterations: 125,
      colorScheme: 'classic',
      xScale: 1.0,
      yScale: 1.0,
      juliaC: { x: 0, y: 0 },
    };
    const key = cache.generateCacheKey(mockCanvas, 'mandelbrot', params);
    expect(key).toBeTruthy();
    expect(typeof key).toBe('string');
    expect(key).toContain('mandelbrot');
  });

  it('should return null for invalid canvas', () => {
    const params = {
      zoom: 1.0,
      offset: { x: 0, y: 0 },
      iterations: 125,
      colorScheme: 'classic',
      xScale: 1.0,
      yScale: 1.0,
      juliaC: { x: 0, y: 0 },
    };
    const key = cache.generateCacheKey(null, 'mandelbrot', params);
    expect(key).toBeNull();
  });

  it('should get cached frame', () => {
    const params = {
      zoom: 1.0,
      offset: { x: 0, y: 0 },
      iterations: 125,
      colorScheme: 'classic',
      xScale: 1.0,
      yScale: 1.0,
      juliaC: { x: 0, y: 0 },
    };
    const key = cache.generateCacheKey(mockCanvas, 'mandelbrot', params);
    cache.cache.set(key, { framebuffer: mockFramebuffer, timestamp: Date.now() });
    
    const cached = cache.getCachedFrame(mockCanvas, 'mandelbrot', params, mockRegl);
    expect(cached).toBeTruthy();
    expect(cached.framebuffer).toBe(mockFramebuffer);
  });

  it('should return null for non-cached frame', () => {
    const params = {
      zoom: 1.0,
      offset: { x: 0, y: 0 },
      iterations: 125,
      colorScheme: 'classic',
      xScale: 1.0,
      yScale: 1.0,
      juliaC: { x: 0, y: 0 },
    };
    const cached = cache.getCachedFrame(mockCanvas, 'mandelbrot', params, mockRegl);
    expect(cached).toBeNull();
  });

  it('should cache frame', () => {
    const params = {
      zoom: 1.0,
      offset: { x: 0, y: 0 },
      iterations: 125,
      colorScheme: 'classic',
      xScale: 1.0,
      yScale: 1.0,
      juliaC: { x: 0, y: 0 },
    };
    cache.cacheFrame(mockCanvas, 'mandelbrot', params, mockFramebuffer);
    expect(cache.cache.size).toBe(1);
  });

  it('should limit cache size', () => {
    const params = {
      zoom: 1.0,
      offset: { x: 0, y: 0 },
      iterations: 125,
      colorScheme: 'classic',
      xScale: 1.0,
      yScale: 1.0,
      juliaC: { x: 0, y: 0 },
    };
    
    // Fill cache to max size
    for (let i = 0; i < CONFIG.rendering.cacheSize; i++) {
      const framebuffer = { destroy: vi.fn(), color: {} };
      cache.cacheFrame(mockCanvas, 'mandelbrot', { ...params, zoom: i }, framebuffer);
    }
    
    expect(cache.cache.size).toBe(CONFIG.rendering.cacheSize);
    
    // Add one more - should evict oldest
    const newFramebuffer = { destroy: vi.fn(), color: {} };
    cache.cacheFrame(mockCanvas, 'mandelbrot', { ...params, zoom: 999 }, newFramebuffer);
    
    expect(cache.cache.size).toBe(CONFIG.rendering.cacheSize);
  });

  it('should clear cache', () => {
    const params = {
      zoom: 1.0,
      offset: { x: 0, y: 0 },
      iterations: 125,
      colorScheme: 'classic',
      xScale: 1.0,
      yScale: 1.0,
      juliaC: { x: 0, y: 0 },
    };
    cache.cacheFrame(mockCanvas, 'mandelbrot', params, mockFramebuffer);
    expect(cache.cache.size).toBe(1);
    
    cache.clear();
    expect(cache.cache.size).toBe(0);
    expect(mockFramebuffer.destroy).toHaveBeenCalled();
  });
});

