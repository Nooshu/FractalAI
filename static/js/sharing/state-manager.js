/**
 * Sharing/URL State Module
 * More complex but well-defined module for managing fractal state sharing and URL parameters
 * Handles encoding, decoding, URL management, state application, and share button setup
 */

import { encodeFractalState } from './encoder.js';
import { decodeFractalState } from './decoder.js';
import { loadFractalFromURL as loadStateFromURL } from './url-handler.js';
import { isJuliaType } from '../fractals/utils.js';

/**
 * Get shareable URL with encoded fractal state
 * @param {string} fractalType - Current fractal type
 * @param {Object} params - Fractal parameters
 * @returns {string} Shareable URL
 */
export function getShareableURL(fractalType, params) {
  const seed = encodeFractalState(fractalType, params);
  // Use origin and pathname to ensure we get a clean URL without existing query params
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('seed', seed);
  return url.toString();
}

/**
 * Get shareable seed string
 * @param {string} fractalType - Current fractal type
 * @param {Object} params - Fractal parameters
 * @returns {string} Encoded seed string
 */
export function getShareableSeed(fractalType, params) {
  return encodeFractalState(fractalType, params);
}

/**
 * Apply decoded fractal state to the application
 * This function uses getter/setter functions to update app state and UI without direct dependencies
 * @param {Object} state - Decoded state object
 * @param {Object} getters - Getter functions for current state
 * @param {Function} getters.getCurrentFractalType - Function to get current fractal type
 * @param {Function} getters.getCurrentFractalModule - Function to get current fractal module
 * @param {Function} getters.getParams - Function to get params object
 * @param {Object} setters - Setter functions for state updates
 * @param {Function} setters.setFractalType - Function to set fractal type
 * @param {Function} setters.loadFractal - Function to load a fractal module
 * @param {Function} setters.updateWikipediaLink - Function to update Wikipedia link
 * @param {Function} setters.updateCoordinateDisplay - Function to update coordinate display
 * @param {Function} setters.renderFractal - Function to render the fractal
 * @returns {Promise<boolean>} True if state was applied successfully
 */
export async function applyFractalState(state, getters, setters) {
  if (!state || !getters || !setters) return false;

  const {
    getCurrentFractalType,
    getCurrentFractalModule,
    getParams,
  } = getters;

  const {
    setFractalType,
    loadFractal,
    updateWikipediaLink,
    updateCoordinateDisplay,
    renderFractal,
  } = setters;

  const currentFractalType = getCurrentFractalType();
  const currentFractalModule = getCurrentFractalModule();
  const params = getParams();

  // Update fractal type first
  if (state.fractalType) {
    const fractalTypeSelect = document.getElementById('fractal-type');
    if (fractalTypeSelect) {
      fractalTypeSelect.value = state.fractalType;
    }

    // Always load the fractal module if type changed or if module is not loaded
    if (state.fractalType !== currentFractalType || !currentFractalModule) {
      if (setFractalType) {
        setFractalType(state.fractalType);
      }
      if (loadFractal) {
        await loadFractal(state.fractalType);
      }
    }
  } else if (!currentFractalModule && loadFractal) {
    // If no fractal type in state but module not loaded, load default
    await loadFractal(currentFractalType);
  }

  // Update Wikipedia link
  if (updateWikipediaLink) {
    updateWikipediaLink();
  }

  // Update parameters
  if (state.zoom !== undefined) params.zoom = state.zoom;
  if (state.iterations !== undefined) params.iterations = state.iterations;
  if (state.colorScheme !== undefined) params.colorScheme = state.colorScheme;
  if (state.offsetX !== undefined) params.offset.x = state.offsetX;
  if (state.offsetY !== undefined) params.offset.y = state.offsetY;
  if (state.xScale !== undefined) params.xScale = state.xScale;
  if (state.yScale !== undefined) params.yScale = state.yScale;

  // Update Julia parameters if provided
  if (state.juliaCX !== undefined) params.juliaC.x = state.juliaCX;
  if (state.juliaCY !== undefined) params.juliaC.y = state.juliaCY;

  // Update UI controls
  const iterationsSlider = document.getElementById('iterations');
  const iterationsValue = document.getElementById('iterations-value');
  const fullscreenIterationsNumber = document.getElementById('fullscreen-iterations-number');
  if (iterationsSlider && state.iterations !== undefined) {
    iterationsSlider.value = state.iterations;
  }
  if (iterationsValue && state.iterations !== undefined) {
    iterationsValue.textContent = state.iterations;
  }
  if (fullscreenIterationsNumber && state.iterations !== undefined) {
    fullscreenIterationsNumber.textContent = state.iterations;
  }

  const colorSchemeSelect = document.getElementById('color-scheme');
  if (colorSchemeSelect && state.colorScheme !== undefined) {
    colorSchemeSelect.value = state.colorScheme;
  }

  const xScaleSlider = document.getElementById('x-scale');
  const xScaleValue = document.getElementById('x-scale-value');
  const xScaleAnnounce = document.getElementById('x-scale-announce');
  if (xScaleSlider && state.xScale !== undefined) {
    xScaleSlider.value = state.xScale;
    // Update accessibility attributes without announcing (programmatic change)
    if (xScaleValue && xScaleAnnounce) {
      const formattedValue = state.xScale.toFixed(1);
      xScaleValue.textContent = formattedValue;
      xScaleSlider.setAttribute('aria-valuenow', formattedValue);
      xScaleSlider.setAttribute('aria-valuetext', formattedValue);
    }
  }

  const yScaleSlider = document.getElementById('y-scale');
  const yScaleValue = document.getElementById('y-scale-value');
  const yScaleAnnounce = document.getElementById('y-scale-announce');
  if (yScaleSlider && state.yScale !== undefined) {
    yScaleSlider.value = state.yScale;
    // Update accessibility attributes without announcing (programmatic change)
    if (yScaleValue && yScaleAnnounce) {
      const formattedValue = state.yScale.toFixed(1);
      yScaleValue.textContent = formattedValue;
      yScaleSlider.setAttribute('aria-valuenow', formattedValue);
      yScaleSlider.setAttribute('aria-valuetext', formattedValue);
    }
  }

  // Update Julia controls if applicable
  if (isJuliaType(getCurrentFractalType())) {
    const juliaCRealSlider = document.getElementById('julia-c-real');
    const juliaCRealValue = document.getElementById('julia-c-real-value');
    if (juliaCRealSlider && state.juliaCX !== undefined) {
      juliaCRealSlider.value = state.juliaCX;
    }
    if (juliaCRealValue && state.juliaCX !== undefined) {
      juliaCRealValue.textContent = state.juliaCX.toFixed(4);
    }

    const juliaCImagSlider = document.getElementById('julia-c-imag');
    const juliaCImagValue = document.getElementById('julia-c-imag-value');
    if (juliaCImagSlider && state.juliaCY !== undefined) {
      juliaCImagSlider.value = state.juliaCY;
    }
    if (juliaCImagValue && state.juliaCY !== undefined) {
      juliaCImagValue.textContent = state.juliaCY.toFixed(4);
    }
  }

  // Update coordinate display
  if (updateCoordinateDisplay) {
    updateCoordinateDisplay();
  }

  // Render the fractal
  if (renderFractal) {
    renderFractal();
  }

  return true;
}

