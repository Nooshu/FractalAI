/**
 * Other Escape-Time Fractals Family
 * Re-exports escape-time fractals that are not Mandelbrot/Julia variants
 */

// Import all escape-time family fractals
import * as buffalo from '../buffalo.js';
import * as popcorn from '../popcorn.js';
import * as spiderSet from '../spider-set.js';
import * as magnet from '../magnet.js';

// Export as a mapping object for easy lookup
export const fractals = {
  buffalo: buffalo,
  popcorn: popcorn,
  'spider-set': spiderSet,
  magnet: magnet,
};

