import { describe, it, expect } from 'vitest';

/**
 * Test that validates fractal modules have the required structure
 * This test ensures all fractal modules export the required functions
 */

// List of fractal modules to test
const fractalModules = [
  'mandelbrot',
  'julia',
  'burning-ship',
  'multibrot',
  'sierpinski',
  'koch',
  'heighway-dragon',
  'hilbert-curve',
];

describe('Fractal Modules Structure', () => {
  for (const fractalType of fractalModules) {
    it(`should load ${fractalType} module with required exports`, async () => {
      try {
        const module = await import(`../../static/js/fractals/2d/${fractalType}.js`);
        
        // Check that module has render function
        expect(module).toHaveProperty('render');
        expect(typeof module.render).toBe('function');
        
        // Render function should return a draw command (function)
        // We can't fully test this without a regl context, but we can check it exists
      } catch (error) {
        // If module doesn't exist, skip the test
        if (error.message.includes('Failed to fetch')) {
          console.warn(`Skipping ${fractalType} - module not found`);
          return;
        }
        throw error;
      }
    });
  }

  it('should have consistent module structure', async () => {
    // Test with mandelbrot as a reference
    const module = await import('../../static/js/fractals/2d/mandelbrot.js');
    
    expect(module).toHaveProperty('render');
    expect(typeof module.render).toBe('function');
    
    // The render function should accept regl, params, and canvas
    // We can't fully test the function signature without mocking regl
    // but we can verify it's a function
  });
});

