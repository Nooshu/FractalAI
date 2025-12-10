/**
 * Discovery Manager
 * Main interface for fractal discovery functionality
 */

import {
  discoverInterestingFractals,
  hybridScore,
} from './discovery-algorithm.js';
import { initializeModel, shouldRetrainModel, trainModel, saveModel } from './ml-trainer.js';
import { getFavorites } from './favorites-manager.js';
import { devLog } from '../core/logger.js';

let mlModel = null;
let isModelInitializing = false;

/**
 * Initialize the discovery system
 * @param {Function} isValidInterestingView - Validation function
 * @returns {Promise<void>}
 */
export async function initializeDiscovery(isValidInterestingView) {
  if (isModelInitializing) {
    return;
  }

  isModelInitializing = true;
  try {
    mlModel = await initializeModel();
    
    // Retrain in background if needed
    if (shouldRetrainModel() && getFavorites().length >= 5) {
      // Retrain asynchronously without blocking
      setTimeout(async () => {
        devLog.log('Retraining ML model in background...');
        const result = await trainModel(mlModel);
        if (result && result.model) {
          mlModel = result.model;
          await saveModel(mlModel);
        }
      }, 1000);
    }
  } catch (error) {
    console.error('Failed to initialize discovery:', error);
  } finally {
    isModelInitializing = false;
  }
}

/**
 * Get a "surprise me" fractal configuration
 * @param {string} fractalType - Type of fractal
 * @param {Function} isValidInterestingView - Validation function
 * @param {Object} options - Discovery options
 * @returns {Promise<Object|null>} Discovered fractal configuration
 */
export async function getSurpriseMeFractal(
  fractalType,
  isValidInterestingView,
  options = {}
) {
  const discoveries = await discoverInterestingFractals(
    fractalType,
    isValidInterestingView,
    mlModel,
    {
      candidateCount: options.candidateCount || 200,
      topK: 1,
      minScore: options.minScore || 0.4,
      includeColorScheme: true, // Include color scheme variation
      ...options,
    }
  );

  if (discoveries.length > 0) {
    return discoveries[0];
  }

  return null;
}

/**
 * Get multiple discovered fractals
 * @param {string} fractalType - Type of fractal
 * @param {Function} isValidInterestingView - Validation function
 * @param {Object} options - Discovery options
 * @returns {Promise<Array<Object>>} Array of discovered configurations
 */
export async function getDiscoveredFractals(
  fractalType,
  isValidInterestingView,
  options = {}
) {
  return await discoverInterestingFractals(
    fractalType,
    isValidInterestingView,
    mlModel,
    {
      candidateCount: options.candidateCount || 100,
      topK: options.topK || 10,
      minScore: options.minScore || 0.5,
      ...options,
    }
  );
}

/**
 * Trigger model retraining (call when favorites change)
 * @returns {Promise<void>}
 */
export async function triggerRetraining() {
  if (getFavorites().length < 5) {
    return; // Not enough data
  }

  try {
    devLog.log('Retraining ML model...');
    const result = await trainModel(mlModel);
    if (result && result.model) {
      mlModel = result.model;
      await saveModel(mlModel);
    }
  } catch (error) {
    console.error('Retraining error:', error);
  }
}

/**
 * Get the current ML model (for testing/debugging)
 * @returns {Object|null} Current model
 */
export function getModel() {
  return mlModel;
}

