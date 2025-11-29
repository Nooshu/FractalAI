/**
 * Frame cache module for rendered fractals
 * Self-contained with minimal dependencies
 * Caches rendered frames to avoid re-rendering identical views
 */

/**
 * Check if a fractal type is a Julia variant
 * Inlined to avoid external dependency
 * @param {string} fractalType - The fractal type name
 * @returns {boolean} True if it's a Julia variant
 */
function isJuliaType(fractalType) {
  const juliaTypes = [
    'julia',
    'julia-snakes',
    'multibrot-julia',
    'burning-ship-julia',
    'tricorn-julia',
    'phoenix-julia',
    'lambda-julia',
    'hybrid-julia',
    'magnet',
  ];
  return juliaTypes.includes(fractalType);
}

/**
 * Frame cache manager
 * Self-contained with minimal dependencies
 */
export class FrameCache {
  /**
   * @param {number} maxSize - Maximum number of cached frames (default: 10)
   */
  constructor(maxSize = 10) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.cachedCanvasElement = null;
  }

  /**
   * Generate cache key from view parameters
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {string} fractalType - Current fractal type
   * @param {Object} params - Fractal parameters object with:
   *   - zoom: number
   *   - offset: {x: number, y: number}
   *   - iterations: number
   *   - colorScheme: string
   *   - xScale: number
   *   - yScale: number
   *   - juliaC: {x: number, y: number} (optional, for Julia types)
   * @param {Object} options - Optional configuration
   *   - defaultWidth: number (default: 800)
   *   - defaultHeight: number (default: 600)
   * @returns {string|null} Cache key or null if invalid
   */
  generateCacheKey(canvas, fractalType, params, options = {}) {
    if (!canvas) return null;

    const { defaultWidth = 800, defaultHeight = 600 } = options;

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
    const width = Math.round(rect.width || container.clientWidth || defaultWidth);
    const height = Math.round(rect.height || container.clientHeight || defaultHeight);

    return `${fractalType}_${zoom}_${offsetX}_${offsetY}_${iterations}_${colorScheme}_${xScale}_${yScale}_${juliaCX}_${juliaCY}_${width}_${height}`;
  }

  /**
   * Get cached frame if available
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {string} fractalType - Current fractal type
   * @param {Object} params - Fractal parameters
   * @param {Object} regl - Regl context (optional, for validation)
   * @param {Object} options - Optional configuration
   * @returns {Object|null} Cached frame with framebuffer and timestamp, or null
   */
  getCachedFrame(canvas, fractalType, params, regl = null, options = {}) {
    const key = this.generateCacheKey(canvas, fractalType, params, options);
    if (!key) return null;

    const cached = this.cache.get(key);
    // Verify the cached framebuffer exists
    if (cached && cached.framebuffer && (!regl || regl)) {
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
   * @param {Object} options - Optional configuration
   */
  cacheFrame(canvas, fractalType, params, framebuffer, options = {}) {
    const key = this.generateCacheKey(canvas, fractalType, params, options);
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

  /**
   * Get current cache size
   * @returns {number} Number of cached frames
   */
  size() {
    return this.cache.size;
  }

  /**
   * Trim cache to target size (LRU eviction)
   * Removes oldest entries until cache size is at or below target
   * @param {number} targetSize - Target cache size (default: maxSize * 0.7)
   */
  trim(targetSize = null) {
    const target = targetSize !== null ? targetSize : Math.floor(this.maxSize * 0.7);

    if (this.cache.size <= target) {
      return; // No trimming needed
    }

    // Convert to array and sort by timestamp (oldest first)
    const entries = Array.from(this.cache.entries())
      .map(([key, value]) => ({ key, timestamp: value.timestamp }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest entries
    const toRemove = entries.slice(0, this.cache.size - target);
    for (const { key } of toRemove) {
      const entry = this.cache.get(key);
      if (entry && entry.framebuffer) {
        try {
          entry.framebuffer.destroy();
        } catch (error) {
          console.warn('Error destroying framebuffer during trim:', error);
        }
      }
      this.cache.delete(key);
    }
  }

  /**
   * Remove entries older than specified age
   * @param {number} maxAgeMs - Maximum age in milliseconds
   * @returns {number} Number of entries removed
   */
  removeOldEntries(maxAgeMs) {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAgeMs) {
        if (entry.framebuffer) {
          try {
            entry.framebuffer.destroy();
          } catch (error) {
            console.warn('Error destroying old framebuffer:', error);
          }
        }
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}
