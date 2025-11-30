/**
 * Adaptive worker pool for fractal computation
 * Manages worker lifecycle, load balancing, and graceful degradation
 */

import { createTileRequest, isTileResponse } from './tile-protocol.js';
import {
  canUseSharedArrayBuffer,
  createSharedScalarBuffer,
  logSharedArrayBufferStatus,
} from './shared-array-buffer-utils.js';

/**
 * Worker pool manager
 */
export class WorkerPool {
  /**
   * @param {Object} options - Configuration options
   * @param {number} options.minWorkers - Minimum number of workers (default: 1)
   * @param {number} options.maxWorkers - Maximum number of workers (default: min(4, hardwareConcurrency - 1))
   * @param {string} options.workerScript - Path to worker script (default: 'static/js/workers/fractal-worker.js')
   * @param {number} options.performanceWindow - Number of recent tasks to track for performance (default: 10)
   * @param {number} options.overheadThreshold - Overhead threshold in ms to consider shrinking pool (default: 50)
   */
  constructor(options = {}) {
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const defaultMaxWorkers = Math.min(4, Math.max(1, hardwareConcurrency - 1));

    this.minWorkers = options.minWorkers || 1;
    this.maxWorkers = options.maxWorkers || defaultMaxWorkers;
    this.workerScript = options.workerScript || 'static/js/workers/fractal-worker.js';
    this.performanceWindow = options.performanceWindow || 10;
    this.overheadThreshold = options.overheadThreshold || 50;

    this.workers = [];
    this.workerStates = new Map(); // Track worker availability
    this.pendingTasks = new Map(); // tileId -> { resolve, reject, startTime, worker }
    this.performanceHistory = []; // Track recent task performance
    this.currentWorkerCount = 0;
    this.isShuttingDown = false;
    this.useSharedArrayBuffer = false; // Whether to use SharedArrayBuffer

    // Check if SharedArrayBuffer can be used
    this.useSharedArrayBuffer = canUseSharedArrayBuffer();
    if (this.useSharedArrayBuffer) {
      logSharedArrayBufferStatus();
    }

    // Initialize worker pool
    this.resize(this.maxWorkers);
  }

  /**
   * Resize the worker pool
   * @param {number} targetCount - Target number of workers
   */
  resize(targetCount) {
    const clampedCount = Math.max(this.minWorkers, Math.min(this.maxWorkers, targetCount));

    if (clampedCount === this.currentWorkerCount) {
      return;
    }

    if (clampedCount > this.currentWorkerCount) {
      // Add workers
      for (let i = this.currentWorkerCount; i < clampedCount; i++) {
        this.addWorker();
      }
    } else {
      // Remove workers (gracefully)
      const toRemove = this.currentWorkerCount - clampedCount;
      for (let i = 0; i < toRemove; i++) {
        this.removeWorker();
      }
    }

    this.currentWorkerCount = clampedCount;
  }

  /**
   * Add a new worker to the pool
   */
  addWorker() {
    try {
      const worker = new Worker(this.workerScript, { type: 'module' });
      const workerId = this.workers.length;

      worker.addEventListener('message', (event) => {
        this.handleWorkerMessage(workerId, event.data);
      });

      worker.addEventListener('error', (error) => {
        console.error(`Worker ${workerId} error:`, error);
        this.handleWorkerError(workerId);
      });

      this.workers.push(worker);
      this.workerStates.set(workerId, { available: true, taskCount: 0 });
    } catch (error) {
      console.error('Failed to create worker:', error);
      // Graceful degradation: continue with fewer workers
    }
  }

  /**
   * Remove a worker from the pool (gracefully)
   */
  removeWorker() {
    if (this.workers.length === 0) return;

    const workerId = this.workers.length - 1;
    const worker = this.workers[workerId];

    // Cancel any pending tasks for this worker
    for (const [tileId, task] of this.pendingTasks.entries()) {
      if (task.worker === workerId) {
        this.pendingTasks.delete(tileId);
        task.reject(new Error('Worker removed from pool'));
      }
    }

    // Terminate the worker
    worker.terminate();
    this.workers.pop();
    this.workerStates.delete(workerId);
  }

  /**
   * Handle message from worker
   * @param {number} workerId - Worker identifier
   * @param {*} message - Message from worker
   */
  handleWorkerMessage(workerId, message) {
    if (isTileResponse(message)) {
      const task = this.pendingTasks.get(message.tileId);
      if (task) {
        const totalTime = performance.now() - task.startTime;
        this.recordPerformance(totalTime, message.metadata.computationTime);

        // If using SharedArrayBuffer, read data directly from shared memory
        if (task.sharedBuffer && message.useSharedBuffer) {
          // Data is already in shared memory, create response with view
          const response = {
            ...message,
            data: task.sharedBuffer.view, // Direct access to shared memory
          };
          task.resolve(response);
        } else {
          // Regular response with copied data
          task.resolve(message);
        }

        this.pendingTasks.delete(message.tileId);
        this.workerStates.get(workerId).available = true;
        this.workerStates.get(workerId).taskCount--;
      }
    }
  }

  /**
   * Handle worker error
   * @param {number} workerId - Worker identifier
   */
  handleWorkerError(workerId) {
    // Mark worker as unavailable and cancel its tasks
    const state = this.workerStates.get(workerId);
    if (state) {
      state.available = false;
    }

    // Reject pending tasks for this worker
    for (const [tileId, task] of this.pendingTasks.entries()) {
      if (task.worker === workerId) {
        this.pendingTasks.delete(tileId);
        task.reject(new Error('Worker error'));
      }
    }

    // Try to replace the worker if we're not shutting down
    if (!this.isShuttingDown && this.workers.length < this.maxWorkers) {
      this.removeWorker(); // Remove the broken worker
      this.addWorker(); // Add a new one
    }
  }

