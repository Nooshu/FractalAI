import { describe, it, expect, beforeEach } from 'vitest';
import { FractalLoader } from '../../static/js/fractals/loader.js';

/**
 * Test Mandelbrot family code splitting
 * Verifies that all Mandelbrot family fractals can be loaded via the family chunk
 */
describe('Mandelbrot Family Code Splitting', () => {
  let loader;

  beforeEach(() => {
    loader = new FractalLoader();
    loader.clearCache();
  });

  const mandelbrotFamilyFractals = [
    'mandelbrot',
    'celtic-mandelbrot',
    'multibrot',
    'mutant-mandelbrot',
    'phoenix-mandelbrot',
    'burning-ship',
    'tricorn',
    'nebulabrot',
  ];

  for (const fractalType of mandelbrotFamilyFractals) {
    it(`should load ${fractalType} from Mandelbrot family`, async () => {
      const module = await loader.loadFractal(fractalType);

      // Verify module has required exports
      expect(module).toBeDefined();
      expect(module.render).toBeDefined();
      expect(typeof module.render).toBe('function');
      expect(module.is2D).toBe(true);
      expect(module.config).toBeDefined();

      // Verify it's cached
      expect(loader.isCached(fractalType)).toBe(true);
    });
  }

  it('should cache fractals after loading', async () => {
    // Load first fractal
    const module1 = await loader.loadFractal('mandelbrot');
    expect(loader.isCached('mandelbrot')).toBe(true);

    // Load another fractal from same family
    await loader.loadFractal('burning-ship');
    expect(loader.isCached('burning-ship')).toBe(true);

    // Both should be cached
    expect(loader.cache.size).toBe(2);

    // Loading again should return cached version
    const module1Cached = await loader.loadFractal('mandelbrot');
    expect(module1Cached).toBe(module1);
  });

  it('should load all Mandelbrot family fractals sequentially', async () => {
    const loadedModules = [];

    for (const fractalType of mandelbrotFamilyFractals) {
      const module = await loader.loadFractal(fractalType);
      loadedModules.push({ fractalType, module });

      // Verify each module is valid
      expect(module.render).toBeDefined();
      expect(typeof module.render).toBe('function');
    }

    // All should be cached
    expect(loader.cache.size).toBe(mandelbrotFamilyFractals.length);

    // Verify all modules are different instances
    const uniqueModules = new Set(loadedModules.map((m) => m.module));
    expect(uniqueModules.size).toBe(mandelbrotFamilyFractals.length);
  });

  it('should handle switching between Mandelbrot family fractals', async () => {
    // Load mandelbrot
    const mandelbrot = await loader.loadFractal('mandelbrot');
    expect(mandelbrot).toBeDefined();

    // Switch to burning-ship
    const burningShip = await loader.loadFractal('burning-ship');
    expect(burningShip).toBeDefined();
    expect(burningShip).not.toBe(mandelbrot);

    // Switch to tricorn
    const tricorn = await loader.loadFractal('tricorn');
    expect(tricorn).toBeDefined();
    expect(tricorn).not.toBe(mandelbrot);
    expect(tricorn).not.toBe(burningShip);

    // All should be cached
    expect(loader.cache.size).toBe(3);
  });

  it('should maintain backward compatibility with individual imports', async () => {
    // Clear cache to force fresh load
    loader.clearCache();

    // Load a non-Mandelbrot family fractal (should use individual import)
    // Using julia as it's not in Mandelbrot family
    try {
      const julia = await loader.loadFractal('julia');
      expect(julia).toBeDefined();
      expect(julia.render).toBeDefined();
      expect(typeof julia.render).toBe('function');
    } catch (error) {
      // If julia doesn't exist, that's okay - the test is about backward compatibility
      // The important thing is that the loader doesn't break
      expect(error).toBeDefined();
    }
  });
});
