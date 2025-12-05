/**
 * Tilings Family Fractals
 * Re-exports all Tiling-related fractals for code splitting optimization
 */

// Import all Tiling family fractals
import * as dominoSubstitution from '../domino-substitution.js';
import * as pinwheelTiling from '../pinwheel-tiling.js';
import * as snowflakeTiling from '../snowflake-tiling.js';
import * as ammanTiling from '../amman-tiling.js';
import * as penroseSubstitution from '../penrose-substitution.js';
import * as rauzy from '../rauzy.js';
import * as chairTiling from '../chair-tiling.js';
import * as rhombicTiling from '../rhombic-tiling.js';
import * as aperiodicTilings from '../aperiodic-tilings.js';
import * as substitutionTilings from '../substitution-tilings.js';

// Export as a mapping object for easy lookup
export const fractals = {
  'domino-substitution': dominoSubstitution,
  'pinwheel-tiling': pinwheelTiling,
  'snowflake-tiling': snowflakeTiling,
  'amman-tiling': ammanTiling,
  'penrose-substitution': penroseSubstitution,
  rauzy: rauzy,
  'chair-tiling': chairTiling,
  'rhombic-tiling': rhombicTiling,
  'aperiodic-tilings': aperiodicTilings,
  'substitution-tilings': substitutionTilings,
};
