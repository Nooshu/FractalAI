/**
 * Fractal Configuration Module
 * Data-heavy but isolated module containing fractal configuration data
 * Includes Wikipedia URLs and initial render positions for all fractal types
 */

/**
 * Mapping of fractal types to Wikipedia URLs
 */
const FRACTAL_WIKIPEDIA_URLS = {
  mandelbrot: 'https://en.wikipedia.org/wiki/Mandelbrot_set',
  'celtic-mandelbrot': 'https://en.wikipedia.org/wiki/Mandelbrot_set',
  multibrot: 'https://en.wikipedia.org/wiki/Multibrot_set',
  'multibrot-cubic': 'https://en.wikipedia.org/wiki/Multibrot_set',
  'multibrot-quartic': 'https://en.wikipedia.org/wiki/Multibrot_set',
  'multibrot-quintic': 'https://en.wikipedia.org/wiki/Multibrot_set',
  'multibrot-sextic': 'https://en.wikipedia.org/wiki/Multibrot_set',
  'multibrot-septic': 'https://en.wikipedia.org/wiki/Multibrot_set',
  'multibrot-octic': 'https://en.wikipedia.org/wiki/Multibrot_set',
  'multibrot-nonic': 'https://en.wikipedia.org/wiki/Multibrot_set',
  'multibrot-decic': 'https://en.wikipedia.org/wiki/Multibrot_set',
  'mutant-mandelbrot': 'https://en.wikipedia.org/wiki/Mandelbrot_set',
  'phoenix-mandelbrot': 'https://en.wikipedia.org/wiki/Phoenix_fractal',
  'burning-ship': 'https://en.wikipedia.org/wiki/Burning_Ship_fractal',
  tricorn: 'https://en.wikipedia.org/wiki/Tricorn_(mathematics)',
  nebulabrot: 'https://en.wikipedia.org/wiki/Nebulabrot',
  buddhabrot: 'https://en.wikipedia.org/wiki/Buddhabrot',
  julia: 'https://en.wikipedia.org/wiki/Julia_set',
  'julia-snakes': 'https://en.wikipedia.org/wiki/Julia_set',
  'multibrot-julia': 'https://en.wikipedia.org/wiki/Julia_set',
  'burning-ship-julia': 'https://en.wikipedia.org/wiki/Julia_set',
  'tricorn-julia': 'https://en.wikipedia.org/wiki/Julia_set',
  'phoenix-julia': 'https://en.wikipedia.org/wiki/Julia_set',
  'lambda-julia': 'https://en.wikipedia.org/wiki/Julia_set',
  'hybrid-julia': 'https://en.wikipedia.org/wiki/Julia_set',
  'pickover-stalks': 'https://en.wikipedia.org/wiki/Julia_set',
  biomorphs: 'https://en.wikipedia.org/wiki/Julia_set',
  sierpinski: 'https://en.wikipedia.org/wiki/Sierpinski_triangle',
  'sierpinski-arrowhead': 'https://en.wikipedia.org/wiki/Sierpinski_curve',
  'sierpinski-carpet': 'https://en.wikipedia.org/wiki/Sierpinski_carpet',
  'sierpinski-gasket': 'https://en.wikipedia.org/wiki/Sierpinski_triangle',
  'sierpinski-hexagon': 'https://en.wikipedia.org/wiki/Sierpinski_triangle',
  'sierpinski-lsystem': 'https://en.wikipedia.org/wiki/Sierpinski_triangle',
  'sierpinski-pentagon': 'https://en.wikipedia.org/wiki/Sierpinski_triangle',
  'sierpinski-tetrahedron': 'https://en.wikipedia.org/wiki/Sierpinski_triangle',
  'menger-carpet': 'https://en.wikipedia.org/wiki/Menger_sponge',
  'quadrilateral-subdivision': 'https://en.wikipedia.org/wiki/Sierpinski_carpet',
  'recursive-polygon-splitting': 'https://en.wikipedia.org/wiki/Sierpinski_triangle',
  'triangular-subdivision': 'https://en.wikipedia.org/wiki/Sierpinski_triangle',
  'fractal-islands': 'https://en.wikipedia.org/wiki/Koch_snowflake',
  koch: 'https://en.wikipedia.org/wiki/Koch_snowflake',
  'quadratic-koch': 'https://en.wikipedia.org/wiki/Koch_snowflake',
  cantor: 'https://en.wikipedia.org/wiki/Cantor_set',
  'cantor-dust-base-expansion': 'https://en.wikipedia.org/wiki/Cantor_set',
  'cantor-dust-circular': 'https://en.wikipedia.org/wiki/Cantor_set',
  'fat-cantor': 'https://en.wikipedia.org/wiki/Smith%E2%80%93Volterra%E2%80%93Cantor_set',
  'smith-volterra-cantor':
    'https://en.wikipedia.org/wiki/Smith%E2%80%93Volterra%E2%80%93Cantor_set',
  'random-cantor': 'https://en.wikipedia.org/wiki/Cantor_set',
  'binary-dragon': 'https://en.wikipedia.org/wiki/Dragon_curve',
  'dragon-lsystem': 'https://en.wikipedia.org/wiki/Dragon_curve',
  'folded-paper-dragon': 'https://en.wikipedia.org/wiki/Dragon_curve',
  'heighway-dragon': 'https://en.wikipedia.org/wiki/Dragon_curve',
  'levy-dragon': 'https://en.wikipedia.org/wiki/L%C3%A9vy_C_curve',
  terdragon: 'https://en.wikipedia.org/wiki/Dragon_curve',
  twindragon: 'https://en.wikipedia.org/wiki/Dragon_curve',
  'gosper-curve': 'https://en.wikipedia.org/wiki/Gosper_curve',
  'hilbert-curve': 'https://en.wikipedia.org/wiki/Hilbert_curve',
  'levy-c-curve': 'https://en.wikipedia.org/wiki/L%C3%A9vy_C_curve',
  'moore-curve': 'https://en.wikipedia.org/wiki/Moore_curve',
  'peano-curve': 'https://en.wikipedia.org/wiki/Peano_curve',
  'sierpinski-curve': 'https://en.wikipedia.org/wiki/Sierpi%C5%84ski_curve',
  'de-rham-curve': 'https://en.wikipedia.org/wiki/De_Rham_curve',
  newton: 'https://en.wikipedia.org/wiki/Newton_fractal',
  halley: 'https://en.wikipedia.org/wiki/Halley%27s_method',
  nova: 'https://en.wikipedia.org/wiki/Newton_fractal',
  plant: 'https://en.wikipedia.org/wiki/L-system',
  'barnsley-fern': 'https://en.wikipedia.org/wiki/Barnsley_fern',
  'fractal-tree': 'https://en.wikipedia.org/wiki/Fractal_tree',
  'pythagoras-tree': 'https://en.wikipedia.org/wiki/Pythagoras_tree',
  'pythagoras-tree-wide': 'https://en.wikipedia.org/wiki/Pythagoras_tree',
  'pythagoras-tree-narrow': 'https://en.wikipedia.org/wiki/Pythagoras_tree',
  'binary-fractal-tree': 'https://en.wikipedia.org/wiki/Fractal_tree',
  'ternary-fractal-tree': 'https://en.wikipedia.org/wiki/Fractal_tree',
  'quaternary-fractal-tree': 'https://en.wikipedia.org/wiki/Fractal_tree',
  'lsystem-tree-oak': 'https://en.wikipedia.org/wiki/L-system',
  'lsystem-tree-pine': 'https://en.wikipedia.org/wiki/L-system',
  'fractal-canopy': 'https://en.wikipedia.org/wiki/Fractal_tree',
  'domino-substitution': 'https://en.wikipedia.org/wiki/Aperiodic_tiling',
  'pinwheel-tiling': 'https://en.wikipedia.org/wiki/Pinwheel_tiling',
  'snowflake-tiling': 'https://en.wikipedia.org/wiki/Aperiodic_tiling',
  'rhombic-tiling': 'https://en.wikipedia.org/wiki/Aperiodic_tiling',
  'aperiodic-tilings': 'https://en.wikipedia.org/wiki/Aperiodic_tiling',
  'substitution-tilings': 'https://en.wikipedia.org/wiki/Aperiodic_tiling',
  'amman-tiling': 'https://en.wikipedia.org/wiki/Ammann_tiling',
  'apollonian-gasket': 'https://en.wikipedia.org/wiki/Apollonian_gasket',
  'carpenter-square': 'https://en.wikipedia.org/wiki/T-square_(fractal)',
  'chair-tiling': 'https://en.wikipedia.org/wiki/Chair_tiling',
  'h-tree': 'https://en.wikipedia.org/wiki/H_tree',
  'h-tree-generalized': 'https://en.wikipedia.org/wiki/H_tree',
  vicsek: 'https://en.wikipedia.org/wiki/Vicsek_fractal',
  cross: 'https://en.wikipedia.org/wiki/Cantor_set',
  'diffusion-limited-aggregation': 'https://en.wikipedia.org/wiki/Diffusion-limited_aggregation',
  'fractional-brownian-motion': 'https://en.wikipedia.org/wiki/Fractional_Brownian_motion',
  'fractal-flame': 'https://en.wikipedia.org/wiki/Fractal_flame',
  'levy-flights': 'https://en.wikipedia.org/wiki/L%C3%A9vy_flight',
  'recursive-circle-removal': 'https://en.wikipedia.org/wiki/Apollonian_gasket',
  rose: 'https://en.wikipedia.org/wiki/Rose_(mathematics)',
  'box-variants': 'https://en.wikipedia.org/wiki/T-square_(fractal)',
  'minkowski-sausage': 'https://en.wikipedia.org/wiki/Minkowski_sausage',
  'penrose-substitution': 'https://en.wikipedia.org/wiki/Penrose_tiling',
  'perlin-noise': 'https://en.wikipedia.org/wiki/Perlin_noise',
  'percolation-cluster': 'https://en.wikipedia.org/wiki/Percolation_theory',
  buffalo: 'https://en.wikipedia.org/wiki/Buffalo_fractal',
  popcorn: 'https://en.wikipedia.org/wiki/Popcorn_function',
  'random-midpoint-displacement': 'https://en.wikipedia.org/wiki/Midpoint_displacement',
  rauzy: 'https://en.wikipedia.org/wiki/Rauzy_fractal',
  'simplex-noise': 'https://en.wikipedia.org/wiki/Simplex_noise',
  'spider-set': 'https://en.wikipedia.org/wiki/Spider_fractal',
  magnet: 'https://en.wikipedia.org/wiki/Magnet_fractal',
  cesaro: 'https://en.wikipedia.org/wiki/Ces%C3%A0ro_fractal',
  'fractal-dimension-plot': 'https://en.wikipedia.org/wiki/Fractal_dimension',
  weierstrass: 'https://en.wikipedia.org/wiki/Weierstrass_function',
  takagi: 'https://en.wikipedia.org/wiki/Takagi_function',
  blancmange: 'https://en.wikipedia.org/wiki/Blancmange_curve',
  'lorenz-attractor': 'https://en.wikipedia.org/wiki/Lorenz_system',
  'rossler-attractor': 'https://en.wikipedia.org/wiki/R%C3%B6ssler_attractor',
  lyapunov: 'https://en.wikipedia.org/wiki/Lyapunov_fractal',
  'chua-attractor': 'https://en.wikipedia.org/wiki/Chua_circuit',
  'ifs-spiral': 'https://en.wikipedia.org/wiki/Iterated_function_system',
  'ifs-maple': 'https://en.wikipedia.org/wiki/Iterated_function_system',
  'ifs-tree': 'https://en.wikipedia.org/wiki/Iterated_function_system',
  'menger-sponge': 'https://en.wikipedia.org/wiki/Menger_sponge',
};

