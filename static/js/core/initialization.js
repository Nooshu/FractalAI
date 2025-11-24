/**
 * Initialization Module
 * Handles all application initialization logic
 */

import { initCanvasRenderer } from '../rendering/canvas-renderer.js';
import { BenchmarkUI, addBenchmarkButton } from '../performance/ui.js';
import { initLoadingBar } from '../ui/loading-bar.js';
import { initFPSTracker, startFPSTracking } from '../performance/fps-tracker.js';
import { cacheElement } from './dom-cache.js';
import { setupCoordinateCopy } from '../ui/coordinate-display.js';
import { setupDebugCopy } from '../ui/debug-display.js';
import { setupShareFractal, loadFractalFromURL } from '../sharing/state-manager.js';
import { getWikipediaUrl } from '../fractals/fractal-config.js';
import { initUILayout } from '../ui/panels.js';
import { fractalLoader } from '../fractals/loader.js';
import { RenderingEngine } from '../rendering/engine.js';
import { setupInputControls, zoomToSelection } from '../input/controls.js';
import { setupUIControls } from '../ui/controls.js';
import { getRandomInterestingView } from '../fractals/random-view.js';

/**
 * Initialize DOM cache and basic UI modules
 */
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

/**
 * Initialize canvas and WebGL renderer
 * @param {Object} appState - Application state instance
 * @returns {Object} Canvas, regl context, and updateRendererSize function
 */
function initCanvasAndRenderer(appState) {
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

  return { canvasElement, reglContext, updateSize };
}

/**
 * Initialize rendering engine
 * @param {Object} appState - Application state instance
 * @returns {RenderingEngine} Initialized rendering engine
 */
function initRenderingEngine(appState) {
  const renderingEngine = new RenderingEngine(
    {
      ...appState.getGetters(),
      getIsLoading: () => fractalLoader.getIsLoading(),
    },
    appState.getSetters(),
    appState.getFrameCache()
  );
  appState.setRenderingEngine(renderingEngine);
  return renderingEngine;
}

/**
 * Setup cleanup handlers
 * @param {Object} appState - Application state instance
 */
function setupCleanupHandlers(appState) {
  window.addEventListener('beforeunload', () => {
    appState.cleanup();
  });
}

/**
 * Setup UI controls
 * @param {Object} appState - Application state instance
 * @param {RenderingEngine} renderingEngine - Rendering engine instance
 * @param {Function} loadFractal - Load fractal function
 * @param {Function} updateWikipediaLink - Update Wikipedia link function
 * @param {Function} updateCoordinateDisplay - Update coordinate display function
 */
function setupUIControlsModule(appState, renderingEngine, loadFractal, updateWikipediaLink, updateCoordinateDisplay) {
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
}

/**
 * Setup input controls
 * @param {Object} appState - Application state instance
 * @param {RenderingEngine} renderingEngine - Rendering engine instance
 * @param {Function} updateCoordinateDisplay - Update coordinate display function
 */
function setupInputControlsModule(appState, renderingEngine, updateCoordinateDisplay) {
  const getters = appState.getGetters();
  
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
}

/**
 * Setup UI layout and display modules
 * @param {Object} appState - Application state instance
 * @param {Function} updateCoordinateDisplay - Update coordinate display function
 */
function setupUILayoutAndDisplays(appState, updateCoordinateDisplay) {
  const getters = appState.getGetters();
  
  // Setup UI layout (collapsible sections and panel toggle)
  initUILayout(getters.getUpdateRendererSize);
  
  // Setup coordinate display with getter functions
  setupCoordinateCopy(getters.getCurrentFractalType, getters.getParams);
  setupDebugCopy(getters.getCurrentFractalType, getters.getParams);
  setupShareFractal(getters.getCurrentFractalType, getters.getParams);
  updateCoordinateDisplay();
}

/**
 * Initialize benchmark UI
 * @param {Object} appState - Application state instance
 * @param {RenderingEngine} renderingEngine - Rendering engine instance
 * @param {Function} loadFractal - Load fractal function
 */
function initBenchmarkUI(appState, renderingEngine, loadFractal) {
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
}

/**
 * Initialize initial fractal type from dropdown
 * @param {Object} appState - Application state instance
 */
function initInitialFractalType(appState) {
  const fractalTypeSelect = document.getElementById('fractal-type');
  if (fractalTypeSelect && fractalTypeSelect.value) {
    appState.setCurrentFractalType(fractalTypeSelect.value);
  }
}

/**
 * Load initial fractal (from URL or default)
 * @param {Object} appState - Application state instance
 * @param {RenderingEngine} renderingEngine - Rendering engine instance
 * @param {Function} loadFractal - Load fractal function
 * @param {Function} updateWikipediaLink - Update Wikipedia link function
 * @param {Function} updateCoordinateDisplay - Update coordinate display function
 */
async function loadInitialFractal(appState, renderingEngine, loadFractal, updateWikipediaLink, updateCoordinateDisplay) {
  const getters = appState.getGetters();
  const setters = appState.getSetters();
  
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

/**
 * Main initialization function
 * @param {Object} appState - Application state instance
 * @param {Function} loadFractal - Load fractal function
 * @param {Function} updateWikipediaLink - Update Wikipedia link function
 * @param {Function} updateCoordinateDisplay - Update coordinate display function
 */
export async function init(appState, loadFractal, updateWikipediaLink, updateCoordinateDisplay) {
  // Initialize DOM cache first
  initDOMCache();

  // Initialize canvas and regl renderer
  initCanvasAndRenderer(appState);

  // Initialize rendering engine
  const renderingEngine = initRenderingEngine(appState);

  // Cleanup on page unload
  setupCleanupHandlers(appState);

  // Setup UI controls (after rendering engine is initialized)
  setupUIControlsModule(appState, renderingEngine, loadFractal, updateWikipediaLink, updateCoordinateDisplay);
  
  // Setup input controls (after rendering engine is initialized)
  setupInputControlsModule(appState, renderingEngine, updateCoordinateDisplay);
  
  // Setup UI layout and displays
  setupUILayoutAndDisplays(appState, updateCoordinateDisplay);

  // Initialize benchmark UI
  initBenchmarkUI(appState, renderingEngine, loadFractal);

  // Get the initial fractal type from the dropdown (defaults to mandelbrot if not found)
  initInitialFractalType(appState);

  // Initialize Wikipedia link
  updateWikipediaLink();

  // Load initial fractal (from URL or default)
  await loadInitialFractal(appState, renderingEngine, loadFractal, updateWikipediaLink, updateCoordinateDisplay);
}

