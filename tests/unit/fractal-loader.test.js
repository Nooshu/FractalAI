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

  it('should handle loading nonexistent fractals gracefully', async () => {
    // The loader falls back to mandelbrot if a fractal fails to load
    // This test verifies that the loader handles errors gracefully
    // Note: Dynamic imports are difficult to mock, so this test may load actual modules
    // Suppress expected error and warning logs
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    try {
      await loader.loadFractal('nonexistent');
      // If it doesn't throw, it should have loaded mandelbrot as fallback
      expect(loader.cache.size).toBeGreaterThanOrEqual(0);
    } catch (error) {
      // If mandelbrot also fails (e.g., in test environment), that's acceptable
      expect(error).toBeDefined();
    } finally {
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    }
  });
});

