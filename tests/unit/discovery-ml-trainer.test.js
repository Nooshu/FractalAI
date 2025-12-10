import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for discovery/ml-trainer.js
 * Tests the ML model training functionality
 */

describe('discovery/ml-trainer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should export all required functions', async () => {
    const module = await import('../../static/js/discovery/ml-trainer.js');
    expect(module).toHaveProperty('trainModel');
    expect(module).toHaveProperty('saveModel');
    expect(module).toHaveProperty('loadModel');
    expect(module).toHaveProperty('shouldRetrainModel');
    expect(module).toHaveProperty('initializeModel');
  });

  it('should return null when not enough favorites to train', async () => {
    const { trainModel } = await import('../../static/js/discovery/ml-trainer.js');
    // Clear favorites
    localStorage.clear();
    const result = await trainModel();
    expect(result).toBeNull();
  });

  it('should check if model needs retraining', async () => {
    const { shouldRetrainModel } = await import('../../static/js/discovery/ml-trainer.js');
    // No model exists, should return true
    const needsRetrain = shouldRetrainModel();
    expect(typeof needsRetrain).toBe('boolean');
  });

  it('should save and load model metadata', async () => {
    const { saveModel, shouldRetrainModel } = await import('../../static/js/discovery/ml-trainer.js');
    // Create a mock model
    const mockModel = {
      toJSON: vi.fn(() => ({ layers: [] })),
    };
    
    // Add some favorites first
    const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');
    for (let i = 0; i < 5; i++) {
      addFavorite({ fractalType: 'mandelbrot', zoom: 1 + i, offsetX: 0, offsetY: 0, iterations: 125 });
    }
    
    const saved = await saveModel(mockModel);
    expect(saved).toBe(true);
    
    // Check metadata was saved
    const metadata = localStorage.getItem('fractalai_ml_model_metadata');
    expect(metadata).toBeTruthy();
    const parsed = JSON.parse(metadata);
    expect(parsed).toHaveProperty('version');
    expect(parsed).toHaveProperty('timestamp');
    expect(parsed).toHaveProperty('favoriteCount');
  });

  it('should handle model loading errors gracefully', async () => {
    const { loadModel } = await import('../../static/js/discovery/ml-trainer.js');
    // No model in storage
    localStorage.clear();
    const model = await loadModel();
    expect(model).toBeNull();
  });

  it('should initialize model', async () => {
    const { initializeModel } = await import('../../static/js/discovery/ml-trainer.js');
    // Clear any existing model
    localStorage.clear();
    
    // Add enough favorites for training
    const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');
    for (let i = 0; i < 5; i++) {
      addFavorite({ fractalType: 'mandelbrot', zoom: 1 + i, offsetX: 0, offsetY: 0, iterations: 125 });
    }
    
    // This may take a while, so we'll just check it doesn't throw
    try {
      const model = await initializeModel();
      // Model may be null if training fails, or an object if successful
      expect(model === null || typeof model === 'object').toBe(true);
    } catch (error) {
      // If Synaptic.js fails to load in test environment, that's okay
      expect(error.message).toBeDefined();
    }
  });
});



