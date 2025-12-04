/**
 * Tree Family Fractals
 * Re-exports all Tree-related fractals for code splitting optimization
 */

// Import all Tree family fractals
import * as pythagorasTree from '../pythagoras-tree.js';
import * as pythagorasTreeWide from '../pythagoras-tree-wide.js';
import * as pythagorasTreeNarrow from '../pythagoras-tree-narrow.js';
import * as binaryFractalTree from '../binary-fractal-tree.js';
import * as ternaryFractalTree from '../ternary-fractal-tree.js';
import * as quaternaryFractalTree from '../quaternary-fractal-tree.js';
import * as oakTree from '../lsystem-tree-oak.js';
import * as pineTree from '../lsystem-tree-pine.js';
import * as fractalCanopy from '../fractal-canopy.js';

// Export as a mapping object for easy lookup
export const fractals = {
  'pythagoras-tree': pythagorasTree,
  'pythagoras-tree-wide': pythagorasTreeWide,
  'pythagoras-tree-narrow': pythagorasTreeNarrow,
  'binary-fractal-tree': binaryFractalTree,
  'ternary-fractal-tree': ternaryFractalTree,
  'quaternary-fractal-tree': quaternaryFractalTree,
  'lsystem-tree-oak': oakTree,
  'lsystem-tree-pine': pineTree,
  'fractal-canopy': fractalCanopy,
};

