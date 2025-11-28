/**
 * Dragon Curves Family Fractals
 * Re-exports all Dragon-related fractals for code splitting optimization
 */

// Import all Dragon family fractals
import * as binaryDragon from '../binary-dragon.js';
import * as dragonLsystem from '../dragon-lsystem.js';
import * as foldedPaperDragon from '../folded-paper-dragon.js';
import * as heighwayDragon from '../heighway-dragon.js';
import * as terdragon from '../terdragon.js';
import * as twindragon from '../twindragon.js';

// Export as a mapping object for easy lookup
export const fractals = {
  'binary-dragon': binaryDragon,
  'dragon-lsystem': dragonLsystem,
  'folded-paper-dragon': foldedPaperDragon,
  'heighway-dragon': heighwayDragon,
  'terdragon': terdragon,
  'twindragon': twindragon,
};

