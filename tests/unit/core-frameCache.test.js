import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FrameCache } from '../../static/js/core/frameCache.js';

describe('core FrameCache', () => {
  let cache;
  let mockCanvas;
  let mockFramebuffer;

  beforeEach(() => {
    cache = new FrameCache(2);
    mockCanvas = {
      parentElement: {
        getBoundingClientRect: () => ({ width: 800, height: 600 }),
        clientWidth: 800,
        clientHeight: 600,
      },
    };
    mockFramebuffer = {
      destroy: vi.fn(),
    };
  });

  it('generates a stable cache key including fractal type', () => {
    const params = {
      zoom: 1,
      offset: { x: 0, y: 0 },
      iterations: 100,
      colorScheme: 'classic',
      xScale: 1,
      yScale: 1,
      juliaC: { x: 0, y: 0 },
    };

    const key = cache.generateCacheKey(mockCanvas, 'mandelbrot', params);
    expect(key).toBeTypeOf('string');
    expect(key).toContain('mandelbrot');
  });

  it('returns null cache key when canvas is missing', () => {
    const params = {
      zoom: 1,
      offset: { x: 0, y: 0 },
      iterations: 100,
      colorScheme: 'classic',
      xScale: 1,
      yScale: 1,
      juliaC: { x: 0, y: 0 },
    };

    const key = cache.generateCacheKey(null, 'mandelbrot', params);
    expect(key).toBeNull();
  });

  it('stores and retrieves cached frames', () => {
    const params = {
      zoom: 1,
      offset: { x: 0, y: 0 },
      iterations: 100,
      colorScheme: 'classic',
      xScale: 1,
      yScale: 1,
      juliaC: { x: 0, y: 0 },
    };

    cache.cacheFrame(mockCanvas, 'mandelbrot', params, mockFramebuffer);
    const cached = cache.getCachedFrame(mockCanvas, 'mandelbrot', params, {});

    expect(cached).not.toBeNull();
    expect(cached.framebuffer).toBe(mockFramebuffer);
  });

  it('clears the cache and destroys framebuffers on clear()', () => {
    const params = {
      zoom: 1,
      offset: { x: 0, y: 0 },
      iterations: 100,
      colorScheme: 'classic',
      xScale: 1,
      yScale: 1,
      juliaC: { x: 0, y: 0 },
    };

    cache.cacheFrame(mockCanvas, 'mandelbrot', params, mockFramebuffer);
    expect(cache.size()).toBe(1);

    cache.clear();
    expect(cache.size()).toBe(0);
    expect(mockFramebuffer.destroy).toHaveBeenCalled();
  });
});
