/**
 * Tilings Family Fractals
 * Re-exports all Tiling-related fractals for code splitting optimization
 */

// Import all Tiling family fractals
import * as dominoSubstitution from '../domino-substitution.js';
import * as pinwheelTiling from '../pinwheel-tiling.js';
import * as snowflakeTiling from '../snowflake-tiling.js';

// Export as a mapping object for easy lookup
export const fractals = {
  'domino-substitution': dominoSubstitution,
  'pinwheel-tiling': pinwheelTiling,
  'snowflake-tiling': snowflakeTiling,
};

