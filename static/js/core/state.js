/**
 * Application state management
 * Centralizes application state and provides getters/setters
 */

import { CONFIG } from './config.js';

/**
 * Application state class
 */
export class AppState {
  constructor() {
    // Regl and canvas references
    this.regl = null;
    this.canvas = null;

    // Fractal state
    this.currentFractalType = CONFIG.fractal.defaultType;
    this.currentFractalModule = null;
    this.drawFractal = null;

    // Rendering state
    this.needsRender = false;
    this.isDisplayingCached = false;
    this.cachedDrawCommand = null;
    this.renderScheduled = false;
    this.isProgressiveRendering = false;
    this.currentProgressiveIterations = 0;
    this.targetIterations = 0;

    // Performance tracking
    this.lastTime = 0;
    this.frameCount = 0;
    this.fps = 0;

    // Parameters
    this.params = {
      iterations: CONFIG.rendering.defaultIterations,
      colorScheme: CONFIG.colors.defaultScheme,
      juliaC: { ...CONFIG.julia.defaultC },
      center: { x: 0, y: 0 },
      zoom: CONFIG.zoom.defaultZoom,
      offset: { x: 0, y: 0 },
      xScale: 1.0,
      yScale: 1.0,
    };

    // Renderer size update function
    this.updateRendererSize = null;
  }

  /**
   * Get current fractal type
   * @returns {string} Current fractal type
   */
  getFractalType() {
    return this.currentFractalType;
  }

  /**
   * Set current fractal type
   * @param {string} type - Fractal type
   */
  setFractalType(type) {
    this.currentFractalType = type;
  }

  /**
   * Get current parameters
   * @returns {Object} Current parameters
   */
  getParams() {
    return this.params;
  }

  /**
   * Update parameters
   * @param {Object} updates - Parameter updates
   */
  updateParams(updates) {
    Object.assign(this.params, updates);
  }
}

// Export singleton instance
export const appState = new AppState();
