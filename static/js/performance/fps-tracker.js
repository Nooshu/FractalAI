/**
 * FPS Tracking Module
 * Simple, isolated functionality for tracking and displaying frame rate
 */

// Internal state
let frameCount = 0;
let fps = 0;
let fpsIntervalId = null;
let fpsElement = null;

/**
 * Initialize the FPS tracker
 * @param {string|HTMLElement} elementIdOrElement - ID of the FPS display element or the element itself
 */
export function initFPSTracker(elementIdOrElement = 'fps') {
  if (typeof elementIdOrElement === 'string') {
    fpsElement = document.getElementById(elementIdOrElement);
  } else {
    fpsElement = elementIdOrElement;
  }
  return fpsElement;
}

/**
 * Start FPS tracking interval
 * Calculates and displays FPS once per second
 */
export function startFPSTracking() {
  // Clear any existing interval
  if (fpsIntervalId !== null) {
    clearInterval(fpsIntervalId);
  }

  // Reset frame count
  frameCount = 0;

  // Calculate and display FPS once per second
  fpsIntervalId = setInterval(() => {
    fps = frameCount;
    frameCount = 0;
    if (fpsElement) {
      fpsElement.textContent = `FPS: ${fps}`;
    }
  }, 1000);
}

/**
 * Stop FPS tracking
 */
export function stopFPSTracking() {
  if (fpsIntervalId !== null) {
    clearInterval(fpsIntervalId);
    fpsIntervalId = null;
  }
}

/**
 * Increment frame counter
 * Call this once per frame in the animation loop
 */
export function incrementFrameCount() {
  frameCount++;
}

/**
 * Get current FPS value
 * @returns {number} Current FPS
 */
export function getFPS() {
  return fps;
}

/**
 * Get current frame count (since last reset)
 * @returns {number} Current frame count
 */
export function getFrameCount() {
  return frameCount;
}
