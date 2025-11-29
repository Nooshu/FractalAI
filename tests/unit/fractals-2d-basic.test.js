import { describe, it, expect } from 'vitest';

/**
 * Basic per-fractal tests for all 2D fractal modules.
 * For each module we:
 *  - dynamically import it
 *  - assert it exports a render(regl, params, canvas) function
 *  - call render with a mocked regl/canvas/params
 *  - assert the returned draw command (if any) is callable without throwing
 */

const FRACTAL_MODULES_2D = [
  'amman-tiling',
  'apollonian-gasket',
  'barnsley-fern',
  'binary-dragon',
  'box-variants',
  'buffalo',
  'burning-ship-julia',
  'burning-ship',
  'cantor-dust-base-expansion',
  'cantor-dust-circular',
  'cantor',
  'carpenter-square',
  'celtic-mandelbrot',
  'cesaro',
  'chair-tiling',
  'cross',
  'diffusion-limited-aggregation',
  'domino-substitution',
  'dragon-lsystem',
  'fat-cantor',
  'folded-paper-dragon',
  'fractal-flame',
  'fractal-islands',
  'fractional-brownian-motion',
  'gosper-curve',
  'h-tree-generalized',
  'h-tree',
  'halley',
  'heighway-dragon',
  'hilbert-curve',
  'hybrid-julia',
  'julia-snakes',
  'julia',
  'koch',
  'lambda-julia',
  'levy-c-curve',
  'levy-flights',
  'magnet',
  'mandelbrot',
  'minkowski-sausage',
  'moore-curve',
  'multibrot-julia',
  'multibrot',
  'mutant-mandelbrot',
  'nebulabrot',
  'newton',
  'nova',
  'peano-curve',
  'penrose-substitution',
  'percolation-cluster',
  'perlin-noise',
  'phoenix-julia',
  'phoenix-mandelbrot',
  'pinwheel-tiling',
  'plant',
  'popcorn',
  'quadratic-koch',
  'quadrilateral-subdivision',
  'random-cantor',
  'random-midpoint-displacement',
  'rauzy',
  'recursive-circle-removal',
  'recursive-polygon-splitting',
  'rose',
  'sierpinski-arrowhead',
  'sierpinski-carpet',
  'sierpinski-gasket',
  'sierpinski-hexagon',
  'sierpinski-lsystem',
  'sierpinski-pentagon',
  'sierpinski',
  'simplex-noise',
  'smith-volterra-cantor',
  'snowflake-tiling',
  'spider-set',
  'terdragon',
  'triangular-subdivision',
  'tricorn-julia',
  'tricorn',
  'twindragon',
  'vicsek',
];

function createMockRegl() {
  const fn = (_config) => {
    // Return a no-op draw command
    return () => {};
  };
  // Needed by generatePaletteTexture and line-based fractals that use buffers
  fn.texture = () => ({ destroy: () => {} });
  fn.buffer = () => ({ destroy: () => {} });
  return fn;
}

const basePath = '../../static/js/fractals/2d';

for (const name of FRACTAL_MODULES_2D) {
  describe(`2D fractal module: ${name}`, () => {
    it('exports a render function that returns a callable draw command', async () => {
      const module = await import(`${basePath}/${name}.js`);

      expect(module).toBeTypeOf('object');
      expect(module.render).toBeTypeOf('function');

      const regl = createMockRegl();
      const canvas = { width: 800, height: 600 };
      const params = {
        iterations: 50,
        zoom: 1,
        offset: { x: 0, y: 0 },
        xScale: 1,
        yScale: 1,
        juliaC: { x: 0, y: 0 },
        colorScheme: 'classic',
      };

      let drawCommand;
      expect(() => {
        drawCommand = module.render(regl, params, canvas);
      }).not.toThrow();

      if (drawCommand) {
        expect(drawCommand).toBeTypeOf('function');
        expect(() => drawCommand()).not.toThrow();
      }
    });
  });
}
