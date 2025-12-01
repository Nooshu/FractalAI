/**
 * Occlusion Query Utilities
 * Provides WebGL2 occlusion query support for tile-based rendering optimization
 * Allows skipping invisible tiles to improve performance
 */

/**
 * Occlusion Query Manager
 * Manages occlusion queries for tile-based rendering
 */
export class OcclusionQueryManager {
  /**
   * @param {WebGL2RenderingContext} gl - WebGL2 context
   */
  constructor(gl) {
    this.gl = gl;
    this.queries = new Map(); // tileId -> query object
    this.pendingQueries = new Map(); // tileId -> query
    this.visibleTiles = new Set(); // Set of tile IDs that are visible
    this.isSupported = gl instanceof WebGL2RenderingContext;
  }

  /**
   * Check if occlusion queries are supported
   * @returns {boolean} True if supported
   */
  isOcclusionQuerySupported() {
    return this.isSupported;
  }

  /**
   * Begin an occlusion query for a tile
   * @param {string} tileId - Unique tile identifier
   * @returns {boolean} True if query was started
   */
  beginQuery(tileId) {
    if (!this.isSupported) return false;

    // Clean up any existing query for this tile
    this.endQuery(tileId);

    try {
      const query = this.gl.createQuery();
      this.gl.beginQuery(this.gl.ANY_SAMPLES_PASSED, query);
      this.pendingQueries.set(tileId, query);
      return true;
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.warn('[Occlusion Query] Failed to create query:', error);
      }
      return false;
    }
  }

  /**
   * End an occlusion query for a tile
   * @param {string} tileId - Unique tile identifier
   */
  endQuery(tileId) {
    if (!this.isSupported) return;

    const query = this.pendingQueries.get(tileId);
    if (query) {
      try {
        this.gl.endQuery(this.gl.ANY_SAMPLES_PASSED);
        this.queries.set(tileId, query);
        this.pendingQueries.delete(tileId);
      } catch (error) {
        if (import.meta.env?.DEV) {
          console.warn('[Occlusion Query] Failed to end query:', error);
        }
        this.gl.deleteQuery(query);
        this.pendingQueries.delete(tileId);
      }
    }
  }

  /**
   * Check if query results are available and update visibility
   * @param {string} tileId - Unique tile identifier
   * @returns {boolean|null} True if visible, false if not visible, null if result not available
   */
  checkQueryResult(tileId) {
    if (!this.isSupported) return null;

    const query = this.queries.get(tileId);
    if (!query) return null;

    try {
      const available = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE);
      if (!available) {
        return null; // Result not ready yet
      }

      const result = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT);
      const isVisible = result > 0;

      // Update visibility set
      if (isVisible) {
        this.visibleTiles.add(tileId);
      } else {
        this.visibleTiles.delete(tileId);
      }

      // Clean up query
      this.gl.deleteQuery(query);
      this.queries.delete(tileId);

      return isVisible;
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.warn('[Occlusion Query] Failed to get query result:', error);
      }
      // Clean up on error
      this.gl.deleteQuery(query);
      this.queries.delete(tileId);
      return null;
    }
  }

  /**
   * Check if a tile is known to be visible (from previous frame)
   * @param {string} tileId - Unique tile identifier
   * @returns {boolean} True if tile was visible in previous frame
   */
  isTileVisible(tileId) {
    return this.visibleTiles.has(tileId);
  }

  /**
   * Process all pending queries and update visibility
   * @returns {Map<string, boolean>} Map of tileId -> visibility (only for available results)
   */
  processPendingQueries() {
    const results = new Map();
    const tileIds = Array.from(this.queries.keys());

    for (const tileId of tileIds) {
      const visibility = this.checkQueryResult(tileId);
      if (visibility !== null) {
        results.set(tileId, visibility);
      }
    }

    return results;
  }

  /**
   * Clear all queries and visibility state
   */
  clear() {
    // Clean up all pending queries
    for (const query of this.pendingQueries.values()) {
      try {
        this.gl.endQuery(this.gl.ANY_SAMPLES_PASSED);
        this.gl.deleteQuery(query);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    this.pendingQueries.clear();

    // Clean up all completed queries
    for (const query of this.queries.values()) {
      try {
        this.gl.deleteQuery(query);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    this.queries.clear();

    // Clear visibility set
    this.visibleTiles.clear();
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.clear();
  }
}

/**
 * Create an occlusion query manager for a WebGL context
 * @param {WebGL2RenderingContext|WebGLRenderingContext} gl - WebGL context
 * @returns {OcclusionQueryManager|null} Occlusion query manager or null if not supported
 */
export function createOcclusionQueryManager(gl) {
  if (!(gl instanceof WebGL2RenderingContext)) {
    return null;
  }

  return new OcclusionQueryManager(gl);
}

