/**
 * Debug Display Module
 * Similar to coordinate display - manages debug information display and copy functionality
 * Handles debug panel with fractal name, zoom, and offset values
 */

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
 * Show copy feedback on a button
 * @param {HTMLElement} button - Button element to show feedback on
 * @param {number} duration - Duration in milliseconds (default: 1000)
 */
function showCopyFeedback(button, duration = 1000) {
  const originalHTML = button.innerHTML;
  button.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>';
  button.style.color = 'var(--accent-blue)';

  setTimeout(() => {
    button.innerHTML = originalHTML;
    button.style.color = '';
  }, duration);
}

/**
 * Format theme name for display
 * @param {string} theme - Theme name to format
 * @returns {string} Formatted theme name
 */
function formatThemeName(theme) {
  const nameMap = {
    classic: 'Classic',
    fire: 'Fire',
    ocean: 'Ocean',
    rainbow: 'Rainbow',
    'rainbow-pastel': 'Rainbow Pastel',
    'rainbow-dark': 'Rainbow Dark',
    'rainbow-vibrant': 'Rainbow Vibrant',
    'rainbow-double': 'Rainbow Double',
    'rainbow-shifted': 'Rainbow Shifted',
    monochrome: 'Monochrome',
    forest: 'Forest',
    sunset: 'Sunset',
    purple: 'Purple',
    cyan: 'Cyan',
    gold: 'Gold',
    ice: 'Ice',
    neon: 'Neon',
    cosmic: 'Cosmic',
    aurora: 'Aurora',
    coral: 'Coral',
    autumn: 'Autumn',
    midnight: 'Midnight',
    emerald: 'Emerald',
    rosegold: 'Rose Gold',
    electric: 'Electric',
    vintage: 'Vintage',
    tropical: 'Tropical',
    galaxy: 'Galaxy',
  };
  return nameMap[theme] || theme.charAt(0).toUpperCase() + theme.slice(1);
}

/**
 * Update debug display with current fractal information
 * @param {string} fractalType - Current fractal type
 * @param {Object} params - Fractal parameters with zoom and offset
 */
export function updateDebugDisplay(fractalType, params) {
  if (!params) return;

  const debugFractalName = document.getElementById('debug-fractal-name');
  const debugZoom = document.getElementById('debug-zoom');
  const debugOffsetX = document.getElementById('debug-offset-x');
  const debugOffsetY = document.getElementById('debug-offset-y');
  const debugTheme = document.getElementById('debug-theme');

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
  if (debugTheme) {
    debugTheme.textContent = formatThemeName(params.colorScheme) || '-';
  }
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
  const copyTheme = document.getElementById('debug-copy-theme');
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

  if (copyTheme) {
    copyTheme.addEventListener('click', () => {
      const params = getParams();
      if (params) {
        const themeName = formatThemeName(params.colorScheme);
        navigator.clipboard.writeText(themeName).then(() => {
          showCopyFeedback(copyTheme);
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
      const themeName = formatThemeName(params.colorScheme) || '-';

      const allInfo = `Fractal: ${fractalName}\nZoom: ${zoom}\nOffset X: ${offsetX}\nOffset Y: ${offsetY}\nTheme: ${themeName}`;

      navigator.clipboard.writeText(allInfo).then(() => {
        const originalHTML = copyAll.innerHTML;
        copyAll.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>Copied!';
        copyAll.style.background = 'var(--accent-blue)';

        setTimeout(() => {
          copyAll.innerHTML = originalHTML;
          copyAll.style.background = '';
        }, 1000);
      });
    });
  }
}
