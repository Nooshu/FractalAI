/**
 * Self-Similar Curves Family Fractals
 * Re-exports self-similar curve fractals for code splitting optimization
 */

// Import all self-similar curves family fractals
import * as deRhamCurve from '../de-rham-curve.js';

// Export as a mapping object for easy lookup
export const fractals = {
  'de-rham-curve': deRhamCurve,
};

