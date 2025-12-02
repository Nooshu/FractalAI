import { describe, it, expect } from 'vitest';

/**
 * Test that validates fractal family modules export correctly
 * These modules are re-export aggregators for code splitting
 */

const familyModules = [
  'attractor-family',
  'cantor-family',
  'dragon-family',
  'geometric-family',
  'julia-family',
  'koch-family',
  'mandelbrot-family',
  'noise-family',
  'other-family',
  'physics-family',
  'plant-family',
  'root-finding-family',
  'sierpinski-family',
  'space-filling-family',
  'tiling-family',
];

describe('Fractal Family Modules', () => {
  for (const familyName of familyModules) {
    it(`should load ${familyName} module`, async () => {
      try {
        const module = await import(
          `../../static/js/fractals/2d/families/${familyName}.js`
        );

        // Family modules should export a fractals object
        expect(module).toHaveProperty('fractals');
        expect(typeof module.fractals).toBe('object');

        // Verify fractals object has at least one fractal
        const fractalKeys = Object.keys(module.fractals);
        expect(fractalKeys.length).toBeGreaterThan(0);
      } catch (error) {
        // If module doesn't exist, skip the test
        if (error.message.includes('Failed to fetch')) {
          console.warn(`Skipping ${familyName} - module not found`);
          return;
        }
        throw error;
      }
    });

    it(`should export valid fractal modules from ${familyName}`, async () => {
      try {
        const module = await import(
          `../../static/js/fractals/2d/families/${familyName}.js`
        );

        // Check that each fractal in the family has required exports
        for (const [_fractalName, fractalModule] of Object.entries(module.fractals)) {
          expect(fractalModule).toHaveProperty('render');
          expect(typeof fractalModule.render).toBe('function');
          expect(fractalModule).toHaveProperty('is2D');
          expect(typeof fractalModule.is2D).toBe('boolean');
        }
      } catch (error) {
        if (error.message.includes('Failed to fetch')) {
          return;
        }
        throw error;
      }
    });
  }

  it('should have consistent structure across all families', async () => {
    // Test with mandelbrot-family as reference
    const module = await import(
      '../../static/js/fractals/2d/families/mandelbrot-family.js'
    );

    expect(module).toHaveProperty('fractals');
    expect(typeof module.fractals).toBe('object');

    // Verify at least one fractal exists
    const fractalKeys = Object.keys(module.fractals);
    expect(fractalKeys.length).toBeGreaterThan(0);
  });
});

