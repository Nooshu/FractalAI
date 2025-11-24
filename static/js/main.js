import { appState } from './core/app-state.js';
import { fractalLoader } from './fractals/loader.js';
import { getWikipediaUrl } from './fractals/fractal-config.js';
import { updateCoordinateDisplay as updateCoordDisplay } from './ui/coordinate-display.js';
import { updateDebugDisplay } from './ui/debug-display.js';
import { init } from './core/initialization.js';
import { initFooterHeightTracking, updateFooterHeight } from './ui/footer-height.js';

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
window.addEventListener('load', async () => {
  await init(appState, loadFractal, updateWikipediaLink, updateCoordinateDisplay);
  updateFooterHeight();
});

// Initialize footer height tracking
initFooterHeightTracking();
