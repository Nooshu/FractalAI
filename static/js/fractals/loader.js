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
  buddhabrot: 'mandelbrot-family',
  'multibrot-cubic': 'mandelbrot-family',
  'multibrot-quartic': 'mandelbrot-family',
  'multibrot-quintic': 'mandelbrot-family',

  // Julia Sets
  julia: 'julia-family',
  'julia-snakes': 'julia-family',
  'multibrot-julia': 'julia-family',
  'burning-ship-julia': 'julia-family',
  'tricorn-julia': 'julia-family',
  'phoenix-julia': 'julia-family',
  'lambda-julia': 'julia-family',
  'hybrid-julia': 'julia-family',
  'pickover-stalks': 'julia-family',
  biomorphs: 'julia-family',

  // Sierpinski Family
  sierpinski: 'sierpinski-family',
  'sierpinski-arrowhead': 'sierpinski-family',
  'sierpinski-carpet': 'sierpinski-family',
  'sierpinski-gasket': 'sierpinski-family',
  'sierpinski-hexagon': 'sierpinski-family',
  'sierpinski-lsystem': 'sierpinski-family',
  'sierpinski-pentagon': 'sierpinski-family',
  'sierpinski-tetrahedron': 'sierpinski-family',
  'menger-carpet': 'sierpinski-family',
  'quadrilateral-subdivision': 'sierpinski-family',
  'recursive-polygon-splitting': 'sierpinski-family',
  'triangular-subdivision': 'sierpinski-family',

  // Dragon Curves
  'binary-dragon': 'dragon-family',
  'dragon-lsystem': 'dragon-family',
  'folded-paper-dragon': 'dragon-family',
  'heighway-dragon': 'dragon-family',
  'levy-dragon': 'dragon-family',
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
  'fractal-tree': 'plant-family',

  // Tree Family
  'pythagoras-tree': 'tree-family',
  'pythagoras-tree-wide': 'tree-family',
  'pythagoras-tree-narrow': 'tree-family',
  'binary-fractal-tree': 'tree-family',
  'ternary-fractal-tree': 'tree-family',
  'quaternary-fractal-tree': 'tree-family',
  'lsystem-tree-oak': 'tree-family',
  'lsystem-tree-pine': 'tree-family',
  'fractal-canopy': 'tree-family',

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
  'amman-tiling': 'tiling-family',
  'penrose-substitution': 'tiling-family',
  rauzy: 'tiling-family',
  'chair-tiling': 'tiling-family',
  'rhombic-tiling': 'tiling-family',
  'aperiodic-tilings': 'tiling-family',
  'substitution-tilings': 'tiling-family',

  // Attractor Family
  'lorenz-attractor': 'attractor-family',
  'rossler-attractor': 'attractor-family',
  lyapunov: 'attractor-family',
  'chua-attractor': 'attractor-family',
  'ifs-spiral': 'attractor-family',
  'ifs-maple': 'attractor-family',
  'ifs-tree': 'attractor-family',

  // Noise Family
  'perlin-noise': 'noise-family',
  'simplex-noise': 'noise-family',
  'fractional-brownian-motion': 'noise-family',
  'random-midpoint-displacement': 'noise-family',

  // Physics Family
  'diffusion-limited-aggregation': 'physics-family',
  'percolation-cluster': 'physics-family',
  'levy-flights': 'physics-family',

  // Geometric Family
  'apollonian-gasket': 'geometric-family',
  'carpenter-square': 'geometric-family',
  cross: 'geometric-family',
  'box-variants': 'geometric-family',
  'minkowski-sausage': 'geometric-family',
  cesaro: 'geometric-family',
  'recursive-circle-removal': 'geometric-family',
  rose: 'geometric-family',
  'menger-sponge': 'geometric-family',

  // Self-Similar Curves
  'de-rham-curve': 'self-similar-curves-family',

  // Other Escape-Time Fractals
  buffalo: 'escape-time-family',
  popcorn: 'escape-time-family',
  'spider-set': 'escape-time-family',
  magnet: 'escape-time-family',

  // Fractal Dimension Plots
  'fractal-dimension-plot': 'dimension-plot-family',

  // Other Fractals
  'h-tree': 'other-family',
  'h-tree-generalized': 'other-family',
  vicsek: 'other-family',
  'fractal-flame': 'other-family',
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
