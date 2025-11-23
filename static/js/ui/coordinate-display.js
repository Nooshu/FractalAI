/**
 * Coordinate Display Module
 * Moderate complexity module for managing coordinate display and copy functionality
 * Handles both main coordinate display and debug display
 */

import { getElement } from '../core/dom-cache.js';

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
 * Update debug coordinate display
 * @param {string} fractalType - Current fractal type
 * @param {Object} params - Fractal parameters with zoom and offset
 */
export function updateDebugDisplay(fractalType, params) {
  if (!params) return;

  const debugFractalName = document.getElementById('debug-fractal-name');
  const debugZoom = document.getElementById('debug-zoom');
  const debugOffsetX = document.getElementById('debug-offset-x');
  const debugOffsetY = document.getElementById('debug-offset-y');

  if (debugFractalName) {
    debugFractalName.textContent = fractalType || '-';
  }
  if (debugZoom) {
    debugZoom.textContent = formatCoordinate(params.zoom, 3);
  }
  if (debugOffsetX) {
    debugOffsetX.textContent = formatCoordinate(params.offset.x, 4);
  }
  if (debugOffsetY) {
    debugOffsetY.textContent = formatCoordinate(params.offset.y, 4);
  }
}

/**
 * Update both coordinate and debug displays
 * @param {string} fractalType - Current fractal type
 * @param {Object} params - Fractal parameters with zoom and offset
 */
export function updateAllDisplays(fractalType, params) {
  updateCoordinateDisplay(params);
  updateDebugDisplay(fractalType, params);
}

/**
 * Show copy feedback on a button
 * @param {HTMLElement} button - Button element to show feedback on
 * @param {number} duration - Duration in milliseconds (default: 1000)
 */
function showCopyFeedback(button, duration = 1000) {
  const originalHTML = button.innerHTML;
  button.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>';
  button.style.color = 'var(--accent-blue)';

  setTimeout(() => {
    button.innerHTML = originalHTML;
    button.style.color = '';
  }, duration);
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
 * Setup debug copy buttons
 * @param {Function} getCurrentFractalType - Function to get current fractal type
 * @param {Function} getParams - Function to get current parameters
 */
export function setupDebugCopy(getCurrentFractalType, getParams) {
  const copyFractalName = document.getElementById('debug-copy-fractal-name');
  const copyZoom = document.getElementById('debug-copy-zoom');
  const copyOffsetX = document.getElementById('debug-copy-offset-x');
  const copyOffsetY = document.getElementById('debug-copy-offset-y');
  const copyAll = document.getElementById('debug-copy-all');

  if (copyFractalName) {
    copyFractalName.addEventListener('click', () => {
      const fractalType = getCurrentFractalType();
      navigator.clipboard.writeText(fractalType || '').then(() => {
        showCopyFeedback(copyFractalName);
      });
    });
  }

  if (copyZoom) {
    copyZoom.addEventListener('click', () => {
      const params = getParams();
      if (params) {
        const zoom = formatCoordinate(params.zoom, 3);
        navigator.clipboard.writeText(zoom.toString()).then(() => {
          showCopyFeedback(copyZoom);
        });
      }
    });
  }

  if (copyOffsetX) {
    copyOffsetX.addEventListener('click', () => {
      const params = getParams();
      if (params) {
        const offsetX = formatCoordinate(params.offset.x, 4);
        navigator.clipboard.writeText(offsetX.toString()).then(() => {
          showCopyFeedback(copyOffsetX);
        });
      }
    });
  }

  if (copyOffsetY) {
    copyOffsetY.addEventListener('click', () => {
      const params = getParams();
      if (params) {
        const offsetY = formatCoordinate(params.offset.y, 4);
        navigator.clipboard.writeText(offsetY.toString()).then(() => {
          showCopyFeedback(copyOffsetY);
        });
      }
    });
  }

  if (copyAll) {
    copyAll.addEventListener('click', () => {
      const params = getParams();
      const fractalType = getCurrentFractalType();
      
      if (!params) return;

      const fractalName = fractalType || '-';
      const zoom = formatCoordinate(params.zoom, 3);
      const offsetX = formatCoordinate(params.offset.x, 4);
      const offsetY = formatCoordinate(params.offset.y, 4);

      const allInfo = `Fractal: ${fractalName}\nZoom: ${zoom}\nOffset X: ${offsetX}\nOffset Y: ${offsetY}`;

      navigator.clipboard.writeText(allInfo).then(() => {
        const originalHTML = copyAll.innerHTML;
        copyAll.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>Copied!';
        copyAll.style.background = 'var(--accent-blue)';

        setTimeout(() => {
          copyAll.innerHTML = originalHTML;
          copyAll.style.background = '';
        }, 1000);
      });
    });
  }
}

