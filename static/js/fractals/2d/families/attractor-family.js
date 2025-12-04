/**
 * Attractor Family Fractals
 * Re-exports all Attractor-related fractals for code splitting optimization
 */

// Import all Attractor family fractals
import * as lorenzAttractor from '../lorenz-attractor.js';
import * as rosslerAttractor from '../rossler-attractor.js';
import * as lyapunov from '../lyapunov.js';
import * as chuaAttractor from '../chua-attractor.js';
import * as ifsSpiral from '../ifs-spiral.js';
import * as ifsMaple from '../ifs-maple.js';
import * as ifsTree from '../ifs-tree.js';

// Export as a mapping object for easy lookup
export const fractals = {
  'lorenz-attractor': lorenzAttractor,
  'rossler-attractor': rosslerAttractor,
  lyapunov: lyapunov,
  'chua-attractor': chuaAttractor,
  'ifs-spiral': ifsSpiral,
  'ifs-maple': ifsMaple,
  'ifs-tree': ifsTree,
};

