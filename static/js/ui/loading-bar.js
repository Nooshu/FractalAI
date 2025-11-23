/**
 * Loading bar UI component
 * Shows/hides loading indicator during rendering
 * Simple, isolated functionality for loading state management
 */

// Cache the loading bar element for performance
let loadingBarElement = null;

/**
 * Initialize the loading bar module
 * Call this once during app initialization to cache the DOM element
 */
export function initLoadingBar() {
  if (!loadingBarElement) {
    loadingBarElement = document.getElementById('loading-bar');
  }
  return loadingBarElement;
}

/**
 * Get the loading bar element (lazy initialization if not cached)
 */
function getLoadingBar() {
  if (!loadingBarElement) {
    loadingBarElement = document.getElementById('loading-bar');
  }
  return loadingBarElement;
}

/**
 * Show the loading bar
 */
export function showLoadingBar() {
  const loadingBar = getLoadingBar();
  if (loadingBar) {
    loadingBar.classList.remove('active');
    // Force reflow to reset animation
    void loadingBar.offsetWidth;
    loadingBar.classList.add('active');
  }
}

/**
 * Hide the loading bar
 */
export function hideLoadingBar() {
  const loadingBar = getLoadingBar();
  if (loadingBar) {
    loadingBar.classList.remove('active');
  }
}

