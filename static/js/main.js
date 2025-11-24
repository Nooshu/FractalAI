import { initCanvasRenderer } from './rendering/canvas-renderer.js';
import { getColorSchemeIndex, computeColorForScheme, isJuliaType } from './fractals/utils.js';
import { BenchmarkUI, addBenchmarkButton } from './performance/ui.js';
import { CONFIG } from './core/config.js';
import { FrameCache } from './core/frameCache.js';
import { initLoadingBar, showLoadingBar, hideLoadingBar } from './ui/loading-bar.js';
import { initFPSTracker, startFPSTracking, incrementFrameCount } from './performance/fps-tracker.js';
import { cacheElement } from './core/dom-cache.js';
import { updateCoordinateDisplay as updateCoordDisplay, setupCoordinateCopy } from './ui/coordinate-display.js';
import { updateDebugDisplay, setupDebugCopy } from './ui/debug-display.js';
import { setupShareFractal, loadFractalFromURL } from './sharing/state-manager.js';
import { getWikipediaUrl, getInitialRenderPosition } from './fractals/fractal-config.js';
import { initUILayout } from './ui/panels.js';
import { fractalLoader } from './fractals/loader.js';
import { RenderingEngine } from './rendering/engine.js';
import { setupInputControls, zoomToSelection } from './input/controls.js';
import { setupUIControls } from './ui/controls.js';
import { appState } from './core/app-state.js';
import { getRandomInterestingView } from './fractals/random-view.js';

// Application state is now managed by appState module

// Initialize DOM cache and other modules
function initDOMCache() {
  // Cache coordinate display elements
  cacheElement('coord-zoom');
  cacheElement('coord-offset-x');
  cacheElement('coord-offset-y');
  cacheElement('copy-coords-btn');
  // Initialize loading bar module
  initLoadingBar();
  // Initialize FPS tracker module
  initFPSTracker('fps');
}

// Import pixel ratio functions for use in rendering
import { updatePixelRatio } from './rendering/pixel-ratio.js';

// Throttled render function - batches multiple render requests
function scheduleRender() {
  const renderingEngine = appState.getRenderingEngine();
  if (renderingEngine) {
    renderingEngine.scheduleRender();
  }
}

// Fractal parameters are now managed by appState module

// Update Wikipedia link based on current fractal type
function updateWikipediaLink() {
  const wikipediaLink = document.getElementById('wikipedia-link');
  const currentFractalType = appState.getCurrentFractalType();
  if (wikipediaLink && currentFractalType) {
    const url = getWikipediaUrl(currentFractalType);
    wikipediaLink.href = url;
  }
}

