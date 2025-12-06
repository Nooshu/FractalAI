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
import * as buddhabrot from '../buddhabrot.js';
import * as multibrotCubic from '../multibrot-cubic.js';
import * as multibrotQuartic from '../multibrot-quartic.js';
import * as multibrotQuintic from '../multibrot-quintic.js';
import * as multibrotSextic from '../multibrot-sextic.js';
import * as multibrotSeptic from '../multibrot-septic.js';
import * as multibrotOctic from '../multibrot-octic.js';
import * as multibrotNonic from '../multibrot-nonic.js';
import * as multibrotDecic from '../multibrot-decic.js';

// Export as a mapping object for easy lookup
export const fractals = {
  mandelbrot: mandelbrot,
  'celtic-mandelbrot': celticMandelbrot,
  multibrot: multibrot,
  'mutant-mandelbrot': mutantMandelbrot,
  'phoenix-mandelbrot': phoenixMandelbrot,
  'burning-ship': burningShip,
  tricorn: tricorn,
  nebulabrot: nebulabrot,
  buddhabrot: buddhabrot,
  'multibrot-cubic': multibrotCubic,
  'multibrot-quartic': multibrotQuartic,
  'multibrot-quintic': multibrotQuintic,
  'multibrot-sextic': multibrotSextic,
  'multibrot-septic': multibrotSeptic,
  'multibrot-octic': multibrotOctic,
  'multibrot-nonic': multibrotNonic,
  'multibrot-decic': multibrotDecic,
};
