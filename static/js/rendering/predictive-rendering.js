/**
 * Predictive Rendering Manager
 * Pre-renders likely next frames based on user input patterns to provide instant view changes
 */

import { CONFIG } from '../core/config.js';

/**
 * Predictive Rendering Manager
 * Tracks user input patterns and pre-renders likely next views
 */
export class PredictiveRenderingManager {
  /**
   * @param {Object} options - Configuration options
   * @param {number} options.maxPredictions - Maximum number of predictions to maintain (default: 3)
   * @param {number} options.velocityDecay - Velocity decay factor per frame (default: 0.9)
   * @param {number} options.minVelocity - Minimum velocity to trigger predictions (default: 0.01)
   * @param {number} options.predictionDistance - Distance multiplier for predictions (default: 1.5)
   */
  constructor(options = {}) {
    this.maxPredictions = options.maxPredictions || 3;
    this.velocityDecay = options.velocityDecay || 0.9;
    this.minVelocity = options.minVelocity || 0.01;
    this.predictionDistance = options.predictionDistance || 1.5;

    // Input tracking
    this.velocity = { x: 0, y: 0, zoom: 0 };
    this.lastParams = null;
    this.lastUpdateTime = performance.now();
    this.isEnabled = CONFIG.features?.predictiveRendering !== false;

    // Prediction tracking
    this.pendingPredictions = new Map(); // viewKey -> { params, priority }
    this.completedPredictions = new Set(); // viewKey
    this.isPreRendering = false;
  }

