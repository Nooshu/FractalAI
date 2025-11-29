/**
 * Fractal Loader Module
 * Moderate complexity module for loading and managing fractal modules
 * Handles dynamic loading, caching, and state management
 */

import { appState } from '../core/app-state.js';

/**
 * Fractal family mapping
 * Maps fractal types to their family chunks for code splitting optimization
 */
const FRACTAL_FAMILIES = {
  // Mandelbrot Family
  mandelbrot: 'mandelbrot-family',
  'celtic-mandelbrot': 'mandelbrot-family',
  multibrot: 'mandelbrot-family',
  'mutant-mandelbrot': 'mandelbrot-family',
  'phoenix-mandelbrot': 'mandelbrot-family',
  'burning-ship': 'mandelbrot-family',
  tricorn: 'mandelbrot-family',
  nebulabrot: 'mandelbrot-family',

  // Julia Sets
  julia: 'julia-family',
  'julia-snakes': 'julia-family',
  'multibrot-julia': 'julia-family',
  'burning-ship-julia': 'julia-family',
  'tricorn-julia': 'julia-family',
  'phoenix-julia': 'julia-family',
  'lambda-julia': 'julia-family',
  'hybrid-julia': 'julia-family',

  // Sierpinski Family
  sierpinski: 'sierpinski-family',
  'sierpinski-arrowhead': 'sierpinski-family',
  'sierpinski-carpet': 'sierpinski-family',
  'sierpinski-gasket': 'sierpinski-family',
  'sierpinski-hexagon': 'sierpinski-family',
  'sierpinski-lsystem': 'sierpinski-family',
  'sierpinski-pentagon': 'sierpinski-family',
  'quadrilateral-subdivision': 'sierpinski-family',
  'recursive-polygon-splitting': 'sierpinski-family',
  'triangular-subdivision': 'sierpinski-family',

  // Dragon Curves
  'binary-dragon': 'dragon-family',
  'dragon-lsystem': 'dragon-family',
  'folded-paper-dragon': 'dragon-family',
  'heighway-dragon': 'dragon-family',
  terdragon: 'dragon-family',
  twindragon: 'dragon-family',

  // Space-Filling Curves
  'gosper-curve': 'space-filling-family',
  'hilbert-curve': 'space-filling-family',
  'levy-c-curve': 'space-filling-family',
  'moore-curve': 'space-filling-family',
  'peano-curve': 'space-filling-family',

  // Root-Finding Fractals
  newton: 'root-finding-family',
  halley: 'root-finding-family',
  nova: 'root-finding-family',

  // Plant Family
  plant: 'plant-family',
  'barnsley-fern': 'plant-family',

  // Koch Family
  'fractal-islands': 'koch-family',
  koch: 'koch-family',
  'quadratic-koch': 'koch-family',

  // Cantor Family
  cantor: 'cantor-family',
  'cantor-dust-base-expansion': 'cantor-family',
  'cantor-dust-circular': 'cantor-family',
  'fat-cantor': 'cantor-family',
  'smith-volterra-cantor': 'cantor-family',
  'random-cantor': 'cantor-family',

  // Tilings
  'domino-substitution': 'tiling-family',
  'pinwheel-tiling': 'tiling-family',
  'snowflake-tiling': 'tiling-family',

  // Other Fractals
  'amman-tiling': 'other-family',
  'apollonian-gasket': 'other-family',
  'carpenter-square': 'other-family',
  'chair-tiling': 'other-family',
  'h-tree': 'other-family',
  'h-tree-generalized': 'other-family',
  vicsek: 'other-family',
  cross: 'other-family',
  'diffusion-limited-aggregation': 'other-family',
  'fractional-brownian-motion': 'other-family',
  'fractal-flame': 'other-family',
  'levy-flights': 'other-family',
  'recursive-circle-removal': 'other-family',
  rose: 'other-family',
  'box-variants': 'other-family',
  'minkowski-sausage': 'other-family',
  'penrose-substitution': 'other-family',
  'perlin-noise': 'other-family',
  'percolation-cluster': 'other-family',
  buffalo: 'other-family',
  popcorn: 'other-family',
  'random-midpoint-displacement': 'other-family',
  rauzy: 'other-family',
  'simplex-noise': 'other-family',
  'spider-set': 'other-family',
  magnet: 'other-family',
  cesaro: 'other-family',
};

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
      // Check if fractal belongs to a family
      const family = FRACTAL_FAMILIES[fractalType];

      if (family) {
        // Load from family chunk
        try {
          const familyModule = await import(`./2d/families/${family}.js`);
          const module = familyModule.fractals?.[fractalType];

          if (module && module.render) {
            // Cache the module
            this.cache.set(fractalType, module);
            return module;
          } else {
            // If module not found in family, fall through to individual import
            console.warn(
              `Fractal ${fractalType} not found in ${family} family, trying individual import`
            );
          }
        } catch (familyError) {
          // Fall through to individual import if family load fails
          console.warn(
            `Family load failed for ${fractalType}, trying individual import`,
            familyError
          );
        }
      }

      // Fallback to individual import (for non-family fractals or if family load fails)
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
    setCurrentFractalModule: (module) => {
      appState.setCurrentFractalModule(module);
    },
    setCurrentFractalType: (type) => {
      appState.setCurrentFractalType(type);
    },
  });
}
