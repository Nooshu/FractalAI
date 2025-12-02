/**
 * Other Fractals Family
 * Re-exports all remaining standalone fractals for code splitting optimization
 */

// Import all Other family fractals
import * as ammanTiling from '../amman-tiling.js';
import * as apollonianGasket from '../apollonian-gasket.js';
import * as carpenterSquare from '../carpenter-square.js';
import * as chairTiling from '../chair-tiling.js';
import * as hTree from '../h-tree.js';
import * as hTreeGeneralized from '../h-tree-generalized.js';
import * as vicsek from '../vicsek.js';
import * as cross from '../cross.js';
import * as diffusionLimitedAggregation from '../diffusion-limited-aggregation.js';
import * as fractionalBrownianMotion from '../fractional-brownian-motion.js';
import * as fractalFlame from '../fractal-flame.js';
import * as levyFlights from '../levy-flights.js';
import * as recursiveCircleRemoval from '../recursive-circle-removal.js';
import * as rose from '../rose.js';
import * as boxVariants from '../box-variants.js';
import * as minkowskiSausage from '../minkowski-sausage.js';
import * as penroseSubstitution from '../penrose-substitution.js';
import * as perlinNoise from '../perlin-noise.js';
import * as percolationCluster from '../percolation-cluster.js';
import * as buffalo from '../buffalo.js';
import * as popcorn from '../popcorn.js';
import * as randomMidpointDisplacement from '../random-midpoint-displacement.js';
import * as rauzy from '../rauzy.js';
import * as simplexNoise from '../simplex-noise.js';
import * as spiderSet from '../spider-set.js';
import * as magnet from '../magnet.js';
import * as cesaro from '../cesaro.js';
import * as lyapunov from '../lyapunov.js';
import * as lorenzAttractor from '../lorenz-attractor.js';
import * as rosslerAttractor from '../rossler-attractor.js';
import * as mengerSponge from '../menger-sponge.js';

// Export as a mapping object for easy lookup
export const fractals = {
  'amman-tiling': ammanTiling,
  'apollonian-gasket': apollonianGasket,
  'carpenter-square': carpenterSquare,
  'chair-tiling': chairTiling,
  'h-tree': hTree,
  'h-tree-generalized': hTreeGeneralized,
  vicsek: vicsek,
  cross: cross,
  'diffusion-limited-aggregation': diffusionLimitedAggregation,
  'fractional-brownian-motion': fractionalBrownianMotion,
  'fractal-flame': fractalFlame,
  'levy-flights': levyFlights,
  'recursive-circle-removal': recursiveCircleRemoval,
  rose: rose,
  'box-variants': boxVariants,
  'minkowski-sausage': minkowskiSausage,
  'penrose-substitution': penroseSubstitution,
  'perlin-noise': perlinNoise,
  'percolation-cluster': percolationCluster,
  buffalo: buffalo,
  popcorn: popcorn,
  'random-midpoint-displacement': randomMidpointDisplacement,
  rauzy: rauzy,
  'simplex-noise': simplexNoise,
  'spider-set': spiderSet,
  magnet: magnet,
  cesaro: cesaro,
  lyapunov: lyapunov,
  'lorenz-attractor': lorenzAttractor,
  'rossler-attractor': rosslerAttractor,
  'menger-sponge': mengerSponge,
};
