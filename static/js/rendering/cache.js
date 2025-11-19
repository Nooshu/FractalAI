/**
 * Frame caching for rendered fractals
 * Caches rendered frames to avoid re-rendering identical views
 */

import { CONFIG } from '../core/config.js';
import { isJuliaType } from '../fractals/utils.js';

/**
 * Frame cache manager
 */
export class FrameCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = CONFIG.rendering.cacheSize;
    this.cachedCanvasElement = null;
  }

  /**
   * Generate cache key from view parameters
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {string} fractalType - Current fractal type
   * @param {Object} params - Fractal parameters
   * @returns {string|null} Cache key or null if invalid
   */
  generateCacheKey(canvas, fractalType, params) {
    if (!canvas) return null;

    // Cache canvas element reference
    if (!this.cachedCanvasElement) {
      this.cachedCanvasElement = canvas;
    }

    // Round values to avoid floating point precision issues
    const zoom = Math.round(params.zoom * 1000) / 1000;
    const offsetX = Math.round(params.offset.x * 10000) / 10000;
    const offsetY = Math.round(params.offset.y * 10000) / 10000;
    const iterations = params.iterations;
    const colorScheme = params.colorScheme;
    const xScale = Math.round(params.xScale * 100) / 100;
    const yScale = Math.round(params.yScale * 100) / 100;
    const isJulia = isJuliaType(fractalType);
    const juliaCX = isJulia ? Math.round(params.juliaC.x * 10000) / 10000 : 0;
    const juliaCY = isJulia ? Math.round(params.juliaC.y * 10000) / 10000 : 0;
    
    // Use display dimensions (not render dimensions affected by pixel ratio) for cache key
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const width = Math.round(rect.width || container.clientWidth || CONFIG.canvas.defaultWidth);
    const height = Math.round(rect.height || container.clientHeight || CONFIG.canvas.defaultHeight);

    return `${fractalType}_${zoom}_${offsetX}_${offsetY}_${iterations}_${colorScheme}_${xScale}_${yScale}_${juliaCX}_${juliaCY}_${width}_${height}`;
  }

  /**
   * Get cached frame if available
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {string} fractalType - Current fractal type
   * @param {Object} params - Fractal parameters
   * @param {Object} regl - Regl context
   * @returns {Object|null} Cached frame or null
   */
  getCachedFrame(canvas, fractalType, params, regl) {
    const key = this.generateCacheKey(canvas, fractalType, params);
    if (!key) return null;
    
    const cached = this.cache.get(key);
    // Verify the cached framebuffer exists
    if (cached && cached.framebuffer && regl) {
      return cached;
    }
    return null;
  }

  /**
   * Store rendered frame in cache
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {string} fractalType - Current fractal type
   * @param {Object} params - Fractal parameters
   * @param {Object} framebuffer - Regl framebuffer to cache
   */
  cacheFrame(canvas, fractalType, params, framebuffer) {
    const key = this.generateCacheKey(canvas, fractalType, params);
    if (!key) return;

    // Limit cache size - remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      // Remove first (oldest) entry
      const firstKey = this.cache.keys().next().value;
      const oldEntry = this.cache.get(firstKey);
      if (oldEntry && oldEntry.framebuffer) {
        try {
          oldEntry.framebuffer.destroy();
        } catch (error) {
          console.warn('Error destroying framebuffer:', error);
        }
      }
      this.cache.delete(firstKey);
    }

    this.cache.set(key, { framebuffer, timestamp: Date.now() });
  }

  /**
   * Clear all cached frames
   */
  clear() {
    for (const [, entry] of this.cache.entries()) {
      if (entry.framebuffer) {
        try {
          entry.framebuffer.destroy();
        } catch (error) {
          console.warn('Error destroying framebuffer:', error);
        }
      }
    }
    this.cache.clear();
  }
}

