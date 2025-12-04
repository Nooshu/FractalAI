/**
 * List of all fractals to test
 * Extracted from index.html for maintainability
 */
export const FRACTAL_TYPES = [
  // Mandelbrot Family
  'mandelbrot',
  'celtic-mandelbrot',
  'multibrot',
  'mutant-mandelbrot',
  'phoenix-mandelbrot',
  'burning-ship',
  'tricorn',
  'nebulabrot',
  'buddhabrot',

  // Julia Sets
  'julia',
  'julia-snakes',
  'multibrot-julia',
  'burning-ship-julia',
  'tricorn-julia',
  'phoenix-julia',
  'lambda-julia',
  'hybrid-julia',

  // Sierpinski Family
  'sierpinski',
  'sierpinski-arrowhead',
  'sierpinski-carpet',
  'sierpinski-gasket',
  'sierpinski-hexagon',
  'sierpinski-lsystem',
  'sierpinski-pentagon',
  'quadrilateral-subdivision',
  'recursive-polygon-splitting',
  'triangular-subdivision',

  // Koch Family
  'fractal-islands',
  'koch',
  'quadratic-koch',

  // Cantor Family
  'cantor',
  'cantor-dust-base-expansion',
  'cantor-dust-circular',
  'fat-cantor',
  'smith-volterra-cantor',
  'random-cantor',

  // Dragon Curves
  'binary-dragon',
  'dragon-lsystem',
  'folded-paper-dragon',
  'heighway-dragon',
  'terdragon',
  'twindragon',

  // Space-Filling Curves
  'gosper-curve',
  'hilbert-curve',
  'levy-c-curve',
  'moore-curve',
  'peano-curve',

  // Root-Finding Fractals
  'newton',
  'halley',
  'nova',

  // Plant Family
  'plant',
  'barnsley-fern',
  'fractal-tree',

  // Tree Family
  'pythagoras-tree',
  'binary-fractal-tree',
  'ternary-fractal-tree',
  'lsystem-tree-oak',
  'lsystem-tree-pine',
  'fractal-canopy',

  // Tilings
  'domino-substitution',
  'pinwheel-tiling',
  'snowflake-tiling',

  // Other Fractals
  'amman-tiling',
  'apollonian-gasket',
  'carpenter-square',
  'chair-tiling',
  'h-tree',
  'h-tree-generalized',
  'vicsek',
  'cross',
  'diffusion-limited-aggregation',
  'fractional-brownian-motion',
  'fractal-flame',
  'levy-flights',
  'recursive-circle-removal',
  'rose',
  'box-variants',
  'minkowski-sausage',
  'penrose-substitution',
  'perlin-noise',
  'percolation-cluster',
  'buffalo',
  'popcorn',
  'random-midpoint-displacement',
  'rauzy',
  'simplex-noise',
  'spider-set',
  'magnet',
  'cesaro',
  'lyapunov',
  'lorenz-attractor',
  'rossler-attractor',
  'menger-sponge',
];

/**
 * Fractal test configurations
 * Some fractals may need specific parameters or longer render times
 */
export const FRACTAL_CONFIGS = {
  // Default configuration
  default: {
    iterations: 125,
    zoom: 1,
    waitForRender: 2000, // ms to wait for render
    threshold: 0.2, // Pixel difference threshold (0-1)
    maxDiffPixels: 20000, // Maximum number of different pixels (default)
  },

  // Fractals that need more iterations
  highDetail: {
    iterations: 200,
    zoom: 1,
    waitForRender: 3000,
    threshold: 0.2,
    maxDiffPixels: 20000,
  },

  // Fractals that may have slight variations (random elements)
  variable: {
    iterations: 125,
    zoom: 1,
    waitForRender: 2000,
    threshold: 0.3, // Higher threshold for random fractals
    maxDiffPixels: 200000, // Much higher limit for highly random fractals (allows significant variation)
  },

  // Specific fractal overrides
  fractals: {
    nebulabrot: { iterations: 100, waitForRender: 4000, threshold: 0.25, maxDiffPixels: 20000 },
    'random-cantor': { threshold: 0.3, maxDiffPixels: 30000 },
    'random-midpoint-displacement': { threshold: 0.3, maxDiffPixels: 30000 },
    'diffusion-limited-aggregation': { threshold: 0.3, maxDiffPixels: 30000 },
    'percolation-cluster': { threshold: 0.3, maxDiffPixels: 200000 }, // Very high variation
    'levy-flights': { threshold: 0.3, maxDiffPixels: 30000 },
    'fractal-flame': { waitForRender: 3000, maxDiffPixels: 20000 },
  },
};

/**
 * Get configuration for a specific fractal
 */
export function getFractalConfig(fractalType) {
  const specific = FRACTAL_CONFIGS.fractals[fractalType];
  if (specific) {
    return { ...FRACTAL_CONFIGS.default, ...specific };
  }

  // Check if it's a high-detail fractal
  const highDetailFractals = ['mandelbrot', 'julia', 'multibrot', 'burning-ship'];
  if (highDetailFractals.includes(fractalType)) {
    return { ...FRACTAL_CONFIGS.default, ...FRACTAL_CONFIGS.highDetail };
  }

  // Check if it's a variable/random fractal
  const variableFractals = [
    'random-cantor',
    'random-midpoint-displacement',
    'diffusion-limited-aggregation',
    'percolation-cluster',
    'levy-flights',
  ];
  if (variableFractals.includes(fractalType)) {
    return { ...FRACTAL_CONFIGS.default, ...FRACTAL_CONFIGS.variable };
  }

  return FRACTAL_CONFIGS.default;
}