/**
 * Load fractal state from URL and apply it
 * @param {Object} getters - Getter functions for current state (same as applyFractalState)
 * @param {Object} setters - Setter functions for state updates (same as applyFractalState)
 * @returns {Promise<boolean>} True if state was loaded and applied successfully
 */
export async function loadFractalFromURL(getters, setters) {
  const state = loadStateFromURL();
  if (state) {
    return await applyFractalState(state, getters, setters);
  }
  return false;
}

/**
 * Setup share button functionality
 * @param {Function} getCurrentFractalType - Function to get current fractal type
 * @param {Function} getParams - Function to get current parameters
 */
export function setupShareFractal(getCurrentFractalType, getParams) {
  const shareBtn = document.getElementById('share-fractal-btn');
  if (!shareBtn) return;

  shareBtn.addEventListener('click', async () => {
    const fractalType = getCurrentFractalType();
    const params = getParams();
    
    if (!fractalType || !params) return;

    const url = getShareableURL(fractalType, params);
    const seed = getShareableSeed(fractalType, params);

    // Try to copy URL first, fallback to seed
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        const originalText = shareBtn.innerHTML;
        shareBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>Copied!';
        shareBtn.style.background = 'var(--accent-blue)';

        setTimeout(() => {
          shareBtn.innerHTML = originalText;
          shareBtn.style.background = '';
        }, 2000);
        return;
      } catch (err) {
        console.error('Failed to copy URL, trying seed:', err);
        // Try copying seed as fallback
        try {
          await navigator.clipboard.writeText(seed);
          const originalText = shareBtn.innerHTML;
          shareBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>Copied Seed!';
          shareBtn.style.background = 'var(--accent-blue)';

          setTimeout(() => {
            shareBtn.innerHTML = originalText;
            shareBtn.style.background = '';
          }, 2000);
          return;
        } catch (err2) {
          console.error('Failed to copy seed:', err2);
        }
      }
    }

    // Final fallback: show alert with manual copy option
    alert(`Failed to copy. Please copy manually:\n\nURL: ${url}\n\nSeed: ${seed}`);
  });
}

