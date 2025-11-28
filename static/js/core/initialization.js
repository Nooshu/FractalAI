/**
 * Initialization Module
 * Handles all application initialization logic
 */

import { initCanvasRenderer } from '../rendering/canvas-renderer.js';
import { initLoadingBar } from '../ui/loading-bar.js';
import { initFPSTracker, startFPSTracking } from '../performance/fps-tracker.js';
import { cacheElement } from './dom-cache.js';
import { setupCoordinateCopy, updateCoordinateAndDebugDisplay } from '../ui/coordinate-display.js';
import { setupShareFractal, loadFractalFromURL } from '../sharing/state-manager.js';
// Presets module is now lazy loaded when right panel is first opened (see panels.js)
import { updateWikipediaLink } from '../fractals/fractal-config.js';
import { initUILayout } from '../ui/panels.js';
import { fractalLoader, loadFractal } from '../fractals/loader.js';
import { RenderingEngine } from '../rendering/engine.js';
import { setupInputControls, zoomToSelection } from '../input/controls.js';
import { setupUIControls } from '../ui/controls.js';
import { getRandomInterestingView } from '../fractals/random-view.js';
import { appState } from './app-state.js';
import { initFooterHeightTracking, updateFooterHeight } from '../ui/footer-height.js';

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
 * @param {Function} loadFractalFromPreset - Load fractal from preset function
 */
function setupUILayoutAndDisplays(appState, updateCoordinateDisplay, loadFractalFromPreset) {
  const getters = appState.getGetters();
  
  // Setup UI layout (collapsible sections and panel toggle) with lazy loading callbacks
  // Presets module is now lazy loaded when right panel is first opened (handled in panels.js)
  initUILayout(getters.getUpdateRendererSize, {
    getCurrentFractalType: getters.getCurrentFractalType,
    getParams: getters.getParams,
    loadFractalFromPreset: loadFractalFromPreset,
  });
  
  // Setup coordinate display with getter functions
  setupCoordinateCopy(getters.getCurrentFractalType, getters.getParams);
  // Debug and EXIF editor are now lazy loaded when their sections are first opened
  // (handled in panels.js via lazyLoadCallbacks)
  setupShareFractal(getters.getCurrentFractalType, getters.getParams);
  // Presets module is now lazy loaded when right panel is first opened (handled in panels.js)
  updateCoordinateDisplay();
}

/**
 * Initialize benchmark UI (lazy loaded when button is clicked)
 * @param {Object} appState - Application state instance
 * @param {RenderingEngine} renderingEngine - Rendering engine instance
 * @param {Function} loadFractal - Load fractal function
 */
