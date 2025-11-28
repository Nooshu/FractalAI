/**
 * Koch Family Fractals
 * Re-exports all Koch-related fractals for code splitting optimization
 */

// Import all Koch family fractals
import * as fractalIslands from '../fractal-islands.js';
import * as koch from '../koch.js';
import * as quadraticKoch from '../quadratic-koch.js';

// Export as a mapping object for easy lookup
export const fractals = {
  'fractal-islands': fractalIslands,
  'koch': koch,
  'quadratic-koch': quadraticKoch,
};

