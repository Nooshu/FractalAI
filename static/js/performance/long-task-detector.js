/**
 * Long-task detection using PerformanceObserver API
 * Detects blocking operations that exceed 50ms (threshold for "long tasks")
 * Helps identify performance issues and main-thread blocking
 */

/**
 * Long-task detector
 */
export class LongTaskDetector {
  /**
   * @param {Object} options - Configuration options
   * @param {Function} options.onLongTask - Callback when long task detected
   * @param {number} options.threshold - Minimum duration to consider a long task (default: 50ms)
   * @param {boolean} options.enabled - Whether detection is enabled (default: true)
   */
  constructor(options = {}) {
    this.onLongTask = options.onLongTask || null;
    this.threshold = options.threshold || 50;
    this.enabled = options.enabled !== false;
    this.observer = null;
    this.longTasks = [];
    this.maxLongTasks = 100; // Keep last 100 long tasks
  }

  /**
   * Start detecting long tasks
   */
  start() {
    if (!this.enabled) {
      return;
    }

    // Check if PerformanceObserver is supported
    if (typeof PerformanceObserver === 'undefined') {
      console.warn('[LongTaskDetector] PerformanceObserver not supported');
      return;
    }

    // Check if 'longtask' entry type is supported before attempting to observe
    // This prevents browser warnings about unsupported entry types
    const supportedEntryTypes = PerformanceObserver.supportedEntryTypes;
    if (!supportedEntryTypes || !supportedEntryTypes.includes('longtask')) {
      // Silently fail - longtask detection is not critical and not supported in this browser
      return;
    }

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handleLongTask(entry);
        }
      });

      // Observe longtask entries (50ms+ blocking operations)
      this.observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      // longtask entry type may not be supported in all browsers
      if (error.name === 'TypeError' || error.message.includes('entryTypes')) {
        // Silently fail - longtask detection is not critical
        this.observer = null;
        return;
      }
      console.warn('[LongTaskDetector] Failed to start:', error);
      this.observer = null;
    }
  }

  /**
   * Handle a detected long task
   * @param {PerformanceEntry} entry - Long task entry
   */
  handleLongTask(entry) {
    const duration = entry.duration;
    if (duration < this.threshold) {
      return;
    }

    const longTask = {
      duration,
      startTime: entry.startTime,
      name: entry.name,
      attribution: entry.attribution || [],
    };

    this.longTasks.push(longTask);

    // Keep only recent long tasks
    if (this.longTasks.length > this.maxLongTasks) {
      this.longTasks.shift();
    }

    // Call callback if provided
    if (this.onLongTask) {
      this.onLongTask(longTask);
    }

    // Log warning in development
    if (import.meta.env?.DEV) {
      console.warn(
        `%c[Long Task Detected]%c ${duration.toFixed(2)}ms blocking operation`,
        'color: #FF5722; font-weight: bold;',
        'color: inherit;'
      );
    }
  }

  /**
   * Stop detecting long tasks
   */
  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * Get all detected long tasks
   * @returns {Array} Array of long task entries
   */
  getLongTasks() {
    return [...this.longTasks];
  }

  /**
   * Get recent long tasks (within last N seconds)
   * @param {number} seconds - Number of seconds to look back
   * @returns {Array} Array of recent long tasks
   */
  getRecentLongTasks(seconds = 5) {
    const now = performance.now();
    const cutoff = now - seconds * 1000;
    return this.longTasks.filter((task) => task.startTime >= cutoff);
  }

  /**
   * Clear all recorded long tasks
   */
  clear() {
    this.longTasks = [];
  }

  /**
   * Get statistics about long tasks
   * @returns {Object} Statistics object
   */
  getStats() {
    if (this.longTasks.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0,
      };
    }

    const durations = this.longTasks.map((task) => task.duration);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;

    return {
      count: this.longTasks.length,
      avgDuration: avg,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
    };
  }
}
