/**
 * Feature detection for worker-based optimizations
 * Checks browser compatibility for Web Workers and related APIs
 */

/**
 * Check if Web Workers are supported
 * @returns {boolean}
 */
export function supportsWorkers() {
  return typeof Worker !== 'undefined';
}

/**
 * Check if SharedArrayBuffer is supported
 * @returns {boolean}
 */
export function supportsSharedArrayBuffer() {
  return typeof SharedArrayBuffer !== 'undefined';
}

/**
 * Check if OffscreenCanvas is supported
 * @returns {boolean}
 */
export function supportsOffscreenCanvas() {
  return typeof OffscreenCanvas !== 'undefined';
}

/**
 * Get hardware concurrency (number of CPU cores)
 * @returns {number} Number of cores, or 4 as fallback
 */
export function getHardwareConcurrency() {
  return navigator.hardwareConcurrency || 4;
}

/**
 * Check if worker optimizations should be enabled
 * This checks for basic worker support and reasonable hardware
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireSharedArrayBuffer - Require SharedArrayBuffer (default: false)
 * @param {number} options.minCores - Minimum CPU cores required (default: 2)
 * @returns {boolean}
 */
export function shouldEnableWorkerOptimizations(options = {}) {
  const {
    requireSharedArrayBuffer = false,
    minCores = 2,
  } = options;

  // Basic requirement: Workers must be supported
  if (!supportsWorkers()) {
    return false;
  }

  // Optional: Require SharedArrayBuffer (for future optimizations)
  if (requireSharedArrayBuffer && !supportsSharedArrayBuffer()) {
    return false;
  }

  // Check minimum CPU cores (avoid overhead on single-core devices)
  const cores = getHardwareConcurrency();
  if (cores < minCores) {
    return false;
  }

  return true;
}

/**
 * Get worker optimization capabilities
 * @returns {Object} Capabilities object
 */
export function getWorkerCapabilities() {
  return {
    workers: supportsWorkers(),
    sharedArrayBuffer: supportsSharedArrayBuffer(),
    offscreenCanvas: supportsOffscreenCanvas(),
    hardwareConcurrency: getHardwareConcurrency(),
    recommended: shouldEnableWorkerOptimizations(),
  };
}

