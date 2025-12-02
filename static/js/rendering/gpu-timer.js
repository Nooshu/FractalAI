/**
 * GPU Timer Query Module
 * Provides accurate GPU timing using EXT_disjoint_timer_query (WebGL1) and
 * EXT_disjoint_timer_query_webgl2 (WebGL2) extensions
 * Falls back to CPU timing if extensions are not available
 */

/**
 * GPU Timer Query Manager
 * Handles GPU timing queries with support for both WebGL1 and WebGL2 extensions
 */
export class GPUTimer {
  /**
   * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - WebGL context
   * @param {Object} capabilities - WebGL capabilities from detectWebGLCapabilities
   */
  constructor(gl, capabilities) {
    this.gl = gl;
    this.capabilities = capabilities;
    this.isAvailable = false;
    this.timerExt = null;
    this.activeQueries = new Map();
    this.completedQueries = new Map();
    this.queryCounter = 0;
    this.maxPendingQueries = 10; // Limit pending queries to avoid memory issues

    // Try to get timer query extension (WebGL2 first, then WebGL1)
    if (capabilities?.features?.timerQuery) {
      if (capabilities.features.timerQuery.webgl2) {
        this.timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      } else if (capabilities.features.timerQuery.webgl1) {
        this.timerExt = gl.getExtension('EXT_disjoint_timer_query');
      }

      if (this.timerExt) {
        this.isAvailable = true;
        // Check if the extension is actually functional
        try {
          // Test query creation
          const testQuery = this.createQuery();
          if (testQuery) {
            this.deleteQuery(testQuery);
          }
        } catch (e) {
          console.warn('[GPU Timer] Extension available but not functional:', e);
          this.isAvailable = false;
          this.timerExt = null;
        }
      }
    }

    if (this.isAvailable) {
      console.log('[GPU Timer] GPU timing enabled via', 
        capabilities.features.timerQuery.webgl2 ? 'EXT_disjoint_timer_query_webgl2' : 'EXT_disjoint_timer_query');
    } else {
      console.log('[GPU Timer] GPU timing not available, falling back to CPU timing');
    }
  }

  /**
   * Create a timer query object
   * @returns {WebGLTimerQueryEXT|null} Query object or null if not available
   */
  createQuery() {
    if (!this.isAvailable || !this.timerExt) return null;

    try {
      if (this.timerExt.createQueryEXT) {
        return this.timerExt.createQueryEXT();
      }
      // WebGL2 version uses different method name
      if (this.timerExt.createQuery) {
        return this.timerExt.createQuery();
      }
    } catch (e) {
      console.warn('[GPU Timer] Failed to create query:', e);
    }
    return null;
  }

  /**
   * Delete a timer query object
   * @param {WebGLTimerQueryEXT} query - Query object to delete
   */
  deleteQuery(query) {
    if (!this.isAvailable || !this.timerExt || !query) return;

    try {
      if (this.timerExt.deleteQueryEXT) {
        this.timerExt.deleteQueryEXT(query);
      } else if (this.timerExt.deleteQuery) {
        this.timerExt.deleteQuery(query);
      }
    } catch (e) {
      console.warn('[GPU Timer] Failed to delete query:', e);
    }
  }

  /**
   * Begin a timing query
   * @param {string} label - Optional label for the query (for debugging)
   * @returns {number} Query ID (for tracking) or -1 if not available
   */
  beginQuery(label = '') {
    if (!this.isAvailable || !this.timerExt) return -1;

    // Clean up old completed queries if we have too many pending
    if (this.activeQueries.size >= this.maxPendingQueries) {
      this.pollQueries();
    }

    const query = this.createQuery();
    if (!query) return -1;

    const queryId = this.queryCounter++;
    
    try {
      if (this.timerExt.beginQueryEXT) {
        this.timerExt.beginQueryEXT(this.timerExt.TIME_ELAPSED_EXT, query);
      } else if (this.timerExt.beginQuery) {
        this.timerExt.beginQuery(this.timerExt.TIME_ELAPSED_EXT, query);
      }

      this.activeQueries.set(queryId, {
        query,
        label,
        startTime: performance.now(), // Fallback CPU time
      });

      return queryId;
    } catch (e) {
      console.warn('[GPU Timer] Failed to begin query:', e);
      this.deleteQuery(query);
      return -1;
    }
  }

