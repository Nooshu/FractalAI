/**
 * Plant Family Fractals
 * Re-exports all Plant-related fractals for code splitting optimization
 */

// Import all Plant family fractals
import * as plant from '../plant.js';
import * as barnsleyFern from '../barnsley-fern.js';

// Export as a mapping object for easy lookup
export const fractals = {
  plant: plant,
  'barnsley-fern': barnsleyFern,
};
