/**
 * Sierpinski Family Fractals
 * Re-exports all Sierpinski-related fractals for code splitting optimization
 */

// Import all Sierpinski family fractals
import * as sierpinski from '../sierpinski.js';
import * as sierpinskiArrowhead from '../sierpinski-arrowhead.js';
import * as sierpinskiCarpet from '../sierpinski-carpet.js';
import * as sierpinskiGasket from '../sierpinski-gasket.js';
import * as sierpinskiHexagon from '../sierpinski-hexagon.js';
import * as sierpinskiLsystem from '../sierpinski-lsystem.js';
import * as sierpinskiPentagon from '../sierpinski-pentagon.js';
import * as sierpinskiTetrahedron from '../sierpinski-tetrahedron.js';
import * as mengerCarpet from '../menger-carpet.js';
import * as quadrilateralSubdivision from '../quadrilateral-subdivision.js';
import * as recursivePolygonSplitting from '../recursive-polygon-splitting.js';
import * as triangularSubdivision from '../triangular-subdivision.js';

// Export as a mapping object for easy lookup
export const fractals = {
  sierpinski: sierpinski,
  'sierpinski-arrowhead': sierpinskiArrowhead,
  'sierpinski-carpet': sierpinskiCarpet,
  'sierpinski-gasket': sierpinskiGasket,
  'sierpinski-hexagon': sierpinskiHexagon,
  'sierpinski-lsystem': sierpinskiLsystem,
  'sierpinski-pentagon': sierpinskiPentagon,
  'sierpinski-tetrahedron': sierpinskiTetrahedron,
  'menger-carpet': mengerCarpet,
  'quadrilateral-subdivision': quadrilateralSubdivision,
  'recursive-polygon-splitting': recursivePolygonSplitting,
  'triangular-subdivision': triangularSubdivision,
};
