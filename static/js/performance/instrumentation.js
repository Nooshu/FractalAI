/**
 * Performance instrumentation and metrics collection
 * Lightweight counters for hot paths, guarded by feature flags
 */

/**
 * Performance instrumentation manager
 */
export class PerformanceInstrumentation {
  /**
   * @param {Object} options - Configuration options
   * @param {boolean} options.enabled - Whether instrumentation is enabled (default: true in dev)
   */
  constructor(options = {}) {
    this.enabled = options.enabled !== undefined 
      ? options.enabled 
      : (import.meta.env?.DEV || false);
    this.metrics = {
      renderCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      workerTasks: 0,
      workerTaskTime: 0,
      frameTime: [],
      invalidationCount: 0,
    };
    this.maxFrameTimeSamples = 100;
  }

  /**
   * Record a render operation
   */
  recordRender() {
    if (!this.enabled) return;
    this.metrics.renderCount++;
  }

  /**
   * Record a cache hit
   */
  recordCacheHit() {
    if (!this.enabled) return;
    this.metrics.cacheHits++;
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss() {
    if (!this.enabled) return;
    this.metrics.cacheMisses++;
  }

  /**
   * Record a worker task
   * @param {number} duration - Task duration in milliseconds
   */
  recordWorkerTask(duration) {
    if (!this.enabled) return;
    this.metrics.workerTasks++;
    this.metrics.workerTaskTime += duration;
  }

  /**
   * Record frame time
   * @param {number} frameTime - Frame time in milliseconds
   */
  recordFrameTime(frameTime) {
    if (!this.enabled) return;
    this.metrics.frameTime.push(frameTime);
    if (this.metrics.frameTime.length > this.maxFrameTimeSamples) {
      this.metrics.frameTime.shift();
    }
  }

  /**
   * Record an invalidation (unnecessary re-render)
   */
  recordInvalidation() {
    if (!this.enabled) return;
    this.metrics.invalidationCount++;
  }

  /**
   * Get all metrics
   * @returns {Object} Metrics object
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.cacheHits + this.metrics.cacheMisses > 0
        ? this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)
        : 0,
      avgWorkerTaskTime: this.metrics.workerTasks > 0
        ? this.metrics.workerTaskTime / this.metrics.workerTasks
        : 0,
      avgFrameTime: this.metrics.frameTime.length > 0
        ? this.metrics.frameTime.reduce((a, b) => a + b, 0) / this.metrics.frameTime.length
        : 0,
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      renderCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      workerTasks: 0,
      workerTaskTime: 0,
      frameTime: [],
      invalidationCount: 0,
    };
  }

  /**
   * Log metrics to console
   */
  logMetrics() {
    if (!this.enabled) return;
    const metrics = this.getMetrics();
    console.log('%c[Performance Metrics]', 'color: #9C27B0; font-weight: bold;', metrics);
  }
}

// Export singleton instance
export const performanceInstrumentation = new PerformanceInstrumentation();