// Initialize regl
async function init() {
  // Initialize DOM cache first
  initDOMCache();

  // Initialize canvas and regl renderer
  const params = appState.getParams();
  const { canvas: canvasElement, regl: reglContext, updateRendererSize: updateSize } = initCanvasRenderer('fractal-canvas', {
    getZoom: () => appState.getParams().zoom,
    onResize: () => {
      const renderingEngine = appState.getRenderingEngine();
      if (renderingEngine) {
        renderingEngine.renderFractal();
      }
    },
  });

  appState.setCanvas(canvasElement);
  appState.setRegl(reglContext);
  appState.setUpdateRendererSize(updateSize);

  // Initialize rendering engine
  const renderingEngine = new RenderingEngine(
    {
      ...appState.getGetters(),
      getIsLoading: () => fractalLoader.getIsLoading(),
    },
    appState.getSetters(),
    appState.getFrameCache()
  );
  appState.setRenderingEngine(renderingEngine);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    appState.cleanup();
  });

  // Setup UI controls (after rendering engine is initialized)
  const getters = appState.getGetters();
  const setters = appState.getSetters();
  setupUIControls(
    {
      getParams: getters.getParams,
      getCurrentFractalType: getters.getCurrentFractalType,
      getCurrentFractalModule: getters.getCurrentFractalModule,
      getDrawFractal: getters.getDrawFractal,
      getCachedDrawCommand: getters.getCachedDrawCommand,
      getIsDisplayingCached: getters.getIsDisplayingCached,
      getRegl: getters.getRegl,
      getCanvas: getters.getCanvas,
    },
    {
      setCurrentFractalType: setters.setCurrentFractalType,
      setDrawFractal: setters.setDrawFractal,
      setCachedDrawCommand: setters.setCachedDrawCommand,
      setIsDisplayingCached: setters.setIsDisplayingCached,
    },
    {
      frameCache: appState.getFrameCache(),
      fractalLoader: fractalLoader,
    },
    {
      loadFractal: loadFractal,
      updateWikipediaLink: updateWikipediaLink,
      updateCoordinateDisplay: updateCoordinateDisplay,
      renderFractalProgressive: () => renderingEngine.renderFractalProgressive(),
      renderFractal: () => renderingEngine.renderFractal(),
      getRandomInterestingView: () => getRandomInterestingView({
        getCurrentFractalType: getters.getCurrentFractalType,
        getCurrentFractalModule: getters.getCurrentFractalModule,
        getParams: getters.getParams,
        getCanvas: getters.getCanvas,
      }),
      cancelProgressiveRender: () => renderingEngine.cancelProgressiveRender(),
      onFullscreenChange: (isFullscreen) => {
        const updateRendererSize = appState.getUpdateRendererSize();
        if (updateRendererSize) {
          updateRendererSize();
        }
      },
    }
  );
  
  // Setup input controls (after rendering engine is initialized)
  setupInputControls(
    {
      getCanvas: getters.getCanvas,
      getParams: getters.getParams,
      getUpdateRendererSize: getters.getUpdateRendererSize,
    },
    {
      scheduleRender: () => renderingEngine.scheduleRender(),
      updateCoordinateDisplay: updateCoordinateDisplay,
      renderFractalProgressive: () => renderingEngine.renderFractalProgressive(),
      zoomToSelection: (startX, startY, endX, endY, canvasRect) => {
        zoomToSelection(startX, startY, endX, endY, canvasRect,
          { getCanvas: getters.getCanvas, getParams: getters.getParams },
          { renderFractalProgressive: () => renderingEngine.renderFractalProgressive() }
        );
      },
    }
  );
  // Setup UI layout (collapsible sections and panel toggle)
  initUILayout(getters.getUpdateRendererSize);
  // Setup coordinate display with getter functions
  setupCoordinateCopy(getters.getCurrentFractalType, getters.getParams);
  setupDebugCopy(getters.getCurrentFractalType, getters.getParams);
  setupShareFractal(getters.getCurrentFractalType, getters.getParams);
  updateCoordinateDisplay();

  // Initialize benchmark UI
  const benchmarkUI = new BenchmarkUI(
    appState.getRegl(),
    appState.getCanvas(),
    async (fractalType) => {
      await loadFractal(fractalType);
      // Ensure render happens after load
      await new Promise((resolve) => setTimeout(resolve, 50));
    },
    (newParams) => {
      // Update params
      const params = appState.getParams();
      Object.assign(params, newParams);
      // Trigger render
      renderingEngine.renderFractal();
      // Wait for render to complete
      return new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
    }
  );
  addBenchmarkButton(benchmarkUI);

  // Get the initial fractal type from the dropdown (defaults to mandelbrot if not found)
  const fractalTypeSelect = document.getElementById('fractal-type');
  if (fractalTypeSelect && fractalTypeSelect.value) {
    appState.setCurrentFractalType(fractalTypeSelect.value);
  }

  // Initialize Wikipedia link
  updateWikipediaLink();

  // Try to load fractal state from URL first
  const loadedFromURL = await loadFractalFromURL(
    {
      getCurrentFractalType: getters.getCurrentFractalType,
      getCurrentFractalModule: getters.getCurrentFractalModule,
      getParams: getters.getParams,
    },
    {
      setFractalType: setters.setCurrentFractalType,
      loadFractal: loadFractal,
      updateWikipediaLink: updateWikipediaLink,
      updateCoordinateDisplay: updateCoordinateDisplay,
      renderFractal: () => renderingEngine.renderFractal(),
    }
  );

  if (!loadedFromURL) {
    // Load initial fractal if not loaded from URL
    const currentFractalType = appState.getCurrentFractalType();
    loadFractal(currentFractalType).then(() => {
      renderingEngine.renderFractal();
      updateCoordinateDisplay();
      startFPSTracking();
      renderingEngine.startAnimation();
    });
  } else {
    // If loaded from URL, just start animation
    startFPSTracking();
    renderingEngine.startAnimation();
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
window.addEventListener('load', () => {
  init();
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
