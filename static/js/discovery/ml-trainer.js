/**
 * ML Trainer for Fractal Discovery
 * Trains a TensorFlow.js model on user favorites to learn preferences
 */

import { getFavorites } from './favorites-manager.js';
import { extractFeatures } from './discovery-algorithm.js';
import { devLog } from '../core/logger.js';

// Lazy load TensorFlow.js to avoid blocking initial load
let tf = null;
async function getTensorFlow() {
  if (!tf) {
    try {
      // Dynamic import - Vite will bundle it but load it on demand
      const tfModule = await import('@tensorflow/tfjs');
      // TensorFlow.js exports everything as named exports, not default
      tf = tfModule;
      return tf;
    } catch (error) {
      console.error('Failed to load TensorFlow.js:', error);
      return null;
    }
  }
  return tf;
}

const MODEL_STORAGE_KEY = 'fractalai_ml_model';
const MODEL_VERSION = 1;

/**
 * Create a new neural network model
 * @returns {Object} TensorFlow.js model
 */
async function createModel() {
  const tf = await getTensorFlow();
  if (!tf) {
    throw new Error('TensorFlow.js not available');
  }
  const model = tf.sequential({
    layers: [
      tf.layers.dense({
        inputShape: [11], // 11 features
        units: 32,
        activation: 'relu',
        name: 'hidden1',
      }),
      tf.layers.dropout({ rate: 0.2 }),
      tf.layers.dense({
        units: 16,
        activation: 'relu',
        name: 'hidden2',
      }),
      tf.layers.dropout({ rate: 0.2 }),
      tf.layers.dense({
        units: 1,
        activation: 'sigmoid',
        name: 'output',
      }),
    ],
  });

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy'],
  });

  return model;
}

/**
 * Prepare training data from favorites
 * @returns {Promise<Object>} Training data {xs, ys}
 */
async function prepareTrainingData() {
  const tf = await getTensorFlow();
  if (!tf) {
    return null;
  }
  const favorites = getFavorites();

  if (favorites.length < 5) {
    // Not enough data to train
    return null;
  }

  const xs = [];
  const ys = [];

  // Positive examples: user favorites (label = 1)
  favorites.forEach((fav) => {
    const features = extractFeatures(fav);
    xs.push(features);
    ys.push(1.0);
  });

  // Generate negative examples: random configurations (label = 0)
  // Use 2x the number of favorites for negative examples
  const negativeCount = favorites.length * 2;
  for (let i = 0; i < negativeCount; i++) {
    const randomConfig = {
      fractalType: favorites[Math.floor(Math.random() * favorites.length)]
        .fractalType,
      zoom: 0.1 + Math.random() * 100,
      offsetX: -2 + Math.random() * 4,
      offsetY: -2 + Math.random() * 4,
      iterations: 10 + Math.floor(Math.random() * 390),
      colorScheme: 'classic',
      xScale: 0.1 + Math.random() * 2.9,
      yScale: 0.1 + Math.random() * 2.9,
      juliaCX: -2 + Math.random() * 4,
      juliaCY: -2 + Math.random() * 4,
    };
    const features = extractFeatures(randomConfig);
    xs.push(features);
    ys.push(0.0);
  }

  return {
    xs: tf.tensor2d(xs),
    ys: tf.tensor2d(ys, [ys.length, 1]),
  };
}

/**
 * Train the model on user favorites
 * @param {Object} model - TensorFlow.js model to train
 * @returns {Promise<Object>} Training history
 */
export async function trainModel(model = null) {
  const trainingData = await prepareTrainingData();

  if (!trainingData) {
    devLog.log('Not enough favorites to train model');
    return null;
  }

  if (!model) {
    model = await createModel();
  }

  try {
    const history = await model.fit(trainingData.xs, trainingData.ys, {
      epochs: 50,
      batchSize: Math.min(32, Math.floor(trainingData.ys.shape[0] / 2)),
      validationSplit: 0.2,
      shuffle: true,
      verbose: 0, // Set to 1 for training progress
    });

    // Clean up
    trainingData.xs.dispose();
    trainingData.ys.dispose();

    return { model, history };
  } catch (error) {
    console.error('Training error:', error);
    trainingData.xs.dispose();
    trainingData.ys.dispose();
    return null;
  }
}

/**
 * Save model to IndexedDB
 * @param {Object} model - TensorFlow.js model
 * @returns {Promise<boolean>} True if saved successfully
 */
export async function saveModel(model) {
  try {
    await model.save(`indexeddb://${MODEL_STORAGE_KEY}`);
    // Also save metadata
    localStorage.setItem(
      `${MODEL_STORAGE_KEY}_metadata`,
      JSON.stringify({
        version: MODEL_VERSION,
        timestamp: Date.now(),
        favoriteCount: getFavorites().length,
      })
    );
    return true;
  } catch (error) {
    console.error('Failed to save model:', error);
    return false;
  }
}

/**
 * Load model from IndexedDB
 * @returns {Promise<Object|null>} Loaded model or null
 */
export async function loadModel() {
  const tf = await getTensorFlow();
  if (!tf) {
    return null;
  }
  try {
    const model = await tf.loadLayersModel(
      `indexeddb://${MODEL_STORAGE_KEY}`
    );
    // Verify metadata
    const metadataStr = localStorage.getItem(`${MODEL_STORAGE_KEY}_metadata`);
    if (metadataStr) {
      const metadata = JSON.parse(metadataStr);
      if (metadata.version !== MODEL_VERSION) {
        // Model version mismatch, retrain
        devLog.log('Model version mismatch, will retrain');
        return null;
      }
    }
    return model;
  } catch (error) {
    devLog.log('No saved model found or error loading:', error);
    return null;
  }
}

/**
 * Check if model needs retraining
 * @returns {boolean} True if model should be retrained
 */
export function shouldRetrainModel() {
  const metadataStr = localStorage.getItem(`${MODEL_STORAGE_KEY}_metadata`);
  if (!metadataStr) {
    return true; // No model exists
  }

  try {
    const metadata = JSON.parse(metadataStr);
    const currentFavoriteCount = getFavorites().length;

    // Retrain if:
    // 1. Favorite count increased significantly (20% more)
    // 2. Model is older than 7 days
    const favoriteIncrease =
      currentFavoriteCount > metadata.favoriteCount * 1.2;
    const isOld = Date.now() - metadata.timestamp > 7 * 24 * 60 * 60 * 1000;

    return favoriteIncrease || isOld;
  } catch (error) {
    return true;
  }
}

/**
 * Initialize or load the ML model
 * @returns {Promise<Object|null>} Model or null
 */
export async function initializeModel() {
  // Check if we should retrain
  const needsRetrain = shouldRetrainModel();
  let model = null;

  if (!needsRetrain) {
    // Try to load existing model
    model = await loadModel();
  }

  if (!model || needsRetrain) {
    // Train new model
    devLog.log('Training new ML model...');
    const result = await trainModel(model);
    if (result && result.model) {
      await saveModel(result.model);
      model = result.model;
    }
  }

  return model;
}