  /**
   * Enable or disable predictive rendering
   * @param {boolean} enabled - Whether predictive rendering is enabled
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  /**
   * Update velocity based on parameter changes
   * @param {Object} currentParams - Current fractal parameters
   */
  updateVelocity(currentParams) {
    if (!this.isEnabled || !currentParams) return;

    const now = performance.now();
    const deltaTime = Math.max(1, now - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = now;

    if (this.lastParams) {
      // Calculate velocity from parameter changes
      const deltaOffsetX = currentParams.offset.x - this.lastParams.offset.x;
      const deltaOffsetY = currentParams.offset.y - this.lastParams.offset.y;
      const deltaZoom = currentParams.zoom - this.lastParams.zoom;

      // Update velocity (with decay)
      this.velocity.x = (this.velocity.x * this.velocityDecay) + (deltaOffsetX / deltaTime);
      this.velocity.y = (this.velocity.y * this.velocityDecay) + (deltaOffsetY / deltaTime);
      this.velocity.zoom = (this.velocity.zoom * this.velocityDecay) + (deltaZoom / deltaTime);

      // Apply decay to velocity
      this.velocity.x *= this.velocityDecay;
      this.velocity.y *= this.velocityDecay;
      this.velocity.zoom *= this.velocityDecay;
    }

    this.lastParams = { ...currentParams };
  }

  /**
   * Generate a view key from parameters
   * @param {Object} params - Fractal parameters
   * @param {string} fractalType - Fractal type
   * @returns {string} View key
   */
  generateViewKey(params, fractalType) {
    // Round parameters to avoid floating point precision issues
    const round = (val, precision = 6) => Math.round(val * Math.pow(10, precision)) / Math.pow(10, precision);
    
    return `${fractalType}_${round(params.zoom)}_${round(params.offset.x)}_${round(params.offset.y)}_${params.iterations}_${params.colorScheme}`;
  }

  /**
   * Predict likely next views based on current velocity
   * @param {Object} currentParams - Current fractal parameters
   * @param {string} fractalType - Current fractal type
   * @returns {Array<Object>} Array of predicted view parameters
   */
  predictNextViews(currentParams, fractalType) {
    if (!this.isEnabled || !currentParams) return [];

    const predictions = [];
    const velocityMagnitude = Math.sqrt(
      this.velocity.x * this.velocity.x + 
      this.velocity.y * this.velocity.y
    );

    // Only predict if there's significant movement
    if (velocityMagnitude < this.minVelocity && Math.abs(this.velocity.zoom) < this.minVelocity) {
      return [];
    }

    // Predict multiple views along the movement trajectory
    for (let i = 1; i <= this.maxPredictions; i++) {
      const t = i * this.predictionDistance;
      
      // Predict offset based on velocity
      const predictedOffset = {
        x: currentParams.offset.x + (this.velocity.x * t),
        y: currentParams.offset.y + (this.velocity.y * t),
      };

      // Predict zoom based on zoom velocity
      const zoomFactor = 1 + (this.velocity.zoom * t);
      const predictedZoom = currentParams.zoom * zoomFactor;

      // Clamp zoom to valid range
      const minZoom = CONFIG.zoom?.minZoom || 0.1;
      const maxZoom = CONFIG.zoom?.maxZoom || 1e10;
      const clampedZoom = Math.max(minZoom, Math.min(maxZoom, predictedZoom));

      // Create predicted parameters
      const predictedParams = {
        ...currentParams,
        offset: predictedOffset,
        zoom: clampedZoom,
      };

      const viewKey = this.generateViewKey(predictedParams, fractalType);

      // Skip if already predicted or completed
      if (!this.pendingPredictions.has(viewKey) && !this.completedPredictions.has(viewKey)) {
        predictions.push({
          params: predictedParams,
          viewKey,
          priority: i, // Lower priority for further predictions
        });
      }
    }

    return predictions;
  }

  /**
   * Add a prediction to the queue
   * @param {Object} prediction - Prediction object with params, viewKey, and priority
   */
  addPrediction(prediction) {
    if (!this.isEnabled || !prediction) return;

    const { viewKey, priority } = prediction;

    // Update priority if prediction already exists
    if (this.pendingPredictions.has(viewKey)) {
      const existing = this.pendingPredictions.get(viewKey);
      if (priority < existing.priority) {
        existing.priority = priority;
      }
    } else {
      this.pendingPredictions.set(viewKey, prediction);
    }
  }

  /**
   * Mark a prediction as completed
   * @param {string} viewKey - View key
   */
  markCompleted(viewKey) {
    this.pendingPredictions.delete(viewKey);
    this.completedPredictions.add(viewKey);

    // Limit completed predictions set size
    if (this.completedPredictions.size > this.maxPredictions * 10) {
      const entries = Array.from(this.completedPredictions);
      entries.slice(0, this.maxPredictions * 5).forEach(key => {
        this.completedPredictions.delete(key);
      });
    }
  }

  /**
   * Get the next prediction to render (highest priority)
   * @returns {Object|null} Next prediction or null
   */
  getNextPrediction() {
    if (!this.isEnabled || this.pendingPredictions.size === 0) return null;

    // Get prediction with lowest priority (highest priority number = lower priority)
    let nextPrediction = null;
    let lowestPriority = Infinity;

    for (const prediction of this.pendingPredictions.values()) {
      if (prediction.priority < lowestPriority) {
        lowestPriority = prediction.priority;
        nextPrediction = prediction;
      }
    }

    return nextPrediction;
  }

  /**
   * Clear all predictions
   */
  clear() {
    this.pendingPredictions.clear();
    this.completedPredictions.clear();
    this.velocity = { x: 0, y: 0, zoom: 0 };
    this.lastParams = null;
    this.isPreRendering = false;
  }

  /**
   * Reset velocity tracking
   */
  resetVelocity() {
    this.velocity = { x: 0, y: 0, zoom: 0 };
    this.lastParams = null;
  }

  /**
   * Get statistics about predictive rendering
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      enabled: this.isEnabled,
      pendingPredictions: this.pendingPredictions.size,
      completedPredictions: this.completedPredictions.size,
      velocity: { ...this.velocity },
      isPreRendering: this.isPreRendering,
    };
  }
}

/**
 * Create a predictive rendering manager
 * @param {Object} options - Configuration options
 * @returns {PredictiveRenderingManager} Predictive rendering manager instance
 */
export function createPredictiveRenderingManager(options = {}) {
  return new PredictiveRenderingManager(options);
}

