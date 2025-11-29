/**
 * Lifecycle manager for fractal sessions
 * Handles explicit cleanup when switching fractal types, zoom presets, or routes
 * Prevents memory leaks and lingering resource pressure
 */

import { appState } from './app-state.js';
import { clearPaletteCache, clearShaderCache } from '../fractals/utils.js';

/**
 * Lifecycle manager for fractal sessions
 */
export class LifecycleManager {
  constructor() {
    this.currentSessionId = null;
    this.sessionStartTime = null;
    this.cleanupCallbacks = [];
  }

  /**
   * Start a new fractal session
   * @param {string} sessionType - Type of session (e.g., 'fractal-change', 'zoom', 'preset-load')
   * @param {string} fractalType - Fractal type identifier
   * @returns {string} Session ID
   */
  startSession(sessionType, fractalType) {
    // End previous session if active
    if (this.currentSessionId) {
      this.endSession();
    }

    // Generate new session ID
    this.currentSessionId = `${sessionType}-${fractalType}-${Date.now()}`;
    this.sessionStartTime = performance.now();

    return this.currentSessionId;
  }

  /**
   * End current session and cleanup resources
   */
  endSession() {
    if (!this.currentSessionId) {
      return;
    }

    // Cancel in-flight workers
    appState.cancelWorkerTasks();

    // Clear caches for obsolete fractal configs
    const frameCache = appState.getFrameCache();
    if (frameCache) {
      // Clear frame cache when switching sessions
      frameCache.clear();
    }

    // Clear palette and shader caches
    clearPaletteCache();
    clearShaderCache();

    // Release references to large typed arrays
    // (handled by garbage collector, but we can help by clearing caches)

    // Run registered cleanup callbacks
    for (const callback of this.cleanupCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error('[LifecycleManager] Cleanup callback error:', error);
      }
    }

    // Clear session data
    this.currentSessionId = null;
    this.sessionStartTime = null;
  }

  /**
   * Register a cleanup callback
   * @param {Function} callback - Cleanup function to call when session ends
   */
  registerCleanup(callback) {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Unregister a cleanup callback
   * @param {Function} callback - Cleanup function to remove
   */
  unregisterCleanup(callback) {
    const index = this.cleanupCallbacks.indexOf(callback);
    if (index !== -1) {
      this.cleanupCallbacks.splice(index, 1);
    }
  }

  /**
   * Get current session ID
   * @returns {string|null}
   */
  getCurrentSessionId() {
    return this.currentSessionId;
  }

  /**
   * Get session duration
   * @returns {number} Duration in milliseconds, or 0 if no active session
   */
  getSessionDuration() {
    if (!this.sessionStartTime) {
      return 0;
    }
    return performance.now() - this.sessionStartTime;
  }
}

// Export singleton instance
export const lifecycleManager = new LifecycleManager();

