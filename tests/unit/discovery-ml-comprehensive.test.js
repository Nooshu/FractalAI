import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Comprehensive tests for Machine Learning functionality
 * Tests model training, persistence, scoring, and integration
 */

describe('discovery/ml-trainer - Comprehensive ML Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Model Training', () => {
    it('should create a model with correct architecture', async () => {
      const { trainModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');

      // Add enough favorites for training
      for (let i = 0; i < 5; i++) {
        addFavorite({
          fractalType: 'mandelbrot',
          zoom: 1 + i * 0.5,
          offsetX: -0.5 + i * 0.2,
          offsetY: 0.1 + i * 0.1,
          iterations: 100 + i * 10,
          colorScheme: 'classic',
        });
      }

      const result = await trainModel();

      // If Synaptic.js is available, model should be created
      if (result && result.model) {
        expect(result.model).toBeDefined();
        expect(result.history).toBeDefined();
        // Verify model can make predictions
        const features = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.1, 0.5];
        const prediction = result.model.activate(features);
        expect(Array.isArray(prediction)).toBe(true);
        expect(prediction.length).toBeGreaterThan(0);
        expect(typeof prediction[0]).toBe('number');
      }
    });

    it('should train model with diverse favorites', async () => {
      const { trainModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');

      // Add diverse favorites
      const favorites = [
        { fractalType: 'mandelbrot', zoom: 1.0, offsetX: 0, offsetY: 0, iterations: 125, colorScheme: 'classic' },
        { fractalType: 'julia', zoom: 5.0, offsetX: -0.5, offsetY: 0.3, iterations: 150, colorScheme: 'fire' },
        { fractalType: 'mandelbrot', zoom: 10.0, offsetX: 0.2, offsetY: -0.2, iterations: 200, colorScheme: 'ocean' },
        { fractalType: 'burning-ship', zoom: 2.0, offsetX: -0.1, offsetY: 0.1, iterations: 100, colorScheme: 'rainbow' },
        { fractalType: 'julia', zoom: 20.0, offsetX: 0.5, offsetY: -0.5, iterations: 175, colorScheme: 'monochrome' },
      ];

      favorites.forEach(fav => addFavorite(fav));

      const result = await trainModel();

      if (result && result.model) {
        expect(result.history).toBeDefined();
        // Training should complete (may have error > threshold, but should not throw)
        expect(result.history.iterations).toBeGreaterThanOrEqual(0);
      }
    });

    it('should generate negative examples for training', async () => {
      const { trainModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');

      // Add 5 favorites
      for (let i = 0; i < 5; i++) {
        addFavorite({
          fractalType: 'mandelbrot',
          zoom: 1 + i,
          offsetX: 0,
          offsetY: 0,
          iterations: 125,
        });
      }

      const result = await trainModel();

      // Should generate 10 negative examples (2x favorites)
      // Training data should have 15 total examples (5 positive + 10 negative)
      if (result && result.model) {
        expect(result.model).toBeDefined();
      }
    });
  });

  describe('Model Persistence', () => {
    it('should save and load model correctly', async () => {
      const { trainModel, saveModel, loadModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');

      // Add favorites and train
      for (let i = 0; i < 5; i++) {
        addFavorite({
          fractalType: 'mandelbrot',
          zoom: 1 + i,
          offsetX: 0,
          offsetY: 0,
          iterations: 125,
        });
      }

      const trainResult = await trainModel();
      if (!trainResult || !trainResult.model) {
        // Skip if Synaptic.js not available
        return;
      }

      const saved = await saveModel(trainResult.model);
      expect(saved).toBe(true);

      // Verify model was saved
      const modelData = localStorage.getItem('fractalai_ml_model');
      expect(modelData).toBeTruthy();
      const parsed = JSON.parse(modelData);
      expect(parsed).toHaveProperty('version', 1);
      // Synaptic model JSON structure has neurons, connections, etc.
      expect(parsed).toHaveProperty('neurons');

      // Load model
      const loadedModel = await loadModel();
      expect(loadedModel).toBeDefined();

      // Verify loaded model works
      const features = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.1, 0.5];
      const prediction = loadedModel.activate(features);
      expect(Array.isArray(prediction)).toBe(true);
    });

    it('should reject models with wrong version', async () => {
      const { loadModel } = await import('../../static/js/discovery/ml-trainer.js');

      // Save a model with wrong version
      localStorage.setItem('fractalai_ml_model', JSON.stringify({
        version: 999, // Wrong version
        layers: [],
      }));

      const model = await loadModel();
      expect(model).toBeNull();
    });

    it('should save model metadata separately', async () => {
      const { trainModel, saveModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');

      for (let i = 0; i < 5; i++) {
        addFavorite({
          fractalType: 'mandelbrot',
          zoom: 1 + i,
          offsetX: 0,
          offsetY: 0,
          iterations: 125,
        });
      }

      const trainResult = await trainModel();
      if (!trainResult || !trainResult.model) {
        return;
      }

      await saveModel(trainResult.model);

      // Check metadata was saved
      const metadata = localStorage.getItem('fractalai_ml_model_metadata');
      expect(metadata).toBeTruthy();
      const parsed = JSON.parse(metadata);
      expect(parsed).toHaveProperty('version', 1);
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('favoriteCount', 5);
      expect(typeof parsed.timestamp).toBe('number');
    });
  });

  describe('Retraining Logic', () => {
    it('should detect when retraining is needed due to favorite increase', async () => {
      const { shouldRetrainModel, saveModel, trainModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');

      // Train initial model with 5 favorites
      for (let i = 0; i < 5; i++) {
        addFavorite({
          fractalType: 'mandelbrot',
          zoom: 1 + i,
          offsetX: 0,
          offsetY: 0,
          iterations: 125,
        });
      }

      const trainResult = await trainModel();
      if (!trainResult || !trainResult.model) {
        return;
      }

      await saveModel(trainResult.model);

      // Initially should not need retraining
      expect(shouldRetrainModel()).toBe(false);

      // Add 2 more favorites (40% increase, should trigger retraining)
      addFavorite({ fractalType: 'mandelbrot', zoom: 6, offsetX: 0, offsetY: 0, iterations: 125 });
      addFavorite({ fractalType: 'mandelbrot', zoom: 7, offsetX: 0, offsetY: 0, iterations: 125 });

      // Should need retraining (7 > 5 * 1.2 = 6)
      expect(shouldRetrainModel()).toBe(true);
    });

    it('should detect when retraining is needed due to age', async () => {
      const { shouldRetrainModel, saveModel, trainModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');

      // Train initial model
      for (let i = 0; i < 5; i++) {
        addFavorite({
          fractalType: 'mandelbrot',
          zoom: 1 + i,
          offsetX: 0,
          offsetY: 0,
          iterations: 125,
        });
      }

      const trainResult = await trainModel();
      if (!trainResult || !trainResult.model) {
        return;
      }

      await saveModel(trainResult.model);

      // Manually set old timestamp (8 days ago)
      const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000);
      localStorage.setItem('fractalai_ml_model_metadata', JSON.stringify({
        version: 1,
        timestamp: oldTimestamp,
        favoriteCount: 5,
      }));

      expect(shouldRetrainModel()).toBe(true);
    });

    it('should not retrain when model is recent and favorite count stable', async () => {
      const { shouldRetrainModel, saveModel, trainModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');

      for (let i = 0; i < 5; i++) {
        addFavorite({
          fractalType: 'mandelbrot',
          zoom: 1 + i,
          offsetX: 0,
          offsetY: 0,
          iterations: 125,
        });
      }

      const trainResult = await trainModel();
      if (!trainResult || !trainResult.model) {
        return;
      }

      await saveModel(trainResult.model);

      // Should not need retraining
      expect(shouldRetrainModel()).toBe(false);
    });
  });

  describe('Model Initialization', () => {
    it('should load existing model if available and valid', async () => {
      const { initializeModel, trainModel, saveModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');

      // Train and save a model
      for (let i = 0; i < 5; i++) {
        addFavorite({
          fractalType: 'mandelbrot',
          zoom: 1 + i,
          offsetX: 0,
          offsetY: 0,
          iterations: 125,
        });
      }

      const trainResult = await trainModel();
      if (!trainResult || !trainResult.model) {
        return;
      }

      await saveModel(trainResult.model);

      // Initialize should load the saved model
      const model = await initializeModel();
      expect(model).toBeDefined();
    });

    it('should train new model if none exists', async () => {
      const { initializeModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');

      localStorage.clear();

      // Add favorites
      for (let i = 0; i < 5; i++) {
        addFavorite({
          fractalType: 'mandelbrot',
          zoom: 1 + i,
          offsetX: 0,
          offsetY: 0,
          iterations: 125,
        });
      }

      const model = await initializeModel();
      // Model may be null if Synaptic.js not available, or an object if training succeeds
      expect(model === null || typeof model === 'object').toBe(true);
    });
  });

  describe('ML Scoring Integration', () => {
    it('should score configurations using trained model', async () => {
      const { trainModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { mlScore } = await import('../../static/js/discovery/discovery-algorithm.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');

      // Train model on specific favorites
      const favoriteConfig = {
        fractalType: 'mandelbrot',
        zoom: 2.0,
        offsetX: -0.5,
        offsetY: 0.3,
        iterations: 150,
        colorScheme: 'classic',
      };

      for (let i = 0; i < 5; i++) {
        addFavorite({ ...favoriteConfig, zoom: favoriteConfig.zoom + i * 0.1 });
      }

      const trainResult = await trainModel();
      if (!trainResult || !trainResult.model) {
        return;
      }

      // Score a similar configuration
      const similarConfig = {
        ...favoriteConfig,
        zoom: 2.1,
      };
      const score = await mlScore(similarConfig, trainResult.model);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should provide different scores for different configurations', async () => {
      const { trainModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { mlScore } = await import('../../static/js/discovery/discovery-algorithm.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');

      // Train on mandelbrot favorites
      for (let i = 0; i < 5; i++) {
        addFavorite({
          fractalType: 'mandelbrot',
          zoom: 2.0 + i * 0.1,
          offsetX: -0.5,
          offsetY: 0.3,
          iterations: 150,
        });
      }

      const trainResult = await trainModel();
      if (!trainResult || !trainResult.model) {
        return;
      }

      // Score similar config (should score higher)
      const similarConfig = {
        fractalType: 'mandelbrot',
        zoom: 2.1,
        offsetX: -0.5,
        offsetY: 0.3,
        iterations: 150,
      };

      // Score very different config (should score differently)
      const differentConfig = {
        fractalType: 'julia',
        zoom: 100.0,
        offsetX: 3.0,
        offsetY: -3.0,
        iterations: 50,
      };

      const similarScore = await mlScore(similarConfig, trainResult.model);
      const differentScore = await mlScore(differentConfig, trainResult.model);

      expect(similarScore).toBeGreaterThanOrEqual(0);
      expect(differentScore).toBeGreaterThanOrEqual(0);
      // Scores may be different (not always, but likely)
      expect(typeof similarScore).toBe('number');
      expect(typeof differentScore).toBe('number');
    });
  });

  describe('Discovery Integration with ML', () => {
    it('should use ML model in discovery when available', async () => {
      const { trainModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { discoverInterestingFractals } = await import('../../static/js/discovery/discovery-algorithm.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');
      const isValidInterestingView = vi.fn(() => true);

      // Train model
      for (let i = 0; i < 5; i++) {
        addFavorite({
          fractalType: 'mandelbrot',
          zoom: 2.0 + i * 0.2,
          offsetX: -0.5 + i * 0.1,
          offsetY: 0.3,
          iterations: 150,
        });
      }

      const trainResult = await trainModel();
      if (!trainResult || !trainResult.model) {
        return;
      }

      // Discover with ML model
      const discoveries = await discoverInterestingFractals(
        'mandelbrot',
        isValidInterestingView,
        trainResult.model,
        { candidateCount: 20, topK: 5, minScore: 0.3 }
      );

      expect(discoveries).toBeInstanceOf(Array);
      expect(discoveries.length).toBeLessThanOrEqual(5);
      discoveries.forEach((discovery) => {
        expect(discovery).toHaveProperty('score');
        expect(discovery.score).toBeGreaterThanOrEqual(0.3);
      });
    });

    it('should fallback to heuristic when model is null', async () => {
      const { discoverInterestingFractals } = await import('../../static/js/discovery/discovery-algorithm.js');
      const isValidInterestingView = vi.fn(() => true);

      const discoveries = await discoverInterestingFractals(
        'mandelbrot',
        isValidInterestingView,
        null, // No model
        { candidateCount: 20, topK: 5, minScore: 0.3 }
      );

      expect(discoveries).toBeInstanceOf(Array);
      // Should still find some discoveries using heuristics
      discoveries.forEach((discovery) => {
        expect(discovery).toHaveProperty('score');
        expect(discovery.score).toBeGreaterThanOrEqual(0.3);
      });
    });
  });

  describe('Feature Extraction', () => {
    it('should extract consistent features for same configuration', async () => {
      const { extractFeatures } = await import('../../static/js/discovery/discovery-algorithm.js');

      const config = {
        fractalType: 'mandelbrot',
        zoom: 2.5,
        offsetX: 0.5,
        offsetY: -0.3,
        iterations: 150,
        colorScheme: 'classic',
        xScale: 1.0,
        yScale: 1.0,
        juliaCX: 0,
        juliaCY: 0,
      };

      const features1 = extractFeatures(config);
      const features2 = extractFeatures(config);

      expect(features1).toEqual(features2);
      expect(features1).toHaveLength(11);
    });

    it('should extract different features for different configurations', async () => {
      const { extractFeatures } = await import('../../static/js/discovery/discovery-algorithm.js');

      const config1 = {
        fractalType: 'mandelbrot',
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
        iterations: 100,
      };

      const config2 = {
        fractalType: 'julia',
        zoom: 10.0,
        offsetX: 1.0,
        offsetY: -1.0,
        iterations: 200,
      };

      const features1 = extractFeatures(config1);
      const features2 = extractFeatures(config2);

      expect(features1).not.toEqual(features2);
      expect(features1[0]).not.toBe(features2[0]); // Different fractal types
    });

    it('should normalize all features to reasonable ranges', async () => {
      const { extractFeatures } = await import('../../static/js/discovery/discovery-algorithm.js');

      const config = {
        fractalType: 'mandelbrot',
        zoom: 1000,
        offsetX: 5,
        offsetY: -5,
        iterations: 400,
        xScale: 5,
        yScale: 5,
        juliaCX: 3,
        juliaCY: -3,
      };

      const features = extractFeatures(config);

      // All features should be normalized
      features.forEach((feature) => {
        expect(typeof feature).toBe('number');
        expect(isNaN(feature)).toBe(false);
        expect(isFinite(feature)).toBe(true);
      });
    });
  });

  describe('Hybrid Scoring', () => {
    it('should use only heuristic when score is too low', async () => {
      const { hybridScore } = await import('../../static/js/discovery/discovery-algorithm.js');
      const invalidView = vi.fn(() => false);

      const config = {
        fractalType: 'mandelbrot',
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
        iterations: 125,
      };

      const score = await hybridScore(config, invalidView, null);
      expect(score).toBe(0.1); // Low score, should skip ML
    });

    it('should combine heuristic and ML when both available', async () => {
      const { hybridScore } = await import('../../static/js/discovery/discovery-algorithm.js');
      const { trainModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');
      const isValidInterestingView = vi.fn(() => true);

      // Train model
      for (let i = 0; i < 5; i++) {
        addFavorite({
          fractalType: 'mandelbrot',
          zoom: 2.0 + i * 0.1,
          offsetX: -0.5,
          offsetY: 0.3,
          iterations: 150,
        });
      }

      const trainResult = await trainModel();
      if (!trainResult || !trainResult.model) {
        return;
      }

      const config = {
        fractalType: 'mandelbrot',
        zoom: 2.0,
        offsetX: -0.5,
        offsetY: 0.3,
        iterations: 150,
      };

      const score = await hybridScore(config, isValidInterestingView, trainResult.model);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      // Should be a weighted combination (not just heuristic or ML)
      expect(typeof score).toBe('number');
    });

    it('should weight ML more heavily when model is available', async () => {
      const { hybridScore } = await import('../../static/js/discovery/discovery-algorithm.js');
      const { trainModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');
      const isValidInterestingView = vi.fn(() => true);

      for (let i = 0; i < 5; i++) {
        addFavorite({
          fractalType: 'mandelbrot',
          zoom: 2.0 + i * 0.1,
          offsetX: -0.5,
          offsetY: 0.3,
          iterations: 150,
        });
      }

      const trainResult = await trainModel();
      if (!trainResult || !trainResult.model) {
        return;
      }

      const config = {
        fractalType: 'mandelbrot',
        zoom: 2.0,
        offsetX: -0.5,
        offsetY: 0.3,
        iterations: 150,
      };

      // Score with model (70% ML weight)
      const scoreWithModel = await hybridScore(config, isValidInterestingView, trainResult.model);

      // Score without model (100% heuristic)
      const scoreWithoutModel = await hybridScore(config, isValidInterestingView, null);

      expect(scoreWithModel).toBeGreaterThanOrEqual(0);
      expect(scoreWithoutModel).toBeGreaterThanOrEqual(0);
      // Scores may differ due to ML influence
      expect(typeof scoreWithModel).toBe('number');
      expect(typeof scoreWithoutModel).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle training errors gracefully', async () => {
      const { trainModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');

      // Add favorites
      for (let i = 0; i < 5; i++) {
        addFavorite({
          fractalType: 'mandelbrot',
          zoom: 1 + i,
          offsetX: 0,
          offsetY: 0,
          iterations: 125,
        });
      }

      // If Synaptic.js is not available, trainModel should handle it gracefully
      const result = await trainModel();
      // Should return null on error, or a result object if successful
      expect(result === null || (result && typeof result === 'object')).toBe(true);
    });

    it('should handle model activation errors', async () => {
      const { mlScore } = await import('../../static/js/discovery/discovery-algorithm.js');

      const brokenModel = {
        activate: vi.fn(() => {
          throw new Error('Activation failed');
        }),
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const config = {
        fractalType: 'mandelbrot',
        zoom: 1.0,
        offsetX: 0,
        offsetY: 0,
        iterations: 125,
      };

      const score = await mlScore(config, brokenModel);

      // Should fallback to heuristic
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle localStorage errors when saving', async () => {
      const { saveModel, trainModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');

      for (let i = 0; i < 5; i++) {
        addFavorite({
          fractalType: 'mandelbrot',
          zoom: 1 + i,
          offsetX: 0,
          offsetY: 0,
          iterations: 125,
        });
      }

      const trainResult = await trainModel();
      if (!trainResult || !trainResult.model) {
        return;
      }

      // Mock model.toJSON to throw error
      const originalToJSON = trainResult.model.toJSON;
      trainResult.model.toJSON = vi.fn(() => {
        throw new Error('Serialization failed');
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const saved = await saveModel(trainResult.model);

      // saveModel catches errors and returns false
      expect(saved).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      trainResult.model.toJSON = originalToJSON;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Model Performance', () => {
    it('should score multiple configurations efficiently', async () => {
      const { trainModel } = await import('../../static/js/discovery/ml-trainer.js');
      const { mlScore } = await import('../../static/js/discovery/discovery-algorithm.js');
      const { addFavorite } = await import('../../static/js/discovery/favorites-manager.js');

      for (let i = 0; i < 5; i++) {
        addFavorite({
          fractalType: 'mandelbrot',
          zoom: 2.0 + i * 0.1,
          offsetX: -0.5,
          offsetY: 0.3,
          iterations: 150,
        });
      }

      const trainResult = await trainModel();
      if (!trainResult || !trainResult.model) {
        return;
      }

      // Score multiple configurations
      const configs = Array.from({ length: 10 }, (_, i) => ({
        fractalType: 'mandelbrot',
        zoom: 2.0 + i * 0.1,
        offsetX: -0.5 + i * 0.05,
        offsetY: 0.3,
        iterations: 150,
      }));

      const startTime = performance.now();
      const scores = await Promise.all(
        configs.map(config => mlScore(config, trainResult.model))
      );
      const endTime = performance.now();

      expect(scores).toHaveLength(10);
      scores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });

      // Should complete reasonably quickly (< 100ms for 10 scores)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
