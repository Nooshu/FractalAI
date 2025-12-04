/**
 * Julia Family Fractals
 * Re-exports all Julia-related fractals for code splitting optimization
 */

// Import all Julia family fractals
import * as julia from '../julia.js';
import * as juliaSnakes from '../julia-snakes.js';
import * as multibrotJulia from '../multibrot-julia.js';
import * as burningShipJulia from '../burning-ship-julia.js';
import * as tricornJulia from '../tricorn-julia.js';
import * as phoenixJulia from '../phoenix-julia.js';
import * as lambdaJulia from '../lambda-julia.js';
import * as hybridJulia from '../hybrid-julia.js';
import * as pickoverStalks from '../pickover-stalks.js';
import * as biomorphs from '../biomorphs.js';

// Export as a mapping object for easy lookup
export const fractals = {
  julia: julia,
  'julia-snakes': juliaSnakes,
  'multibrot-julia': multibrotJulia,
  'burning-ship-julia': burningShipJulia,
  'tricorn-julia': tricornJulia,
  'phoenix-julia': phoenixJulia,
  'lambda-julia': lambdaJulia,
  'hybrid-julia': hybridJulia,
  'pickover-stalks': pickoverStalks,
  biomorphs: biomorphs,
};
