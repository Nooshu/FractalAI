/**
 * Multi-Resolution Rendering Manager
 * Renders at multiple resolutions simultaneously for fast initial display and progressive quality improvement
 */

import { CONFIG } from '../core/config.js';

/**
 * Multi-Resolution Rendering Manager
 * Manages rendering at multiple resolutions for progressive quality improvement
 */
export class MultiResolutionManager {
  /**
   * @param {Object} options - Configuration options
   * @param {number} options.lowResScale - Scale factor for low-res rendering (default: 0.5)
   * @param {number} options.enableHighRes - Whether to enable high-res rendering (default: true)
   * @param {number} options.highResDelay - Delay before starting high-res render in ms (default: 100)
   */
  constructor(options = {}) {
    this.lowResScale = options.lowResScale || 0.5;
    this.enableHighRes = options.enableHighRes !== false;
    this.highResDelay = options.highResDelay || 100;
    this.isEnabled = CONFIG.features?.multiResolution !== false;

    // State tracking
    this.isRendering = false;
    this.lowResFramebuffer = null;
    this.highResFramebuffer = null;
    this.currentResolution = 'low'; // 'low' or 'high'
    this.highResRenderId = null;
  }

  /**
   * Enable or disable multi-resolution rendering
   * @param {boolean} enabled - Whether multi-resolution rendering is enabled
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.cleanup();
    }
  }

  /**
   * Calculate low-resolution dimensions
   * @param {number} width - Full width
   * @param {number} height - Full height
   * @returns {Object} Object with width and height
   */
  getLowResDimensions(width, height) {
    return {
      width: Math.max(1, Math.floor(width * this.lowResScale)),
      height: Math.max(1, Math.floor(height * this.lowResScale)),
    };
  }

  /**
   * Get current resolution mode
   * @returns {string} Current resolution mode ('low' or 'high')
   */
  getCurrentResolution() {
    return this.currentResolution;
  }

  /**
   * Check if high-res rendering is in progress
   * @returns {boolean} True if high-res rendering is active
   */
  isHighResRendering() {
    return this.isRendering && this.currentResolution === 'high';
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.highResRenderId !== null) {
      if (typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(this.highResRenderId);
      } else {
        clearTimeout(this.highResRenderId);
      }
      this.highResRenderId = null;
    }

    if (this.lowResFramebuffer) {
      try {
        this.lowResFramebuffer.destroy();
      } catch (error) {
        // Ignore cleanup errors
      }
      this.lowResFramebuffer = null;
    }

    if (this.highResFramebuffer) {
      try {
        this.highResFramebuffer.destroy();
      } catch (error) {
        // Ignore cleanup errors
      }
      this.highResFramebuffer = null;
    }

    this.isRendering = false;
    this.currentResolution = 'low';
  }

  /**
   * Get statistics about multi-resolution rendering
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      enabled: this.isEnabled,
      isRendering: this.isRendering,
      currentResolution: this.currentResolution,
      lowResScale: this.lowResScale,
      enableHighRes: this.enableHighRes,
    };
  }
}

/**
 * Create a multi-resolution rendering manager
 * @param {Object} options - Configuration options
 * @returns {MultiResolutionManager} Multi-resolution rendering manager instance
 */
export function createMultiResolutionManager(options = {}) {
  return new MultiResolutionManager(options);
}

