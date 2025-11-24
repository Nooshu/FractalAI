/**
 * Fractal Loader Module
 * Moderate complexity module for loading and managing fractal modules
 * Handles dynamic loading, caching, and state management
 */

import { appState } from '../core/app-state.js';

/**
 * Fractal loader class
 */
export class FractalLoader {
  constructor() {
    this.cache = new Map();
    this.isLoading = false;
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

    this.isLoading = true;
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
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load a fractal module and update state via callbacks
   * @param {string} fractalType - Type of fractal to load
   * @param {Object} callbacks - Callback functions for state updates
   * @param {Function} callbacks.setCurrentFractalModule - Function to set current fractal module
   * @param {Function} callbacks.setCurrentFractalType - Function to set current fractal type
   * @returns {Promise<Object>} Loaded fractal module
   */
  async loadFractalWithState(fractalType, callbacks) {
    const { setCurrentFractalModule, setCurrentFractalType } = callbacks;

    // Check cache first
    if (this.cache.has(fractalType)) {
      const module = this.cache.get(fractalType);
      if (setCurrentFractalModule) {
        setCurrentFractalModule(module);
      }
      if (setCurrentFractalType) {
        setCurrentFractalType(fractalType);
      }
      return module;
    }

    // Use the internal loadFractal which handles loading state
    const module = await this.loadFractal(fractalType);
    
    if (setCurrentFractalModule) {
      setCurrentFractalModule(module);
    }
    if (setCurrentFractalType) {
      setCurrentFractalType(fractalType);
    }
    
    return module;
  }

  /**
   * Check if a fractal is currently being loaded
   * @returns {boolean} True if loading
   */
  getIsLoading() {
    return this.isLoading;
  }

  /**
   * Clear the fractal cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Remove a specific fractal from cache
   * @param {string} fractalType - Fractal type to remove
   */
  removeFromCache(fractalType) {
    this.cache.delete(fractalType);
  }

  /**
   * Check if a fractal is cached
   * @param {string} fractalType - Fractal type to check
   * @returns {boolean} True if cached
   */
  isCached(fractalType) {
    return this.cache.has(fractalType);
  }
}

// Export singleton instance for convenience
export const fractalLoader = new FractalLoader();

/**
 * Convenience function to load a fractal module and update app state
 * @param {string} fractalType - Type of fractal to load
 * @returns {Promise<Object>} Loaded fractal module
 */
export async function loadFractal(fractalType) {
  await fractalLoader.loadFractalWithState(fractalType, {
    setCurrentFractalModule: (module) => { appState.setCurrentFractalModule(module); },
    setCurrentFractalType: (type) => { appState.setCurrentFractalType(type); },
  });
}

