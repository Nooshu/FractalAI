/**
 * Coordinate Display Module
 * Moderate complexity module for managing coordinate display and copy functionality
 */

import { getElement } from '../core/dom-cache.js';
import { appState } from '../core/app-state.js';

// Lazy load debug-display to avoid mixed static/dynamic import warnings
// Only load when debug section is actually used
let updateDebugDisplayFn = null;
async function getUpdateDebugDisplay() {
  if (!updateDebugDisplayFn) {
    try {
      const module = await import('./debug-display.js');
      updateDebugDisplayFn = module.updateDebugDisplay;
    } catch (error) {
      // Provide a no-op if module fails to load
      updateDebugDisplayFn = () => {};
    }
  }
  return updateDebugDisplayFn;
}

/**
 * Format a number with appropriate precision
 * @param {number} value - Value to format
 * @param {number} precision - Decimal places (default: 3 for zoom, 4 for offset)
 * @returns {number} Formatted value
 */
function formatCoordinate(value, precision = 3) {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Update main coordinate display
 * Also dispatches fractal-updated event for other components (like EXIF editor) to listen to
 * @param {Object} params - Fractal parameters with zoom and offset
 */
export function updateCoordinateDisplay(params) {
  if (!params) return;

  const coordZoom = getElement('coord-zoom');
  const coordOffsetX = getElement('coord-offset-x');
  const coordOffsetY = getElement('coord-offset-y');

  if (coordZoom && coordOffsetX && coordOffsetY) {
    // Round to reasonable precision for display
    coordZoom.textContent = formatCoordinate(params.zoom, 3);
    coordOffsetX.textContent = formatCoordinate(params.offset.x, 4);
    coordOffsetY.textContent = formatCoordinate(params.offset.y, 4);
  }

  // Dispatch fractal-updated event so other components (like EXIF editor) can update
  const currentFractalType = appState.getCurrentFractalType();
  window.dispatchEvent(
    new CustomEvent('fractal-updated', {
      detail: { fractalType: currentFractalType, params },
    })
  );
}

/**
 * Setup coordinate copy functionality
 * @param {Function} getCurrentFractalType - Function to get current fractal type
 * @param {Function} getParams - Function to get current parameters
 */
export function setupCoordinateCopy(getCurrentFractalType, getParams) {
  const copyBtn = getElement('copy-coords-btn');
  if (!copyBtn) return;

  copyBtn.addEventListener('click', () => {
    const params = getParams();
    const fractalType = getCurrentFractalType();

    if (!params || !fractalType) return;

    const zoom = formatCoordinate(params.zoom, 3);
    const offsetX = formatCoordinate(params.offset.x, 4);
    const offsetY = formatCoordinate(params.offset.y, 4);

    const coordsText = `fractal: ${fractalType}, zoom: ${zoom}, offsetX: ${offsetX}, offsetY: ${offsetY}`;

    navigator.clipboard
      .writeText(coordsText)
      .then(() => {
        // Show feedback
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>Copied!';
        copyBtn.style.background = 'var(--accent-blue)';

        setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.style.background = '';
        }, 2000);
      })
      .catch((err) => {
        console.error('Failed to copy coordinates:', err);
        alert('Failed to copy coordinates. Please copy manually:\n' + coordsText);
      });
  });
}

/**
 * Wrapper function to update both coordinate and debug displays
 * Also dispatches fractal-updated event for other components (like EXIF editor) to listen to
 * @param {Function} getParams - Function to get params object (optional, uses appState if not provided)
 * @param {Function} getCurrentFractalType - Function to get current fractal type (optional, uses appState if not provided)
 */
export function updateCoordinateAndDebugDisplay(getParams, getCurrentFractalType) {
  const params = getParams ? getParams() : appState.getParams();
  const currentFractalType = getCurrentFractalType
    ? getCurrentFractalType()
    : appState.getCurrentFractalType();
  updateCoordinateDisplay(params);

  // Only load and call debug display if debug section is visible (fire-and-forget)
  const debugSection = document.querySelector('[data-section="debug"]')?.parentElement;
  if (debugSection && !debugSection.classList.contains('debug-hidden')) {
    // Load and update debug display asynchronously without blocking
    getUpdateDebugDisplay().then((updateDebugDisplay) => {
      if (updateDebugDisplay) {
        updateDebugDisplay(currentFractalType, params);
      }
    }).catch(() => {
      // Silently fail if debug display can't be loaded
    });
  }

  // Dispatch fractal-updated event so other components (like EXIF editor) can update
  window.dispatchEvent(
    new CustomEvent('fractal-updated', {
      detail: { fractalType: currentFractalType, params },
    })
  );
}
