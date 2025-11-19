/**
 * Coordinate display UI component
 * Updates and manages coordinate display
 */

/**
 * Update coordinate display with current parameters
 * @param {Object} params - Fractal parameters
 */
export function updateCoordinateDisplay(params) {
  const zoomEl = document.getElementById('coord-zoom');
  const offsetXEl = document.getElementById('coord-offset-x');
  const offsetYEl = document.getElementById('coord-offset-y');

  if (zoomEl && offsetXEl && offsetYEl && params) {
    // Round to reasonable precision for display
    zoomEl.textContent = Math.round(params.zoom * 1000) / 1000;
    offsetXEl.textContent = Math.round(params.offset.x * 10000) / 10000;
    offsetYEl.textContent = Math.round(params.offset.y * 10000) / 10000;
  }
}

/**
 * Setup coordinate copy functionality
 * @param {Function} getCurrentFractalType - Function to get current fractal type
 * @param {Function} getParams - Function to get current parameters
 */
export function setupCoordinateCopy(getCurrentFractalType, getParams) {
  const copyBtn = document.getElementById('copy-coords-btn');
  if (!copyBtn) return;

  copyBtn.addEventListener('click', () => {
    const params = getParams();
    const fractalType = getCurrentFractalType();
    
    if (!params || !fractalType) return;

    const zoom = Math.round(params.zoom * 1000) / 1000;
    const offsetX = Math.round(params.offset.x * 10000) / 10000;
    const offsetY = Math.round(params.offset.y * 10000) / 10000;

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

