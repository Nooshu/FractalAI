/**
 * Discovery UI Component
 * Handles the UI for fractal discovery features
 */

import { initializeDiscovery, getSurpriseMeFractal } from '../discovery/discovery-manager.js';
import { initializeFavorites, addCurrentAsFavorite, isCurrentFavorited, renderFavorites } from './favorites.js';
import { isValidInterestingView } from '../fractals/random-view.js';

let isInitialized = false;
let getCurrentFractalState = null;
let onFractalStateChange = null;
let getCurrentFractalType = null;
let getParams = null;
let getCanvas = null;

/**
 * Initialize discovery and favorites UI
 * @param {Object} getters - Getter functions
 * @param {Function} onStateChange - Callback when fractal state changes
 */
export async function initializeDiscoveryUI(getters, onStateChange) {
  if (isInitialized) return;

  getCurrentFractalState = () => {
    const fractalType = getters.getCurrentFractalType();
    const params = getters.getParams();
    return {
      fractalType,
      zoom: params.zoom,
      offsetX: params.offset.x,
      offsetY: params.offset.y,
      iterations: params.iterations,
      colorScheme: params.colorScheme,
      xScale: params.xScale || 1.0,
      yScale: params.yScale || 1.0,
      juliaCX: params.juliaC?.x || 0,
      juliaCY: params.juliaC?.y || 0,
    };
  };

  onFractalStateChange = onStateChange;
  getCurrentFractalType = getters.getCurrentFractalType;
  getParams = getters.getParams;
  getCanvas = getters.getCanvas;

  // Initialize discovery system
  await initializeDiscovery((offset, zoom, fractalType) => {
    return isValidInterestingView(offset, zoom, fractalType, getParams, getCanvas);
  });

  // Initialize favorites UI
  const favoritesContainer = document.getElementById('favorites-container');
  if (favoritesContainer) {
    initializeFavorites(
      favoritesContainer,
      (favorite) => {
        // Load favorite fractal state
        if (onFractalStateChange) {
          onFractalStateChange(favorite);
        }
      },
      getCurrentFractalState
    );
  }

  // Setup "Surprise Me" button
  const surpriseMeBtn = document.getElementById('surprise-me-btn');
  if (surpriseMeBtn) {
    surpriseMeBtn.addEventListener('click', async () => {
      await handleSurpriseMe();
    });
  }

  // Setup "Add to Favorites" button
  const addFavoriteBtn = document.getElementById('add-favorite-btn');
  if (addFavoriteBtn) {
    addFavoriteBtn.addEventListener('click', () => {
      handleAddFavorite();
    });
  }

  // Setup fullscreen "Surprise Me" button
  const fullscreenSurpriseMeBtn = document.getElementById('fullscreen-surprise-me');
  if (fullscreenSurpriseMeBtn) {
    fullscreenSurpriseMeBtn.addEventListener('click', async () => {
      await handleSurpriseMe();
    });
  }

  // Setup fullscreen "Bookmark" button
  const fullscreenBookmarkBtn = document.getElementById('fullscreen-bookmark');
  if (fullscreenBookmarkBtn) {
    fullscreenBookmarkBtn.addEventListener('click', () => {
      handleAddFavorite();
    });
  }

  // Update favorite button state when fractal changes
  updateFavoriteButtonState();

  // Set up periodic check for favorite button state (when parameters change)
  // This is a simple approach - could be improved with event system
  let lastStateHash = '';
  const checkInterval = setInterval(() => {
    const currentState = getCurrentFractalState();
    const stateHash = JSON.stringify(currentState);
    if (stateHash !== lastStateHash) {
      lastStateHash = stateHash;
      updateFavoriteButtonState();
    }
  }, 500); // Check every 500ms

  // Clean up interval when page unloads
  window.addEventListener('beforeunload', () => {
    clearInterval(checkInterval);
  });

  isInitialized = true;
}

/**
 * Handle "Surprise Me" button click
 */
async function handleSurpriseMe() {
  const btn = document.getElementById('surprise-me-btn');
  const fullscreenBtn = document.getElementById('fullscreen-surprise-me');
  
  if (!btn && !fullscreenBtn) return;

  const fractalType = getCurrentFractalType();
  if (!fractalType) return;

  // Show loading state on both buttons
  if (btn) {
    btn.classList.add('loading');
    btn.disabled = true;
  }
  if (fullscreenBtn) {
    fullscreenBtn.classList.add('loading');
    fullscreenBtn.disabled = true;
  }

  try {
    const discovered = await getSurpriseMeFractal(
      fractalType,
      (offset, zoom, type) => {
        return isValidInterestingView(offset, zoom, type, getParams, getCanvas);
      },
      {
        candidateCount: 200,
        minScore: 0.4,
      }
    );

    if (discovered) {
      // Apply discovered fractal state
      if (onFractalStateChange) {
        onFractalStateChange(discovered);
      }
    } else {
      console.warn('No interesting fractals discovered');
    }
  } catch (error) {
    console.error('Discovery error:', error);
  } finally {
    if (btn) {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
    if (fullscreenBtn) {
      fullscreenBtn.classList.remove('loading');
      fullscreenBtn.disabled = false;
    }
  }
}

/**
 * Handle "Add to Favorites" button click
 */
function handleAddFavorite() {
  const existing = isCurrentFavorited();
  if (existing) {
    // Already favorited
    return;
  }

  const id = addCurrentAsFavorite();
  if (id) {
    updateFavoriteButtonState();
  }
}

/**
 * Update favorite button state based on current fractal
 */
export function updateFavoriteButtonState() {
  const btn = document.getElementById('add-favorite-btn');
  const fullscreenBtn = document.getElementById('fullscreen-bookmark');
  const existing = isCurrentFavorited();

  // Update main favorites button
  if (btn) {
    if (existing) {
      btn.disabled = true;
      btn.title = 'Already in favorites';
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        In Favorites
      `;
    } else {
      btn.disabled = false;
      btn.title = 'Add current fractal to favorites';
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        Add to Favorites
      `;
    }
  }

  // Update fullscreen bookmark button
  if (fullscreenBtn) {
    if (existing) {
      fullscreenBtn.title = 'Already in favorites';
      fullscreenBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      `;
    } else {
      fullscreenBtn.title = 'Add to Favorites';
      fullscreenBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      `;
    }
  }
}

/**
 * Refresh favorites display (call when favorites change externally)
 */
export function refreshFavorites() {
  renderFavorites();
  updateFavoriteButtonState();
}

