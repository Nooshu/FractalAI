/**
 * Geometric Family Fractals
 * Re-exports all Geometric/Recursive pattern fractals for code splitting optimization
 */

// Import all Geometric family fractals
import * as apollonianGasket from '../apollonian-gasket.js';
import * as carpenterSquare from '../carpenter-square.js';
import * as cross from '../cross.js';
import * as boxVariants from '../box-variants.js';
import * as minkowskiSausage from '../minkowski-sausage.js';
import * as cesaro from '../cesaro.js';
import * as recursiveCircleRemoval from '../recursive-circle-removal.js';
import * as rose from '../rose.js';
import * as mengerSponge from '../menger-sponge.js';

// Export as a mapping object for easy lookup
export const fractals = {
  'apollonian-gasket': apollonianGasket,
  'carpenter-square': carpenterSquare,
  cross: cross,
  'box-variants': boxVariants,
  'minkowski-sausage': minkowskiSausage,
  cesaro: cesaro,
  'recursive-circle-removal': recursiveCircleRemoval,
  rose: rose,
  'menger-sponge': mengerSponge,
};

