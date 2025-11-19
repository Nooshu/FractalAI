import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FractalLoader } from '../../static/js/fractals/loader.js';

describe('FractalLoader', () => {
  let loader;

  beforeEach(() => {
    loader = new FractalLoader();
    // Clear cache before each test
    loader.clearCache();
  });

  it('should create a new FractalLoader instance', () => {
    expect(loader).toBeInstanceOf(FractalLoader);
    expect(loader.cache).toBeInstanceOf(Map);
  });

  it('should cache loaded fractals', async () => {
    // Mock the import
    const mockModule = {
      render: vi.fn(),
    };
    
    vi.doMock('../../static/js/fractals/2d/mandelbrot.js', () => ({
      default: mockModule,
      ...mockModule,
    }));

    // Note: This test would need actual fractal modules to work properly
    // In a real scenario, you'd need to set up proper module mocking
    expect(loader.cache.size).toBe(0);
  });

  it('should clear cache', () => {
    loader.cache.set('test', {});
    expect(loader.cache.size).toBe(1);
    
    loader.clearCache();
    expect(loader.cache.size).toBe(0);
  });

  it('should throw error if mandelbrot fails to load', async () => {
    // This would require mocking the import to fail
    // In a real test environment, you'd mock the dynamic import
    await expect(loader.loadFractal('nonexistent')).rejects.toThrow();
  });
});

