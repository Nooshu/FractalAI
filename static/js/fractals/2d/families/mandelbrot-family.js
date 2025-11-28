/**
 * Mandelbrot Family Fractals
 * Re-exports all Mandelbrot-related fractals for code splitting optimization
 */

// Import all Mandelbrot family fractals
import * as mandelbrot from '../mandelbrot.js';
import * as celticMandelbrot from '../celtic-mandelbrot.js';
import * as multibrot from '../multibrot.js';
import * as mutantMandelbrot from '../mutant-mandelbrot.js';
import * as phoenixMandelbrot from '../phoenix-mandelbrot.js';
import * as burningShip from '../burning-ship.js';
import * as tricorn from '../tricorn.js';
import * as nebulabrot from '../nebulabrot.js';

// Export as a mapping object for easy lookup
export const fractals = {
  'mandelbrot': mandelbrot,
  'celtic-mandelbrot': celticMandelbrot,
  'multibrot': multibrot,
  'mutant-mandelbrot': mutantMandelbrot,
  'phoenix-mandelbrot': phoenixMandelbrot,
  'burning-ship': burningShip,
  'tricorn': tricorn,
  'nebulabrot': nebulabrot,
};