  /**
   * End a timing query
   * @param {number} queryId - Query ID returned from beginQuery
   */
  endQuery(queryId) {
    if (!this.isAvailable || !this.timerExt || queryId === -1) return;

    const queryData = this.activeQueries.get(queryId);
    if (!queryData) return;

    try {
      if (this.timerExt.endQueryEXT) {
        this.timerExt.endQueryEXT(this.timerExt.TIME_ELAPSED_EXT);
      } else if (this.timerExt.endQuery) {
        this.timerExt.endQuery(this.timerExt.TIME_ELAPSED_EXT);
      }

      // Move to completed queries for polling
      this.completedQueries.set(queryId, queryData);
    } catch (e) {
      console.warn('[GPU Timer] Failed to end query:', e);
      this.activeQueries.delete(queryId);
      this.deleteQuery(queryData.query);
    }
  }

  /**
   * Poll for completed queries and return their results
   * @returns {Array<{queryId: number, gpuTime: number, cpuTime: number, label: string}>} Array of completed query results
   */
  pollQueries() {
    if (!this.isAvailable || !this.timerExt) return [];

    const results = [];
    const gl = this.gl;

    // Check for disjoint events (context lost or timer reset)
    let disjoint = false;
    if (this.timerExt.getParameterEXT) {
      try {
        disjoint = gl.getParameter(this.timerExt.GPU_DISJOINT_EXT);
      } catch (_e) {
        // Parameter not available
      }
    }

    // Process completed queries
    for (const [queryId, queryData] of this.completedQueries.entries()) {
      const { query, label, startTime } = queryData;
      let gpuTime = null;
      let available = false;

      try {
        // Check if query result is available
        if (this.timerExt.getQueryObjectEXT) {
          available = this.timerExt.getQueryObjectEXT(query, this.timerExt.QUERY_RESULT_AVAILABLE_EXT);
          if (available) {
            gpuTime = this.timerExt.getQueryObjectEXT(query, this.timerExt.QUERY_RESULT_EXT);
          }
        } else if (this.timerExt.getQueryObject) {
          available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
          if (available) {
            gpuTime = gl.getQueryParameter(query, gl.QUERY_RESULT);
          }
        }
      } catch (e) {
        console.warn('[GPU Timer] Failed to poll query:', e);
        available = true; // Mark as available to clean up
      }

      if (available) {
        // Convert nanoseconds to milliseconds
        const gpuTimeMs = gpuTime !== null ? gpuTime / 1000000 : null;
        const cpuTimeMs = performance.now() - startTime;

        results.push({
          queryId,
          gpuTime: gpuTimeMs,
          cpuTime: cpuTimeMs,
          label,
          disjoint,
        });

        // Clean up
        this.completedQueries.delete(queryId);
        this.deleteQuery(query);
      }
    }

    // If disjoint event occurred, clear all pending queries
    if (disjoint) {
      console.warn('[GPU Timer] GPU disjoint event detected, clearing pending queries');
      for (const [_queryId, queryData] of this.activeQueries.entries()) {
        this.deleteQuery(queryData.query);
      }
      for (const [_queryId, queryData] of this.completedQueries.entries()) {
        this.deleteQuery(queryData.query);
      }
      this.activeQueries.clear();
      this.completedQueries.clear();
    }

    return results;
  }

  /**
   * Get the most recent completed query result
   * @returns {{gpuTime: number, cpuTime: number, label: string}|null} Most recent result or null
   */
  getLatestResult() {
    const results = this.pollQueries();
    return results.length > 0 ? results[results.length - 1] : null;
  }

  /**
   * Check if GPU timing is available
   * @returns {boolean} True if GPU timing is available
   */
  isGPUTimingAvailable() {
    return this.isAvailable;
  }

  /**
   * Clean up all queries and resources
   */
  dispose() {
    // Clean up active queries
    for (const [_queryId, queryData] of this.activeQueries.entries()) {
      this.deleteQuery(queryData.query);
    }
    this.activeQueries.clear();

    // Clean up completed queries
    for (const [_queryId, queryData] of this.completedQueries.entries()) {
      this.deleteQuery(queryData.query);
    }
    this.completedQueries.clear();

    this.timerExt = null;
    this.isAvailable = false;
  }
}

/**
 * Create a GPU timer instance
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - WebGL context
 * @param {Object} capabilities - WebGL capabilities from detectWebGLCapabilities
 * @returns {GPUTimer} GPU timer instance
 */
export function createGPUTimer(gl, capabilities) {
  return new GPUTimer(gl, capabilities);
}

