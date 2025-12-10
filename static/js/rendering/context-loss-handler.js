/**
 * WebGL Context Loss Handler
 * Provides graceful handling of WebGL context loss and restoration
 * Saves application state and reinitializes resources when context is restored
 */

import { devLog } from '../core/logger.js';

/**
 * Context Loss Handler
 * Manages WebGL context loss and restoration
 */
export class ContextLossHandler {
  /**
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} options - Configuration options
   * @param {Function} options.onContextLost - Callback when context is lost
   * @param {Function} options.onContextRestored - Callback when context is restored
   * @param {Function} options.saveState - Function to save application state
   * @param {Function} options.restoreState - Function to restore application state
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.onContextLost = options.onContextLost || null;
    this.onContextRestored = options.onContextRestored || null;
    this.saveState = options.saveState || null;
    this.restoreState = options.restoreState || null;
    this.isContextLost = false;
    this.savedState = null;

    // Bind event handlers
    this.handleContextLost = this.handleContextLost.bind(this);
    this.handleContextRestored = this.handleContextRestored.bind(this);

    // Register event listeners
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);
  }

  /**
   * Handle context lost event
   * @param {Event} event - Context lost event
   */
  handleContextLost(event) {
    // Prevent default to allow context restoration
    event.preventDefault();

    this.isContextLost = true;

    if (import.meta.env?.DEV) {
      console.warn(
        '%c[Context Loss]%c WebGL context lost. Saving state and preparing for recovery...',
        'color: #FF9800; font-weight: bold;',
        'color: inherit;'
      );
    }

    // Save application state if saveState function is provided
    if (this.saveState) {
      try {
        this.savedState = this.saveState();
      } catch (error) {
        console.error('[Context Loss] Failed to save state:', error);
        this.savedState = null;
      }
    }

    // Notify callback
    if (this.onContextLost) {
      try {
        this.onContextLost(this.savedState);
      } catch (error) {
        console.error('[Context Loss] Error in onContextLost callback:', error);
      }
    }
  }

  /**
   * Handle context restored event
   * @param {Event} event - Context restored event
   */
  handleContextRestored(_event) {
    this.isContextLost = false;

    devLog.log(
      '%c[Context Restore]%c WebGL context restored. Reinitializing resources...',
      'color: #4CAF50; font-weight: bold;',
      'color: inherit;'
    );

    // Notify callback to reinitialize resources
    if (this.onContextRestored) {
      try {
        this.onContextRestored(this.savedState);
      } catch (error) {
        console.error('[Context Restore] Error in onContextRestored callback:', error);
      }
    }

    // Restore application state if restoreState function is provided
    if (this.restoreState && this.savedState) {
      try {
        this.restoreState(this.savedState);
      } catch (error) {
        console.error('[Context Restore] Failed to restore state:', error);
      }
    }

    // Clear saved state
    this.savedState = null;
  }

  /**
   * Check if context is currently lost
   * @returns {boolean} True if context is lost
   */
  isLost() {
    return this.isContextLost;
  }

  /**
   * Manually trigger context loss (for testing)
   * Note: This requires the WEBGL_lose_context extension
   */
  loseContext() {
    const gl = this.canvas.getContext('webgl') || this.canvas.getContext('webgl2');
    if (gl) {
      const loseContextExt = gl.getExtension('WEBGL_lose_context');
      if (loseContextExt) {
        loseContextExt.loseContext();
      } else {
        console.warn('[Context Loss] WEBGL_lose_context extension not available for testing');
      }
    }
  }

  /**
   * Manually restore context (for testing)
   * Note: This requires the WEBGL_lose_context extension
   */
  restoreContext() {
    const gl = this.canvas.getContext('webgl') || this.canvas.getContext('webgl2');
    if (gl) {
      const loseContextExt = gl.getExtension('WEBGL_lose_context');
      if (loseContextExt) {
        loseContextExt.restoreContext();
      } else {
        console.warn('[Context Loss] WEBGL_lose_context extension not available for testing');
      }
    }
  }

  /**
   * Cleanup event listeners
   */
  dispose() {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost, false);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored, false);
    this.onContextLost = null;
    this.onContextRestored = null;
    this.saveState = null;
    this.restoreState = null;
    this.savedState = null;
  }
}

/**
 * Create a context loss handler
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} options - Configuration options
 * @returns {ContextLossHandler} Context loss handler instance
 */
export function createContextLossHandler(canvas, options = {}) {
  return new ContextLossHandler(canvas, options);
}

