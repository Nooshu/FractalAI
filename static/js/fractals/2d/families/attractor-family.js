/**
 * Attractor Family Fractals
 * Re-exports all Attractor-related fractals for code splitting optimization
 */

// Import all Attractor family fractals
import * as lorenzAttractor from '../lorenz-attractor.js';
import * as rosslerAttractor from '../rossler-attractor.js';
import * as lyapunov from '../lyapunov.js';

// Export as a mapping object for easy lookup
export const fractals = {
  'lorenz-attractor': lorenzAttractor,
  'rossler-attractor': rosslerAttractor,
  lyapunov: lyapunov,
};