/**
 * Get Wikipedia URL for a fractal type
 * @param {string} fractalType - Fractal type
 * @returns {string} Wikipedia URL or default fractal URL
 */
export function getWikipediaUrl(fractalType) {
  return FRACTAL_WIKIPEDIA_URLS[fractalType] || 'https://en.wikipedia.org/wiki/Fractal';
}

/**
 * Update Wikipedia link in the UI based on current fractal type
 * @param {Function} getCurrentFractalType - Function to get current fractal type
 */
export function updateWikipediaLink(getCurrentFractalType) {
  const wikipediaLink = document.getElementById('wikipedia-link');
  const currentFractalType = getCurrentFractalType();
  if (wikipediaLink && currentFractalType) {
    const url = getWikipediaUrl(currentFractalType);
    wikipediaLink.href = url;
  }
}

/**
 * Get initial render position for a fractal type
 * Returns default position (zoom: 1, offset: {x: 0, y: 0}) if not found
 * @param {string} fractalType - Fractal type
 * @returns {Object} Initial position with zoom and offset
 */
export function getInitialRenderPosition(fractalType) {
  switch (fractalType) {
    case 'burning-ship':
      return { zoom: 1.2, offset: { x: -0.2924, y: -0.2544 } };
    case 'tricorn':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'celtic-mandelbrot':
      return { zoom: 1.2, offset: { x: -0.4868, y: 0.1464 } };
    case 'mutant-mandelbrot':
      return { zoom: 1, offset: { x: -0.536, y: 0.006 } };
    case 'phoenix-mandelbrot':
      return { zoom: 1, offset: { x: -0.514, y: 0.01 } };
    case 'buffalo':
      return { zoom: 1.2, offset: { x: -0.1592, y: 0.5616 } };
    case 'popcorn':
      return { zoom: 1, offset: { x: 0.173, y: 0.114 } };
    case 'rose':
      return { zoom: 1, offset: { x: 0.132, y: 0.139 } };
    case 'julia-snakes':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'binary-dragon':
      return { zoom: 1, offset: { x: 2.812, y: 0.009 } };
    case 'dragon-lsystem':
      return { zoom: 0.666, offset: { x: 0.2164, y: 0.3085 } };
    case 'folded-paper-dragon':
      return { zoom: 2, offset: { x: -0.3009, y: -0.2052 } };
    case 'heighway-dragon':
      return { zoom: 2, offset: { x: 0.2257, y: -0.1287 } };
    case 'terdragon':
      return { zoom: 1, offset: { x: 0.167, y: 0.114 } };
    case 'twindragon':
      return { zoom: 1, offset: { x: 0.299, y: 0.148 } };
    case 'gosper-curve':
      return { zoom: 2, offset: { x: 0.0723, y: 0.0598 } };
    case 'hilbert-curve':
      return { zoom: 3.015, offset: { x: -0.006, y: 0.0693 } };
    case 'levy-c-curve':
      return { zoom: 1.24, offset: { x: 0.0087, y: 0.1054 } };
    case 'moore-curve':
      return { zoom: 2.662, offset: { x: 0.0016, y: 0.1022 } };
    case 'peano-curve':
      return { zoom: 2.969, offset: { x: -0.003, y: 0.0713 } };
    case 'sierpinski-curve':
      return { zoom: 3.49, offset: { x: -0.0107, y: 0.0065 } };
    case 'newton':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'nova':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'halley':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'plant':
      return { zoom: 0.59, offset: { x: 0.003, y: 1.094 } };
    case 'barnsley-fern':
      return { zoom: 1.403, offset: { x: 1.673, y: 1.9506 } };
    case 'multibrot':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'multibrot-cubic':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'multibrot-quartic':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'multibrot-quintic':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'multibrot-sextic':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'multibrot-septic':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'multibrot-octic':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'multibrot-nonic':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'multibrot-decic':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'multibrot-julia':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'pickover-stalks':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'biomorphs':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'burning-ship-julia':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'tricorn-julia':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'phoenix-julia':
      return { zoom: 0.605, offset: { x: 0.0284, y: 0.0611 } };
    case 'lambda-julia':
      return { zoom: 1, offset: { x: 0.734, y: 0.24 } };
    case 'hybrid-julia':
      return { zoom: 1, offset: { x: 0.194, y: 0.242 } };
    case 'magnet':
      return { zoom: 2, offset: { x: 0.338, y: -0.048 } };
    case 'amman-tiling':
      return { zoom: 3.2, offset: { x: 0.9382, y: 0.7956 } };
    case 'chair-tiling':
      return { zoom: 4, offset: { x: 0.77, y: 0.502 } };
    case 'snowflake-tiling':
      return { zoom: 4, offset: { x: 0.7616, y: 0.516 } };
    case 'domino-substitution':
      return { zoom: 8.8, offset: { x: 0.3353, y: 0.2999 } };
    case 'pinwheel-tiling':
      return { zoom: 1, offset: { x: 2.46, y: 1.631 } };
    case 'carpenter-square':
      return { zoom: 1, offset: { x: 2.9559, y: 2.7137 } };
    case 'diffusion-limited-aggregation':
      return { zoom: 0.197, offset: { x: 1.2026, y: 0.9662 } };
    case 'sierpinski':
      return { zoom: 1.772, offset: { x: 0.0089, y: 0.039 } };
    case 'sierpinski-arrowhead':
      return { zoom: 2, offset: { x: -0.002, y: -0.0211 } };
    case 'sierpinski-carpet':
      return { zoom: 1.456, offset: { x: 0.1169, y: 0.1266 } };
    case 'sierpinski-gasket':
      return { zoom: 1, offset: { x: 0.019, y: 0.144 } };
    case 'sierpinski-hexagon':
      return { zoom: 1.871, offset: { x: 0.0056, y: 0.0898 } };
    case 'sierpinski-lsystem':
      return { zoom: 1.35, offset: { x: 0, y: 0 } };
    case 'sierpinski-pentagon':
      return { zoom: 1.938, offset: { x: 0, y: 0 } };
    case 'quadrilateral-subdivision':
      return { zoom: 3.186, offset: { x: 0.9638, y: 0.6144 } };
    case 'recursive-polygon-splitting':
      return { zoom: 2, offset: { x: 1.4952, y: 1.059 } };
    case 'triangular-subdivision':
      return { zoom: 1.949, offset: { x: 1.3925, y: 1.0736 } };
    case 'fractal-islands':
      return { zoom: 1, offset: { x: 2.63, y: 2.178 } };
    case 'koch':
      return { zoom: 3.095, offset: { x: -0.0082, y: 0.0351 } };
    case 'quadratic-koch':
      return { zoom: 2.571, offset: { x: -0.0117, y: 0.088 } };
    case 'cantor':
      return { zoom: 1, offset: { x: -0.015, y: 0.331 } };
    case 'cantor-dust-base-expansion':
      return { zoom: 1, offset: { x: 2.978, y: 2.04 } };
    case 'cantor-dust-circular':
      return { zoom: 2.597, offset: { x: 1.1991, y: 0.9663 } };
    case 'fat-cantor':
      return { zoom: 1, offset: { x: -0.001, y: 0.102 } };
    case 'smith-volterra-cantor':
      return { zoom: 1, offset: { x: -0.001, y: 0.047 } };
    case 'random-cantor':
      return { zoom: 1, offset: { x: 0, y: 0.075 } };
    case 'apollonian-gasket':
      return { zoom: 2, offset: { x: 1.3446, y: 1.0435 } };
    case 'h-tree':
      return { zoom: 2, offset: { x: 0.1054, y: 0.0943 } };
    case 'h-tree-generalized':
      return { zoom: 2, offset: { x: 0.0928, y: 0.0537 } };
    case 'vicsek':
      return { zoom: 2, offset: { x: 1.4429, y: 1.1241 } };
    case 'cross':
      return { zoom: 2, offset: { x: 1.2376, y: 0.986 } };
    case 'fractal-flame':
      return { zoom: 2, offset: { x: 1.5885, y: 1.0331 } };
    case 'recursive-circle-removal':
      return { zoom: 3.294, offset: { x: 0.9156, y: 0.747 } };
    case 'box-variants':
      return { zoom: 2, offset: { x: 1.4905, y: 1.1342 } };
    case 'minkowski-sausage':
      return { zoom: 3.191, offset: { x: 0.0067, y: 0.0534 } };
    case 'penrose-substitution':
      return { zoom: 4, offset: { x: 0.7834, y: 0.5579 } };
    case 'rauzy':
      return { zoom: 4, offset: { x: 0.7877, y: 0.6103 } };
    case 'spider-set':
      return { zoom: 2, offset: { x: -0.7682, y: 0.0595 } };
    case 'cesaro':
      return { zoom: 3.032, offset: { x: 0.0808, y: 0.0587 } };
    case 'julia':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'mandelbrot':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'nebulabrot':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'weierstrass':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'takagi':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'blancmange':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    default:
      return { zoom: 1, offset: { x: 0, y: 0 } };
  }
}
