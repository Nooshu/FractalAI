/**
 * Loading bar UI component
 * Shows/hides loading indicator during rendering
 */

/**
 * Show the loading bar
 */
export function showLoadingBar() {
  const loadingBar = document.getElementById('loading-bar');
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
  const loadingBar = document.getElementById('loading-bar');
  if (loadingBar) {
    loadingBar.classList.remove('active');
  }
}

