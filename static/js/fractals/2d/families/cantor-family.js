/**
 * Cantor Family Fractals
 * Re-exports all Cantor-related fractals for code splitting optimization
 */

// Import all Cantor family fractals
import * as cantor from '../cantor.js';
import * as cantorDustBaseExpansion from '../cantor-dust-base-expansion.js';
import * as cantorDustCircular from '../cantor-dust-circular.js';
import * as fatCantor from '../fat-cantor.js';
import * as smithVolterraCantor from '../smith-volterra-cantor.js';
import * as randomCantor from '../random-cantor.js';

// Export as a mapping object for easy lookup
export const fractals = {
  cantor: cantor,
  'cantor-dust-base-expansion': cantorDustBaseExpansion,
  'cantor-dust-circular': cantorDustCircular,
  'fat-cantor': fatCantor,
  'smith-volterra-cantor': smithVolterraCantor,
  'random-cantor': randomCantor,
};
