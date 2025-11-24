/**
 * Coordinate Display Module
 * Moderate complexity module for managing coordinate display and copy functionality
 */

import { getElement } from '../core/dom-cache.js';
import { updateDebugDisplay } from './debug-display.js';
import { appState } from '../core/app-state.js';

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

    navigator.clipboard.writeText(coordsText).then(() => {
      // Show feedback
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>Copied!';
      copyBtn.style.background = 'var(--accent-blue)';

      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.style.background = '';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy coordinates:', err);
      alert('Failed to copy coordinates. Please copy manually:\n' + coordsText);
    });
  });
}

/**
 * Wrapper function to update both coordinate and debug displays
 * @param {Function} getParams - Function to get params object (optional, uses appState if not provided)
 * @param {Function} getCurrentFractalType - Function to get current fractal type (optional, uses appState if not provided)
 */
export function updateCoordinateAndDebugDisplay(getParams, getCurrentFractalType) {
  const params = getParams ? getParams() : appState.getParams();
  const currentFractalType = getCurrentFractalType ? getCurrentFractalType() : appState.getCurrentFractalType();
  updateCoordinateDisplay(params);
  updateDebugDisplay(currentFractalType, params);
}

