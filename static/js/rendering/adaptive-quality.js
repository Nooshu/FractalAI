/**
 * Adaptive Quality Manager
 * Dynamically adjusts rendering quality based on frame time to maintain target FPS
 */

import { CONFIG } from '../core/config.js';
import { devLog } from '../core/logger.js';

/**
 * Adaptive Quality Manager
 * Monitors frame time and adjusts quality parameters to maintain target FPS
 */
export class AdaptiveQualityManager {
  /**
   * @param {Object} options - Configuration options
   * @param {number} options.targetFrameTime - Target frame time in milliseconds (default: 16.67 for 60 FPS)
   * @param {number} options.minQuality - Minimum quality multiplier (default: 0.5)
   * @param {number} options.maxQuality - Maximum quality multiplier (default: 1.0)
   * @param {number} options.qualityStep - Quality adjustment step (default: 0.1)
   * @param {number} options.samplesToAverage - Number of frame time samples to average (default: 10)
   */
  constructor(options = {}) {
    this.targetFrameTime = options.targetFrameTime || CONFIG.performance?.targetFPS 
      ? 1000 / CONFIG.performance.targetFPS 
      : 16.67; // 60 FPS default
    this.minQuality = options.minQuality || 0.5;
    this.maxQuality = options.maxQuality || 1.0;
    this.qualityStep = options.qualityStep || 0.1;
    this.samplesToAverage = options.samplesToAverage || 10;

    // Current state
    this.currentQuality = 1.0;
    this.frameTimeHistory = [];
    this.isEnabled = CONFIG.features?.adaptiveQuality !== false;
  }

  /**
   * Enable or disable adaptive quality
   * @param {boolean} enabled - Whether adaptive quality is enabled
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.currentQuality = 1.0;
      this.frameTimeHistory = [];
    }
  }

  /**
   * Record a frame time measurement
   * @param {number} frameTime - Frame time in milliseconds
   */
  recordFrameTime(frameTime) {
    if (!this.isEnabled) return;

    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.samplesToAverage) {
      this.frameTimeHistory.shift();
    }
  }

  /**
   * Update quality based on recent frame time measurements
   * @returns {number} Updated quality multiplier
   */
  updateQuality() {
    if (!this.isEnabled || this.frameTimeHistory.length < this.samplesToAverage) {
      return this.currentQuality;
    }

    // Calculate average frame time
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;

    // Adjust quality based on frame time
    const thresholdHigh = this.targetFrameTime * 1.2; // 20% over target
    const thresholdLow = this.targetFrameTime * 0.8; // 20% under target

    if (avgFrameTime > thresholdHigh) {
      // Frame time too high - reduce quality
      this.currentQuality = Math.max(
        this.minQuality,
        this.currentQuality - this.qualityStep
      );
      
      devLog.log(
        `%c[Adaptive Quality]%c Reducing quality to ${this.currentQuality.toFixed(2)} (avg frame time: ${avgFrameTime.toFixed(2)}ms)`,
        'color: #FF9800; font-weight: bold;',
        'color: inherit;'
      );
    } else if (avgFrameTime < thresholdLow) {
      // Frame time low enough - increase quality
      this.currentQuality = Math.min(
        this.maxQuality,
        this.currentQuality + this.qualityStep
      );
      
      if (this.currentQuality < this.maxQuality) {
        devLog.log(
          `%c[Adaptive Quality]%c Increasing quality to ${this.currentQuality.toFixed(2)} (avg frame time: ${avgFrameTime.toFixed(2)}ms)`,
          'color: #4CAF50; font-weight: bold;',
          'color: inherit;'
        );
      }
    }

    return this.currentQuality;
  }

  /**
   * Get the current quality multiplier
   * @returns {number} Quality multiplier (0.0 to 1.0)
   */
  getQuality() {
    return this.isEnabled ? this.currentQuality : 1.0;
  }

  /**
   * Get adjusted iterations based on current quality
   * @param {number} baseIterations - Base iteration count
   * @returns {number} Adjusted iteration count
   */
  getAdjustedIterations(baseIterations) {
    if (!this.isEnabled) {
      return baseIterations;
    }
    return Math.max(
      Math.floor(baseIterations * this.currentQuality),
      Math.floor(baseIterations * this.minQuality)
    );
  }

  /**
   * Get adjusted resolution multiplier based on current quality
   * @returns {number} Resolution multiplier (0.0 to 1.0)
   */
  getResolutionMultiplier() {
    if (!this.isEnabled) {
      return 1.0;
    }
    // Resolution adjustment is more aggressive than iterations
    // Use square root to reduce impact on pixel count
    return Math.sqrt(this.currentQuality);
  }

  /**
   * Reset quality to maximum
   */
  reset() {
    this.currentQuality = this.maxQuality;
    this.frameTimeHistory = [];
  }

  /**
   * Get statistics about adaptive quality
   * @returns {Object} Statistics object
   */
  getStats() {
    const avgFrameTime = this.frameTimeHistory.length > 0
      ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
      : 0;

    return {
      enabled: this.isEnabled,
      currentQuality: this.currentQuality,
      averageFrameTime: avgFrameTime,
      targetFrameTime: this.targetFrameTime,
      samples: this.frameTimeHistory.length,
    };
  }
}

/**
 * Create an adaptive quality manager
 * @param {Object} options - Configuration options
 * @returns {AdaptiveQualityManager} Adaptive quality manager instance
 */
export function createAdaptiveQualityManager(options = {}) {
  return new AdaptiveQualityManager(options);
}

