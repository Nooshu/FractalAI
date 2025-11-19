/**
 * Fractal module loader
 * Handles dynamic loading and caching of fractal modules
 */

/**
 * Fractal loader class
 */
export class FractalLoader {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Load a fractal module
   * @param {string} fractalType - Type of fractal to load
   * @returns {Promise<Object>} Loaded fractal module
   */
  async loadFractal(fractalType) {
    // Check cache first
    if (this.cache.has(fractalType)) {
      return this.cache.get(fractalType);
    }

    try {
      // All fractals are 2D, load from 2d folder
      const module = await import(`./2d/${fractalType}.js`);

      // Verify the module has required exports
      if (!module.render) {
        throw new Error(`Fractal module ${fractalType} missing render function`);
      }

      // Cache the module
      this.cache.set(fractalType, module);
      return module;
    } catch (error) {
      console.error(`Failed to load fractal: ${fractalType}`, error);
      // Fallback to mandelbrot if loading fails
      if (fractalType !== 'mandelbrot') {
        console.warn(`Falling back to mandelbrot`);
        return this.loadFractal('mandelbrot');
      } else {
        throw error; // Re-throw if mandelbrot also fails
      }
    }
  }

  /**
   * Clear the fractal cache
   */
  clearCache() {
    this.cache.clear();
  }
}

