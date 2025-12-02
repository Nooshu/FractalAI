/**
 * Noise Family Fractals
 * Re-exports all Noise-based fractals for code splitting optimization
 */

// Import all Noise family fractals
import * as perlinNoise from '../perlin-noise.js';
import * as simplexNoise from '../simplex-noise.js';
import * as fractionalBrownianMotion from '../fractional-brownian-motion.js';
import * as randomMidpointDisplacement from '../random-midpoint-displacement.js';

// Export as a mapping object for easy lookup
export const fractals = {
  'perlin-noise': perlinNoise,
  'simplex-noise': simplexNoise,
  'fractional-brownian-motion': fractionalBrownianMotion,
  'random-midpoint-displacement': randomMidpointDisplacement,
};

