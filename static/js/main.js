import { appState } from './core/app-state.js';
import { fractalLoader } from './fractals/loader.js';
import { getWikipediaUrl } from './fractals/fractal-config.js';
import { updateCoordinateDisplay as updateCoordDisplay } from './ui/coordinate-display.js';
import { updateDebugDisplay } from './ui/debug-display.js';
import { init } from './core/initialization.js';

// Application state is now managed by appState module

// Update Wikipedia link based on current fractal type
function updateWikipediaLink() {
  const wikipediaLink = document.getElementById('wikipedia-link');
  const currentFractalType = appState.getCurrentFractalType();
  if (wikipediaLink && currentFractalType) {
    const url = getWikipediaUrl(currentFractalType);
    wikipediaLink.href = url;
  }
}

// Dynamically load a fractal module
async function loadFractal(fractalType) {
  await fractalLoader.loadFractalWithState(fractalType, {
    setCurrentFractalModule: (module) => { appState.setCurrentFractalModule(module); },
    setCurrentFractalType: (type) => { appState.setCurrentFractalType(type); },
  });
}



// Random interesting view functions have been moved to fractals/random-view.js module

// setupUI function has been moved to ui/controls.js module




// Wrapper function to update both coordinate and debug displays (for backward compatibility)
function updateCoordinateDisplay() {
  const params = appState.getParams();
  const currentFractalType = appState.getCurrentFractalType();
  updateCoordDisplay(params);
  updateDebugDisplay(currentFractalType, params);
}


// Initialize on load
// Function to update footer height CSS variable
function updateFooterHeight() {
  const footer = document.querySelector('.app-footer');
  if (footer) {
    const height = footer.offsetHeight;
    document.documentElement.style.setProperty('--footer-height', `${height}px`);
  }
}

// Update footer height on load and resize
window.addEventListener('load', async () => {
  await init(appState, loadFractal, updateWikipediaLink, updateCoordinateDisplay);
  updateFooterHeight();
});

// Update footer height when window resizes or content changes
window.addEventListener('resize', updateFooterHeight);

// Use ResizeObserver for more accurate footer height tracking
const footerObserver = new ResizeObserver(() => {
  updateFooterHeight();
});

// Start observing footer once DOM is ready
function setupFooterHeightTracking() {
  const footer = document.querySelector('.app-footer');
  const shareButton = document.getElementById('share-fractal-btn');
  const shareDescription = document.querySelector('.footer-share-description');

  if (footer) {
    // Observe the footer itself
    footerObserver.observe(footer);

    // Also observe the share description element to catch its size changes
    if (shareDescription) {
      footerObserver.observe(shareDescription);
    }

    updateFooterHeight();

    // Update height when share button is hovered (description appears)
    // Use requestAnimationFrame to catch the transition mid-way
    if (shareButton) {
      const updateOnHover = () => {
        // Update immediately
        requestAnimationFrame(() => {
          updateFooterHeight();
          // Update again after transition completes
          setTimeout(updateFooterHeight, 250);
        });
      };

      shareButton.addEventListener('mouseenter', updateOnHover, { passive: true });
      shareButton.addEventListener('mouseleave', updateOnHover, { passive: true });
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupFooterHeightTracking);
} else {
  setupFooterHeightTracking();
}
