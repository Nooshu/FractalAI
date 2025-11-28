/**
 * Root-Finding Fractals Family
 * Re-exports all Root-Finding fractals for code splitting optimization
 */

// Import all Root-Finding family fractals
import * as newton from '../newton.js';
import * as halley from '../halley.js';
import * as nova from '../nova.js';

// Export as a mapping object for easy lookup
export const fractals = {
  'newton': newton,
  'halley': halley,
  'nova': nova,
};

