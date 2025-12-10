/**
 * ML Trainer for Fractal Discovery
 * Trains a Synaptic.js neural network on user favorites to learn preferences
 */

import { getFavorites } from './favorites-manager.js';
import { extractFeatures } from './discovery-algorithm.js';
import { devLog } from '../core/logger.js';

// Lazy load Synaptic.js to avoid blocking initial load
let synaptic = null;
async function getSynaptic() {
  if (!synaptic) {
    try {
      // Dynamic import - Vite will bundle it but load it on demand
      const synapticModule = await import('synaptic');
      synaptic = synapticModule;
      return synaptic;
    } catch (error) {
      console.error('Failed to load Synaptic.js:', error);
      return null;
    }
  }
  return synaptic;
}

const MODEL_STORAGE_KEY = 'fractalai_ml_model';
const MODEL_VERSION = 1;

/**
 * Create a new neural network model
 * @returns {Object} Synaptic.js neural network
 */
async function createModel() {
  const Synaptic = await getSynaptic();
  if (!Synaptic) {
    throw new Error('Synaptic.js not available');
  }

  // Create a Perceptron: 11 inputs -> 32 hidden -> 16 hidden -> 1 output
  const inputLayer = new Synaptic.Layer(11);
  const hiddenLayer1 = new Synaptic.Layer(32);
  const hiddenLayer2 = new Synaptic.Layer(16);
  const outputLayer = new Synaptic.Layer(1);

  // Connect layers
  inputLayer.project(hiddenLayer1);
  hiddenLayer1.project(hiddenLayer2);
  hiddenLayer2.project(outputLayer);

  // Create network
  const network = new Synaptic.Network({
    input: inputLayer,
    hidden: [hiddenLayer1, hiddenLayer2],
    output: outputLayer,
  });

  return network;
}

/**
 * Prepare training data from favorites
 * @returns {Promise<Array>} Training data array
 */
async function prepareTrainingData() {
  const Synaptic = await getSynaptic();
  if (!Synaptic) {
    return null;
  }

  const favorites = getFavorites();

  if (favorites.length < 5) {
    // Not enough data to train
    return null;
  }

  const trainingData = [];

  // Positive examples: user favorites (output = 1)
  favorites.forEach((fav) => {
    const features = extractFeatures(fav);
    trainingData.push({
      input: features,
      output: [1.0],
    });
  });

  // Generate negative examples: random configurations (output = 0)
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
    trainingData.push({
      input: features,
      output: [0.0],
    });
  }

  return trainingData;
}

/**
 * Train the model on user favorites
 * @param {Object} model - Synaptic.js neural network to train
 * @param {Object} options - Training options
 * @param {number} options.iterations - Number of training iterations (default: 200)
 * @returns {Promise<Object>} Training result with model
 */
export async function trainModel(model = null, options = {}) {
  const trainingData = await prepareTrainingData();

  if (!trainingData) {
    devLog.log('Not enough favorites to train model');
    return null;
  }

  if (!model) {
    model = await createModel();
  }

  try {
    const Synaptic = await getSynaptic();
    if (!Synaptic) {
      return null;
    }

    // Create trainer
    const trainer = new Synaptic.Trainer(model);

    // Shuffle training data for better learning
    const shuffled = trainingData.sort(() => Math.random() - 0.5);

    // Use fewer iterations in test environment for faster tests
    const iterations = options.iterations ?? (import.meta.env?.TEST ? 10 : 200);

    // Train the network
    const trainingResult = trainer.train(shuffled, {
      rate: 0.001, // Learning rate
      iterations, // Number of training iterations
      error: 0.005, // Error threshold to stop training
      shuffle: true,
      log: 0, // Set to 1 for training progress
      cost: Synaptic.Trainer.cost.CROSS_ENTROPY, // Use cross-entropy for binary classification
    });

    return { model, history: trainingResult };
  } catch (error) {
    console.error('Training error:', error);
    return null;
  }
}

/**
 * Save model to localStorage (Synaptic models can be serialized as JSON)
 * @param {Object} model - Synaptic.js neural network
 * @returns {Promise<boolean>} True if saved successfully
 */
export async function saveModel(model) {
  try {
    // Synaptic models can be serialized to JSON
    const modelData = model.toJSON();
    localStorage.setItem(
      MODEL_STORAGE_KEY,
      JSON.stringify({
        ...modelData,
        version: MODEL_VERSION,
        timestamp: Date.now(),
        favoriteCount: getFavorites().length,
      })
    );

    // Also save metadata separately for compatibility
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
 * Load model from localStorage
 * @returns {Promise<Object|null>} Loaded model or null
 */
export async function loadModel() {
  const Synaptic = await getSynaptic();
  if (!Synaptic) {
    return null;
  }
  try {
    const stored = localStorage.getItem(MODEL_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const modelData = JSON.parse(stored);

    // Verify version
    if (modelData.version !== MODEL_VERSION) {
      devLog.log('Model version mismatch, will retrain');
      return null;
    }

    // Create network from JSON (remove version/metadata fields first)
    const { version, timestamp, favoriteCount, ...networkData } = modelData;
    const network = Synaptic.Network.fromJSON(networkData);

    return network;
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
  } catch (_error) {
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
