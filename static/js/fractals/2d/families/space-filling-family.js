/**
 * Space-Filling Curves Family Fractals
 * Re-exports all Space-Filling Curve fractals for code splitting optimization
 */

// Import all Space-Filling Curves family fractals
import * as gosperCurve from '../gosper-curve.js';
import * as hilbertCurve from '../hilbert-curve.js';
import * as levyCCurve from '../levy-c-curve.js';
import * as mooreCurve from '../moore-curve.js';
import * as peanoCurve from '../peano-curve.js';

// Export as a mapping object for easy lookup
export const fractals = {
  'gosper-curve': gosperCurve,
  'hilbert-curve': hilbertCurve,
  'levy-c-curve': levyCCurve,
  'moore-curve': mooreCurve,
  'peano-curve': peanoCurve,
};

