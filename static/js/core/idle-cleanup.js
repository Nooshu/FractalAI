/**
 * Idle cleanup using requestIdleCallback
 * Performs low-priority cache trimming and data structure compaction
 * Prevents long sessions from accumulating memory pressure
 */

/**
 * Idle cleanup manager
 */
export class IdleCleanupManager {
  /**
   * @param {Object} options - Configuration options
   * @param {number} options.idleTimeout - Maximum time to wait for idle (default: 5000ms)
   * @param {boolean} options.enabled - Whether idle cleanup is enabled (default: true)
   */
  constructor(options = {}) {
    this.idleTimeout = options.idleTimeout || 5000;
    this.enabled = options.enabled !== false;
    this.cleanupTasks = [];
    this.idleCallbackId = null;
    this.lastCleanupTime = 0;
    this.cleanupInterval = 30000; // Run cleanup every 30 seconds
  }

  /**
   * Register a cleanup task
   * @param {Function} task - Cleanup function to run during idle time
   * @param {number} priority - Priority (lower = higher priority, default: 100)
   */
  registerTask(task, priority = 100) {
    this.cleanupTasks.push({ task, priority });
    // Sort by priority (lower priority = higher priority)
    this.cleanupTasks.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Unregister a cleanup task
   * @param {Function} task - Cleanup function to remove
   */
  unregisterTask(task) {
    const index = this.cleanupTasks.findIndex((t) => t.task === task);
    if (index !== -1) {
      this.cleanupTasks.splice(index, 1);
    }
  }

  /**
   * Start idle cleanup
   */
  start() {
    if (!this.enabled) {
      return;
    }

    this.scheduleCleanup();
  }

  /**
   * Schedule next cleanup
   */
  scheduleCleanup() {
    if (this.idleCallbackId !== null) {
      return; // Already scheduled
    }

    const now = performance.now();
    const timeSinceLastCleanup = now - this.lastCleanupTime;

    // Only schedule if enough time has passed
    if (timeSinceLastCleanup < this.cleanupInterval) {
      const delay = this.cleanupInterval - timeSinceLastCleanup;
      setTimeout(() => this.scheduleCleanup(), delay);
      return;
    }

    // Use requestIdleCallback if available, fallback to setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
      this.idleCallbackId = requestIdleCallback(
        (deadline) => {
          this.idleCallbackId = null;
          this.runCleanup(deadline);
          this.lastCleanupTime = performance.now();
          // Schedule next cleanup
          this.scheduleCleanup();
        },
        { timeout: this.idleTimeout }
      );
    } else {
      // Fallback for browsers without requestIdleCallback
      this.idleCallbackId = setTimeout(() => {
        this.idleCallbackId = null;
        this.runCleanup({ timeRemaining: () => 10 }); // Simulate 10ms available
        this.lastCleanupTime = performance.now();
        this.scheduleCleanup();
      }, this.cleanupInterval);
    }
  }

  /**
   * Run cleanup tasks during idle time
   * @param {IdleDeadline} deadline - Idle deadline from requestIdleCallback
   */
  runCleanup(deadline) {
    if (this.cleanupTasks.length === 0) {
      return;
    }

    let taskIndex = 0;
    while (
      taskIndex < this.cleanupTasks.length &&
      deadline.timeRemaining() > 0
    ) {
      const { task } = this.cleanupTasks[taskIndex];
      try {
        task(deadline);
      } catch (error) {
        console.error('[IdleCleanup] Task error:', error);
      }
      taskIndex++;
    }

    // If we didn't complete all tasks, they'll run next time
  }

  /**
   * Stop idle cleanup
   */
  stop() {
    if (this.idleCallbackId !== null) {
      if (typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(this.idleCallbackId);
      } else {
        clearTimeout(this.idleCallbackId);
      }
      this.idleCallbackId = null;
    }
  }

  /**
   * Force immediate cleanup (not during idle time)
   * Use sparingly, as this blocks the main thread
   */
  forceCleanup() {
    const deadline = {
      timeRemaining: () => 50, // Simulate 50ms available
    };
    this.runCleanup(deadline);
  }
}

// Export singleton instance
export const idleCleanupManager = new IdleCleanupManager();

