/**
 * Physics Family Fractals
 * Re-exports all Physics/Simulation-based fractals for code splitting optimization
 */

// Import all Physics family fractals
import * as diffusionLimitedAggregation from '../diffusion-limited-aggregation.js';
import * as percolationCluster from '../percolation-cluster.js';
import * as levyFlights from '../levy-flights.js';

// Export as a mapping object for easy lookup
export const fractals = {
  'diffusion-limited-aggregation': diffusionLimitedAggregation,
  'percolation-cluster': percolationCluster,
  'levy-flights': levyFlights,
};