  /**
   * Record performance metrics for adaptive sizing
   * @param {number} totalTime - Total time including overhead
   * @param {number} computationTime - Pure computation time
   */
  recordPerformance(totalTime, computationTime) {
    const overhead = totalTime - computationTime;
    this.performanceHistory.push({ totalTime, computationTime, overhead });

    // Keep only recent history
    if (this.performanceHistory.length > this.performanceWindow) {
      this.performanceHistory.shift();
    }

    // Adaptive sizing: if overhead is consistently high, consider shrinking
    if (this.performanceHistory.length >= this.performanceWindow) {
      const avgOverhead =
        this.performanceHistory.reduce((sum, p) => sum + p.overhead, 0) /
        this.performanceHistory.length;
      if (avgOverhead > this.overheadThreshold && this.currentWorkerCount > this.minWorkers) {
        // Shrink pool by 1
        this.resize(this.currentWorkerCount - 1);
      }
    }
  }

  /**
   * Find an available worker
   * @returns {number|null} Worker ID or null if none available
   */
  findAvailableWorker() {
    // Find worker with least tasks
    let bestWorker = null;
    let minTasks = Infinity;

    for (let i = 0; i < this.workers.length; i++) {
      const state = this.workerStates.get(i);
      if (state && state.available) {
        if (state.taskCount < minTasks) {
          minTasks = state.taskCount;
          bestWorker = i;
        }
      }
    }

    return bestWorker;
  }

  /**
   * Submit a tile computation task
   * @param {string} tileId - Unique tile identifier
   * @param {number} x - Tile X coordinate
   * @param {number} y - Tile Y coordinate
   * @param {number} width - Tile width
   * @param {number} height - Tile height
   * @param {Object} params - Fractal parameters
   * @param {string} fractalType - Fractal type
   * @returns {Promise<Object>} Promise resolving to tile response
   */
  async computeTile(tileId, x, y, width, height, params, fractalType) {
    if (this.isShuttingDown) {
      return Promise.reject(new Error('Worker pool is shutting down'));
    }

    // Find available worker
    const workerId = this.findAvailableWorker();
    if (workerId === null) {
      return Promise.reject(new Error('No available workers'));
    }

    // Create request
    const request = createTileRequest(tileId, x, y, width, height, params, fractalType);

    // Create SharedArrayBuffer for zero-copy communication if available
    let sharedBuffer = null;
    if (this.useSharedArrayBuffer) {
      sharedBuffer = createSharedScalarBuffer(width, height);
      if (sharedBuffer) {
        // Add shared buffer to request
        request.sharedBuffer = sharedBuffer.buffer;
        request.useSharedBuffer = true;
      }
    }

    // Create promise
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      this.pendingTasks.set(tileId, {
        resolve,
        reject,
        startTime,
        worker: workerId,
        sharedBuffer, // Store reference to shared buffer
      });

      // Update worker state
      const state = this.workerStates.get(workerId);
      state.taskCount++;

      // Send request to worker
      try {
        if (sharedBuffer) {
          // SharedArrayBuffer is shared, not transferred (zero-copy)
          // The buffer reference is passed directly
          this.workers[workerId].postMessage(request);
        } else {
          // Regular message (data will be copied)
          this.workers[workerId].postMessage(request);
        }
      } catch (error) {
        this.pendingTasks.delete(tileId);
        state.taskCount--;
        reject(error);
      }
    });
  }

  /**
   * Cancel pending tile computations
   * @param {string[]} tileIds - Array of tile IDs to cancel. If empty, cancels all pending tasks.
   */
  cancelTiles(tileIds) {
    if (tileIds.length === 0) {
      // Cancel all pending tasks
      for (const [, task] of this.pendingTasks.entries()) {
        // Update worker state
        const state = this.workerStates.get(task.worker);
        if (state) {
          state.taskCount--;
        }

        // Reject the promise
        task.reject(new Error('Tile computation cancelled'));
      }
      this.pendingTasks.clear();
    } else {
      // Cancel specific tiles
      for (const tileId of tileIds) {
        const task = this.pendingTasks.get(tileId);
        if (task) {
          // Mark task as cancelled
          this.pendingTasks.delete(tileId);

          // Update worker state
          const state = this.workerStates.get(task.worker);
          if (state) {
            state.taskCount--;
          }

          // Reject the promise
          task.reject(new Error('Tile computation cancelled'));
        }
      }
    }
  }

  /**
   * Get current worker count
   * @returns {number}
   */
  getWorkerCount() {
    return this.currentWorkerCount;
  }

  /**
   * Get pending task count
   * @returns {number}
   */
  getPendingTaskCount() {
    return this.pendingTasks.size;
  }

  /**
   * Shutdown the worker pool
   */
  shutdown() {
    this.isShuttingDown = true;

    // Cancel all pending tasks
    const tileIds = Array.from(this.pendingTasks.keys());
    this.cancelTiles(tileIds);

    // Terminate all workers
    for (const worker of this.workers) {
      worker.terminate();
    }

    this.workers = [];
    this.workerStates.clear();
    this.pendingTasks.clear();
    this.currentWorkerCount = 0;
  }
}