function initBenchmarkUI(appState, renderingEngine, loadFractal) {
  let benchmarkUI = null;
  let isLoaded = false;

  // Lazy load benchmark UI when button is clicked
  const loadBenchmarkUI = async () => {
    if (isLoaded && benchmarkUI) {
      benchmarkUI.show();
      return;
    }

    try {
      const { BenchmarkUI: BenchmarkUIClass } = await import('../performance/ui.js');
      
      benchmarkUI = new BenchmarkUIClass(
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
      
      isLoaded = true;
      // Show the UI after loading
      benchmarkUI.show();
    } catch (error) {
      console.error('Failed to load benchmark UI:', error);
    }
  };

  // Add benchmark button that triggers lazy loading
  const topActionBar = document.querySelector('.top-action-bar');
  if (topActionBar && !document.getElementById('benchmark-toggle')) {
    const button = document.createElement('button');
    button.id = 'benchmark-toggle';
    button.className = 'top-action-btn';
    button.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      Benchmark
    `;
    button.title = 'Open Performance Benchmark';
    button.addEventListener('click', loadBenchmarkUI);
    topActionBar.appendChild(button);
  }
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
 * Create wrapper functions that use appState
 */
function createUpdateWikipediaLink() {
  return () => updateWikipediaLink(() => appState.getCurrentFractalType());
}

function createUpdateCoordinateDisplay() {
  return () => updateCoordinateAndDebugDisplay(
    () => appState.getParams(),
    () => appState.getCurrentFractalType()
  );
}

/**
 * Main initialization function
 */
export async function init() {
  const updateWikipediaLinkFn = createUpdateWikipediaLink();
  const updateCoordinateDisplayFn = createUpdateCoordinateDisplay();
  // Initialize DOM cache first
  initDOMCache();

  // Initialize canvas and regl renderer
  initCanvasAndRenderer(appState);

  // Initialize rendering engine
  const renderingEngine = initRenderingEngine(appState);

  // Cleanup on page unload
  setupCleanupHandlers(appState);

  // Setup UI controls (after rendering engine is initialized)
  setupUIControlsModule(appState, renderingEngine, loadFractal, updateWikipediaLinkFn, updateCoordinateDisplayFn);
  
  // Setup input controls (after rendering engine is initialized)
  setupInputControlsModule(appState, renderingEngine, updateCoordinateDisplayFn);
  
  /**
   * Load fractal from preset data
   * @param {Object} preset - Preset configuration
   */
  function loadFractalFromPreset(preset) {
    const setters = appState.getSetters();
    
    // Update fractal parameters from preset
    if (preset.fractal) {
      setters.setCurrentFractalType(preset.fractal);
    }
    
    // Update view parameters
    const params = appState.getParams();
    if (preset.zoom !== undefined) params.zoom = preset.zoom;
    if (preset.offsetX !== undefined) params.offset.x = preset.offsetX;
    if (preset.offsetY !== undefined) params.offset.y = preset.offsetY;
    if (preset.theme) params.colorScheme = preset.theme;
    // Always set iterations to 250 when loading a preset
    params.iterations = 250;
    
    // Update UI controls to reflect the new parameters
    updateUIControlsFromParams(params, preset);
    
    // Load the fractal and render
    loadFractal(preset.fractal || appState.getCurrentFractalType()).then(() => {
      renderingEngine.renderFractal();
      updateCoordinateDisplayFn();
      updateWikipediaLinkFn();
    });
  }
  
  /**
   * Update UI controls to reflect parameter changes
   * @param {Object} params - Current parameters
   * @param {Object} preset - Preset data
   */
  function updateUIControlsFromParams(params, preset) {
    // Update fractal type dropdown
    if (preset.fractal) {
      const fractalTypeSelect = document.getElementById('fractal-type');
      if (fractalTypeSelect) {
        fractalTypeSelect.value = preset.fractal;
      }
    }
    
    // Update color scheme dropdown
    if (preset.theme) {
      const colorSchemeSelect = document.getElementById('color-scheme');
      if (colorSchemeSelect) {
        colorSchemeSelect.value = preset.theme;
      }
    }
    
    // Update iterations slider and display to 250
    const iterationsSlider = document.getElementById('iterations');
    const iterationsValue = document.getElementById('iterations-value');
    const fullscreenIterationsNumber = document.getElementById('fullscreen-iterations-number');
    
    if (iterationsSlider) {
      iterationsSlider.value = 250;
    }
    if (iterationsValue) {
      iterationsValue.textContent = '250';
    }
    if (fullscreenIterationsNumber) {
      fullscreenIterationsNumber.textContent = '250';
    }
  }
  
  // Setup UI layout and displays
  setupUILayoutAndDisplays(appState, updateCoordinateDisplayFn, loadFractalFromPreset);

  // Initialize benchmark UI
  initBenchmarkUI(appState, renderingEngine, loadFractal);

  // Get the initial fractal type from the dropdown (defaults to mandelbrot if not found)
  initInitialFractalType(appState);

  // Initialize Wikipedia link
  updateWikipediaLinkFn();

  // Load initial fractal (from URL or default)
  await loadInitialFractal(appState, renderingEngine, loadFractal, updateWikipediaLinkFn, updateCoordinateDisplayFn);
}

/**
 * Bootstrap the application
 * Entry point that initializes everything and sets up event listeners
 */
function bootstrap() {
  // Initialize footer height tracking
  initFooterHeightTracking();

  // Initialize on load
  window.addEventListener('load', async () => {
    await init();
    updateFooterHeight();
  });
}

// Auto-bootstrap when module is loaded
bootstrap();

