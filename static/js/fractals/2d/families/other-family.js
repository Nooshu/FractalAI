/**
 * Other Fractals Family
 * Re-exports all remaining standalone fractals for code splitting optimization
 */

// Import all Other family fractals
import * as hTree from '../h-tree.js';
import * as hTreeGeneralized from '../h-tree-generalized.js';
import * as vicsek from '../vicsek.js';
import * as fractalFlame from '../fractal-flame.js';

// Export as a mapping object for easy lookup
export const fractals = {
  'h-tree': hTree,
  'h-tree-generalized': hTreeGeneralized,
  vicsek: vicsek,
  'fractal-flame': fractalFlame,
};
