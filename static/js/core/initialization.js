/**
 * Initialization Module
 * Handles all application initialization logic
 */

import { initCanvasRenderer } from '../rendering/canvas-renderer.js';
import { initLoadingBar } from '../ui/loading-bar.js';
import { initFPSTracker, startFPSTracking } from '../performance/fps-tracker.js';
import { cacheElement } from './dom-cache.js';
import { setupCoordinateCopy, updateCoordinateAndDebugDisplay } from '../ui/coordinate-display.js';
import { loadFractalFromURL } from '../sharing/state-manager.js';
// setupShareFractal is deferred using requestIdleCallback (non-critical for first render)
// Presets module is now lazy loaded when right panel is first opened (see panels.js)
import { updateWikipediaLink } from '../fractals/fractal-config.js';
import { initUILayout } from '../ui/panels.js';
import { setupMathInfoPanel } from '../ui/math-info-panel.js';
import { fractalLoader, loadFractal } from '../fractals/loader.js';
import { RenderingEngine } from '../rendering/engine.js';
import { setupInputControls, zoomToSelection } from '../input/controls.js';
import { setupUIControls } from '../ui/controls.js';
import { getRandomInterestingView } from '../fractals/random-view.js';
import { appState } from './app-state.js';
// Footer height tracking is deferred using requestIdleCallback (non-critical for first render)
import { getColorSchemeIndex, computeColorForScheme } from '../fractals/utils.js';
import { getWorkerCapabilities } from '../workers/feature-detection.js';
import { logSharedArrayBufferStatus } from '../workers/shared-array-buffer-utils.js';
import { logWasmSimdStatus } from '../workers/wasm-simd-utils.js';
import { CONFIG } from './config.js';
import { LongTaskDetector } from '../performance/long-task-detector.js';
import { lifecycleManager } from './lifecycle-manager.js';
import { idleCleanupManager } from './idle-cleanup.js';

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
 * Initialize footer social links from config
 */
function initFooterLinks() {
  const socialLinks = CONFIG.site.social;
  
  // GitHub link
  const githubLink = document.querySelector('[data-social="github"]');
  if (githubLink) {
    githubLink.href = socialLinks.github.url;
    githubLink.rel = socialLinks.github.rel;
    const labelEl = githubLink.querySelector('[data-social-label]');
    if (labelEl) {
      labelEl.textContent = socialLinks.github.label;
    }
  }
  
  // Mastodon link
  const mastodonLink = document.querySelector('[data-social="mastodon"]');
  if (mastodonLink) {
    mastodonLink.href = socialLinks.mastodon.url;
    mastodonLink.rel = socialLinks.mastodon.rel;
    const labelEl = mastodonLink.querySelector('[data-social-label]');
    if (labelEl) {
      labelEl.textContent = socialLinks.mastodon.label;
    }
  }
  
  // Bluesky link
  const blueskyLink = document.querySelector('[data-social="bluesky"]');
  if (blueskyLink) {
    blueskyLink.href = socialLinks.bluesky.url;
    blueskyLink.rel = socialLinks.bluesky.rel;
    const labelEl = blueskyLink.querySelector('[data-social-label]');
    if (labelEl) {
      labelEl.textContent = socialLinks.bluesky.label;
    }
  }
}

/**
 * Initialize canvas and WebGL renderer
 * @param {Object} appState - Application state instance
 * @returns {Object} Canvas, regl context, and updateRendererSize function
 */
async function initCanvasAndRenderer(appState) {
  const {
    canvas: canvasElement,
    regl: reglContext,
    webgpuRenderer,
    updateRendererSize: updateSize,
    webglCapabilities,
    rendererType,
  } = await initCanvasRenderer('fractal-canvas', {
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
  appState.setWebGLCapabilities(webglCapabilities);
  
  // Store WebGPU renderer if available
  if (webgpuRenderer) {
    appState.setWebGPURenderer(webgpuRenderer);
  }
  
  // Log renderer type in development
  if (import.meta.env?.DEV && rendererType) {
    console.log(
      `%c[Renderer]%c Using ${rendererType.toUpperCase()} renderer`,
      'color: #2196F3; font-weight: bold;',
      'color: inherit;'
    );
  }

  // Create UBO for WebGL2 if available
  if (webglCapabilities?.isWebGL2) {
    import('../rendering/uniform-buffer.js').then(({ createFractalParamsUBO }) => {
      const ubo = createFractalParamsUBO(reglContext, webglCapabilities);
      appState.setFractalParamsUBO(ubo);
      
      if (ubo && import.meta.env?.DEV) {
        console.log(
          '%c[WebGL2 UBO]%c Uniform Buffer Objects enabled for fractal parameters',
          'color: #4CAF50; font-weight: bold;',
          'color: inherit;'
        );
      }
    });
  }

  // Initialize occlusion query manager if WebGL2 and feature enabled
  if (CONFIG.features.occlusionQueries && webglCapabilities?.isWebGL2 && reglContext) {
    import('../rendering/occlusion-query.js').then(({ createOcclusionQueryManager }) => {
      const gl = reglContext._gl;
      if (gl) {
        const occlusionQueryManager = createOcclusionQueryManager(gl);
        if (occlusionQueryManager) {
          appState.setOcclusionQueryManager(occlusionQueryManager);
          if (import.meta.env?.DEV) {
            console.log(
              '%c[Occlusion Queries]%c Enabled for tile-based rendering optimization',
              'color: #4CAF50; font-weight: bold;',
              'color: inherit;'
            );
          }
        }
      }
    });
  }

  // Initialize adaptive quality manager if feature enabled
  if (CONFIG.features.adaptiveQuality) {
    import('../rendering/adaptive-quality.js').then(({ createAdaptiveQualityManager }) => {
      const adaptiveQualityManager = createAdaptiveQualityManager({
        targetFrameTime: CONFIG.performance?.maxFrameTime || 16.67,
      });
      appState.setAdaptiveQualityManager(adaptiveQualityManager);
      if (import.meta.env?.DEV) {
        console.log(
          '%c[Adaptive Quality]%c Enabled for dynamic quality adjustment',
          'color: #4CAF50; font-weight: bold;',
          'color: inherit;'
        );
      }
    });
  }

  // Initialize predictive rendering manager if feature enabled
  if (CONFIG.features.predictiveRendering) {
    import('../rendering/predictive-rendering.js').then(({ createPredictiveRenderingManager }) => {
      const predictiveRenderingManager = createPredictiveRenderingManager({
        maxPredictions: 3,
        velocityDecay: 0.9,
        minVelocity: 0.01,
        predictionDistance: 1.5,
      });
      appState.setPredictiveRenderingManager(predictiveRenderingManager);
      if (import.meta.env?.DEV) {
        console.log(
          '%c[Predictive Rendering]%c Enabled for pre-rendering likely next frames',
          'color: #4CAF50; font-weight: bold;',
          'color: inherit;'
        );
      }
    });
  }

  // Initialize multi-resolution rendering manager if feature enabled
  if (CONFIG.features.multiResolution) {
    import('../rendering/multi-resolution.js').then(({ createMultiResolutionManager }) => {
      const multiResolutionManager = createMultiResolutionManager({
        lowResScale: 0.5,
        enableHighRes: true,
        highResDelay: 100,
      });
      appState.setMultiResolutionManager(multiResolutionManager);
      if (import.meta.env?.DEV) {
        console.log(
          '%c[Multi-Resolution Rendering]%c Enabled for fast initial display and progressive quality',
          'color: #4CAF50; font-weight: bold;',
          'color: inherit;'
        );
      }
    });
  }

  // Initialize GPU timer if WebGL and timer query extension is available
  if (webglCapabilities && reglContext && CONFIG.features.timerQuery !== false) {
    import('../rendering/gpu-timer.js').then(({ createGPUTimer }) => {
      const gl = reglContext._gl;
      if (gl && webglCapabilities.features?.timerQuery) {
        const gpuTimer = createGPUTimer(gl, webglCapabilities);
        if (gpuTimer && gpuTimer.isGPUTimingAvailable()) {
          appState.setGPUTimer(gpuTimer);
          if (import.meta.env?.DEV) {
            console.log(
              '%c[GPU Timer]%c Enabled for accurate GPU timing',
              'color: #4CAF50; font-weight: bold;',
              'color: inherit;'
            );
          }
        }
      }
    });
  }

  // Initialize WebGL compute shader renderer if extension is available and feature is enabled
  if (
    webglCapabilities &&
    reglContext &&
    !webgpuRenderer &&
    CONFIG.features.computeShaders &&
    webglCapabilities.features?.computeShader
  ) {
    import('../rendering/webgl-compute-renderer.js').then(({ createWebGLComputeRenderer }) => {
      const gl = reglContext._gl;
      if (gl) {
        const computeRenderer = createWebGLComputeRenderer(gl, webglCapabilities);
        if (computeRenderer && computeRenderer.isComputeShaderAvailable()) {
          appState.setWebGLComputeRenderer(computeRenderer);
          if (import.meta.env?.DEV) {
            console.log(
              '%c[WebGL Compute]%c Compute shader rendering enabled',
              'color: #4CAF50; font-weight: bold;',
              'color: inherit;'
            );
          }
        }
      }
    });
  }

  // Initialize OffscreenCanvas renderer if feature is enabled
  if (canvasElement && CONFIG.features.offscreenCanvas && typeof OffscreenCanvas !== 'undefined') {
    import('../rendering/offscreen-renderer.js').then(({ createOffscreenRenderer }) => {
      const offscreenRenderer = createOffscreenRenderer(canvasElement);
      if (offscreenRenderer && offscreenRenderer.isOffscreenAvailable()) {
        appState.setOffscreenRenderer(offscreenRenderer);

        // Initialize UBO on offscreen context if WebGL2
        const offscreenRegl = offscreenRenderer.getOffscreenRegl();
        const offscreenCapabilities = offscreenRenderer.getOffscreenCapabilities();
        if (offscreenCapabilities?.isWebGL2 && offscreenRegl) {
          import('../rendering/uniform-buffer.js').then(({ createFractalParamsUBO }) => {
            const offscreenUBO = createFractalParamsUBO(offscreenRegl, offscreenCapabilities);
            if (offscreenUBO && import.meta.env?.DEV) {
              console.log(
                '%c[OffscreenCanvas UBO]%c Uniform Buffer Objects enabled for offscreen rendering',
                'color: #4CAF50; font-weight: bold;',
                'color: inherit;'
              );
            }
            // Store offscreen UBO in renderer for later use
            offscreenRenderer.offscreenUBO = offscreenUBO;
          });
        }

        if (import.meta.env?.DEV) {
          console.log(
            '%c[OffscreenCanvas]%c Non-blocking rendering enabled',
            'color: #4CAF50; font-weight: bold;',
            'color: inherit;'
          );
        }
      }
    });
  }

  // Initialize context loss handler if using WebGL
  if (canvasElement && reglContext && !webgpuRenderer) {
    import('../rendering/context-loss-handler.js').then(({ createContextLossHandler }) => {
      const contextLossHandler = createContextLossHandler(canvasElement, {
        saveState: () => appState.saveState(),
        restoreState: (savedState) => appState.restoreState(savedState),
        onContextLost: async (_savedState) => {
          // Clear WebGL-dependent resources
          appState.setRegl(null);
          appState.setWebGLCapabilities(null);
          appState.setFractalParamsUBO(null);
          appState.setDrawFractal(null);
          if (appState.getGPUTimer()) {
            appState.getGPUTimer().dispose();
            appState.setGPUTimer(null);
          }
          if (appState.getOcclusionQueryManager()) {
            appState.setOcclusionQueryManager(null);
          }
          // Clear frame cache since framebuffers are now invalid
          const frameCache = appState.getFrameCache();
          if (frameCache) {
            frameCache.clear();
          }
        },
        onContextRestored: async (_savedState) => {
          // Reinitialize WebGL resources
          await reinitializeWebGLResources(appState, canvasElement);
          
          // Reload current fractal to recreate draw function with new regl context
          const currentFractalType = appState.getCurrentFractalType();
          if (currentFractalType) {
            try {
              await loadFractal(currentFractalType);
            } catch (error) {
              console.error('[Context Restore] Failed to reload fractal:', error);
            }
          }
          
          // Trigger re-render after recovery
          const renderingEngine = appState.getRenderingEngine();
          if (renderingEngine) {
            renderingEngine.renderFractal();
          }
        },
      });
      appState.setContextLossHandler(contextLossHandler);
      if (import.meta.env?.DEV) {
        console.log(
          '%c[Context Loss Handler]%c Enabled for graceful context loss recovery',
          'color: #4CAF50; font-weight: bold;',
          'color: inherit;'
        );
      }
    });
  }

  return { canvasElement, reglContext, updateSize };
}

/**
 * Reinitialize WebGL resources after context restoration
 * @param {Object} appState - Application state instance
 * @param {HTMLCanvasElement} canvas - Canvas element
 */
async function reinitializeWebGLResources(appState, canvas) {
  const { CONFIG } = await import('./config.js');
  
  // Reinitialize regl
  const createRegl = (await import('regl')).default;
  const regl = createRegl({
    canvas,
    attributes: {
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: false,
      alpha: false,
      webglVersion: 2,
    },
  });
  appState.setRegl(regl);

  // Reinitialize WebGL capabilities
  if (regl) {
    try {
      const gl = regl._gl;
      if (gl) {
        const { detectWebGLCapabilities } = await import('../rendering/webgl-capabilities.js');
        const webglCapabilities = detectWebGLCapabilities(gl);
        appState.setWebGLCapabilities(webglCapabilities);

        // Reinitialize UBO if WebGL2
        if (webglCapabilities?.isWebGL2) {
          const { createFractalParamsUBO } = await import('../rendering/uniform-buffer.js');
          const ubo = createFractalParamsUBO(regl, webglCapabilities);
          appState.setFractalParamsUBO(ubo);
        }

        // Reinitialize occlusion query manager if enabled
        if (CONFIG.features.occlusionQueries && webglCapabilities?.isWebGL2) {
          const { createOcclusionQueryManager } = await import('../rendering/occlusion-query.js');
          const occlusionQueryManager = createOcclusionQueryManager(gl);
          if (occlusionQueryManager) {
            appState.setOcclusionQueryManager(occlusionQueryManager);
          }
        }

        // Reinitialize GPU timer if enabled
        if (CONFIG.features.timerQuery !== false && webglCapabilities.features?.timerQuery) {
          const { createGPUTimer } = await import('../rendering/gpu-timer.js');
          const gpuTimer = createGPUTimer(gl, webglCapabilities);
          if (gpuTimer && gpuTimer.isGPUTimingAvailable()) {
            appState.setGPUTimer(gpuTimer);
          }
        }

        // Reinitialize compute shader renderer if enabled
        if (
          CONFIG.features.computeShaders &&
          webglCapabilities.features?.computeShader
        ) {
          const { createWebGLComputeRenderer } = await import('../rendering/webgl-compute-renderer.js');
          const computeRenderer = createWebGLComputeRenderer(gl, webglCapabilities);
          if (computeRenderer && computeRenderer.isComputeShaderAvailable()) {
            appState.setWebGLComputeRenderer(computeRenderer);
          }
        }

        // Reinitialize offscreen renderer if enabled
        if (CONFIG.features.offscreenCanvas && typeof OffscreenCanvas !== 'undefined') {
          const { createOffscreenRenderer } = await import('../rendering/offscreen-renderer.js');
          const offscreenRenderer = createOffscreenRenderer(canvas);
          if (offscreenRenderer && offscreenRenderer.isOffscreenAvailable()) {
            appState.setOffscreenRenderer(offscreenRenderer);

            // Initialize UBO on offscreen context if WebGL2
            const offscreenRegl = offscreenRenderer.getOffscreenRegl();
            const offscreenCapabilities = offscreenRenderer.getOffscreenCapabilities();
            if (offscreenCapabilities?.isWebGL2 && offscreenRegl) {
              const { createFractalParamsUBO } = await import('../rendering/uniform-buffer.js');
              const offscreenUBO = createFractalParamsUBO(offscreenRegl, offscreenCapabilities);
              offscreenRenderer.offscreenUBO = offscreenUBO;
            }
          }
        }
      }
    } catch (error) {
      console.error('[Context Restore] Failed to reinitialize WebGL resources:', error);
    }
  }
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
 * @param {LongTaskDetector} longTaskDetector - Long task detector instance
 */
function setupCleanupHandlers(appState, longTaskDetector) {
  window.addEventListener('beforeunload', () => {
    // Stop long-task detection
    if (longTaskDetector) {
      longTaskDetector.stop();
    }

    // Stop idle cleanup
    idleCleanupManager.stop();

    // End current session
    lifecycleManager.endSession();

    // Cleanup app state
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
function setupUIControlsModule(
  appState,
  renderingEngine,
  loadFractal,
  updateWikipediaLink,
  updateCoordinateDisplay
) {
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
      getWebGLCapabilities: getters.getWebGLCapabilities,
      getFractalParamsUBO: getters.getFractalParamsUBO,
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
      getRenderingEngine: () => renderingEngine,
      cancelWorkerTasks: () => appState.cancelWorkerTasks(),
      resetPredictiveRendering: () => {
        const predictiveRenderingManager = appState.getPredictiveRenderingManager();
        if (predictiveRenderingManager) {
          predictiveRenderingManager.clear();
        }
      },
      getRandomInterestingView: () =>
        getRandomInterestingView({
          getCurrentFractalType: getters.getCurrentFractalType,
          getCurrentFractalModule: getters.getCurrentFractalModule,
          getParams: getters.getParams,
          getCanvas: getters.getCanvas,
        }),
      cancelProgressiveRender: () => renderingEngine.cancelProgressiveRender(),
      onFullscreenChange: (_isFullscreen) => {
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
        zoomToSelection(
          startX,
          startY,
          endX,
          endY,
          canvasRect,
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
 * @param {RenderingEngine} renderingEngine - Rendering engine instance
 * @param {Function} updateCoordinateDisplay - Update coordinate display function
 * @param {Function} loadFractalFromPreset - Load fractal from preset function
 */
function setupUILayoutAndDisplays(appState, renderingEngine, updateCoordinateDisplay, loadFractalFromPreset, loadFractalFn) {
  const getters = appState.getGetters();

  // Setup UI layout (collapsible sections and panel toggle) with lazy loading callbacks
  // Presets module is now lazy loaded when right panel is first opened (handled in panels.js)
  const setters = appState.getSetters();
  initUILayout(getters.getUpdateRendererSize, {
    getCurrentFractalType: getters.getCurrentFractalType,
    getParams: getters.getParams,
    updateParams: setters.updateParams,
    renderFractal: () => renderingEngine.renderFractal(),
    loadFractalFromPreset: loadFractalFromPreset,
  });

  // Setup mathematical information panel
  setupMathInfoPanel({
    getCurrentFractalType: getters.getCurrentFractalType,
    loadFractal: loadFractalFn,
  });

  // Setup coordinate display with getter functions
  setupCoordinateCopy(getters.getCurrentFractalType, getters.getParams);
  // Debug and EXIF editor are now lazy loaded when their sections are first opened
  // (handled in panels.js via lazyLoadCallbacks)
  // setupShareFractal is deferred using requestIdleCallback (see init function)
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
async function loadInitialFractal(
  appState,
  renderingEngine,
  loadFractal,
  updateWikipediaLink,
  updateCoordinateDisplay
) {
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
 * Directly update palette preview canvas (fallback for production builds)
 * @param {string} colorScheme - Color scheme name
 * @param {number} retries - Number of retry attempts (default: 3)
 */
function updatePalettePreviewDirectly(colorScheme, retries = 3) {
  const paletteCanvas = document.getElementById('fullscreen-color-palette');
  if (!paletteCanvas) {
    // Retry if canvas doesn't exist yet (might be timing issue in production)
    if (retries > 0) {
      setTimeout(() => updatePalettePreviewDirectly(colorScheme, retries - 1), 100);
    }
    return;
  }

  const ctx = paletteCanvas.getContext('2d');
  if (!ctx) {
    if (retries > 0) {
      setTimeout(() => updatePalettePreviewDirectly(colorScheme, retries - 1), 100);
    }
    return;
  }

  // Get canvas dimensions - prefer explicit width/height attributes, fallback to client dimensions
  let width = paletteCanvas.width;
  let height = paletteCanvas.height;

  // If width/height are 0 or not set, try to get from client dimensions or set defaults
  if (!width || width === 0) {
    width = paletteCanvas.clientWidth || 16;
    paletteCanvas.width = width;
  }
  if (!height || height === 0) {
    height = paletteCanvas.clientHeight || 16;
    paletteCanvas.height = height;
  }

  // Ensure canvas has valid dimensions
  if (!width || !height || width === 0 || height === 0) {
    if (retries > 0) {
      setTimeout(() => updatePalettePreviewDirectly(colorScheme, retries - 1), 100);
    }
    return;
  }

  const numColors = 8; // Number of color swatches to show

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Get the color scheme index
  const schemeIndex = getColorSchemeIndex(colorScheme);
  if (schemeIndex === -1) return;

  // Draw color swatches using the same color computation as utils.js
  const swatchWidth = width / numColors;
  for (let i = 0; i < numColors; i++) {
    const t = i / (numColors - 1);

    // Use the same color computation function as utils.js
    // Pre-allocate reusable color array to avoid allocations
    const colorOut = new Float32Array(3);
    const color = computeColorForScheme(t, schemeIndex, colorOut);

    // Draw the color swatch
    ctx.fillStyle = `rgb(${Math.floor(color[0] * 255)}, ${Math.floor(color[1] * 255)}, ${Math.floor(color[2] * 255)})`;
    ctx.fillRect(i * swatchWidth, 0, swatchWidth, height);
  }
}

/**
 * Create wrapper functions that use appState
 */
function createUpdateWikipediaLink() {
  return () => updateWikipediaLink(() => appState.getCurrentFractalType());
}

function createUpdateCoordinateDisplay() {
  return () =>
    updateCoordinateAndDebugDisplay(
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

  // Detect and configure worker optimizations
  const workerCapabilities = getWorkerCapabilities();
  if (workerCapabilities.recommended) {
    // Enable workers in config if browser supports them
    CONFIG.workers.enabled = true;
    // Log that worker optimizations are available (will be used when worker pool is created)
    console.log(
      `%c[Worker Optimizations]%c Available - Will be enabled when needed (${workerCapabilities.hardwareConcurrency} CPU cores, ${workerCapabilities.sharedArrayBuffer ? 'SharedArrayBuffer' : 'no SharedArrayBuffer'}, ${workerCapabilities.offscreenCanvas ? 'OffscreenCanvas' : 'no OffscreenCanvas'})`,
      'color: #2196F3; font-weight: bold;',
      'color: inherit;'
    );
  } else {
    CONFIG.workers.enabled = false;
    // Log why workers are disabled
    const reason = !workerCapabilities.workers
      ? 'Workers not supported'
      : workerCapabilities.hardwareConcurrency < CONFIG.workers.minCores
        ? `Insufficient CPU cores (${workerCapabilities.hardwareConcurrency} < ${CONFIG.workers.minCores})`
        : 'Unknown';
    console.log(
      `%c[Worker Optimizations]%c Disabled - ${reason}`,
      'color: #FF9800; font-weight: bold;',
      'color: inherit;'
    );
  }

  // Log SharedArrayBuffer status if enabled
  if (CONFIG.features.sharedArrayBuffer) {
    logSharedArrayBufferStatus();
  }

  // Log WASM SIMD status if enabled
  if (CONFIG.features.wasmSimd) {
    logWasmSimdStatus();
  }

  // Initialize DOM cache first
  initDOMCache();
  
  // Initialize footer social links from config
  initFooterLinks();

  // Initialize long-task detection
  const longTaskDetector = new LongTaskDetector({
    onLongTask: (task) => {
      // Log long tasks in development
      if (import.meta.env?.DEV) {
        console.warn(`[Long Task] ${task.duration.toFixed(2)}ms blocking operation detected`);
      }
    },
  });
  longTaskDetector.start();

  // Initialize idle cleanup
  idleCleanupManager.registerTask((deadline) => {
    // Trim frame cache during idle time
    const frameCache = appState.getFrameCache();
    if (frameCache && deadline.timeRemaining() > 0) {
      frameCache.trim();
    }
  }, 10); // High priority

  idleCleanupManager.registerTask((deadline) => {
    // Remove old cache entries (older than 5 minutes)
    const frameCache = appState.getFrameCache();
    if (frameCache && deadline.timeRemaining() > 0) {
      frameCache.removeOldEntries(5 * 60 * 1000); // 5 minutes
    }
  }, 20); // Medium priority

  idleCleanupManager.start();

  // Initialize canvas and renderer (WebGPU or WebGL)
  await initCanvasAndRenderer(appState);

  // Initialize rendering engine
  const renderingEngine = initRenderingEngine(appState);

  // Cleanup on page unload
  setupCleanupHandlers(appState, longTaskDetector);

  // Setup UI controls (after rendering engine is initialized)
  setupUIControlsModule(
    appState,
    renderingEngine,
    loadFractal,
    updateWikipediaLinkFn,
    updateCoordinateDisplayFn
  );

  // Setup input controls (after rendering engine is initialized)
  setupInputControlsModule(appState, renderingEngine, updateCoordinateDisplayFn);

  /**
   * Load fractal from preset data
   * @param {Object} preset - Preset configuration
   */
  function loadFractalFromPreset(preset) {
    // Start new lifecycle session for preset load
    lifecycleManager.startSession(
      'preset-load',
      preset.fractal || appState.getCurrentFractalType()
    );

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

      // Update palette preview after everything is loaded and rendered
      // Use requestAnimationFrame to ensure DOM is ready, then retry internally if needed
      if (preset.theme) {
        requestAnimationFrame(() => {
          updatePalettePreviewDirectly(preset.theme, 3);
        });
      }
    });
  }

  /**
   * Update UI controls to reflect parameter changes
   * @param {Object} params - Current parameters
   * @param {Object} preset - Preset data
   */
  function updateUIControlsFromParams(params, preset) {
    // Update fractal type dropdown
    // Note: We don't trigger the change event here because loadFractalFromPreset
    // handles the fractal loading itself. Triggering the event would cause a duplicate load.
    if (preset.fractal) {
      const fractalTypeSelect = document.getElementById('fractal-type');
      if (fractalTypeSelect) {
        fractalTypeSelect.value = preset.fractal;
        // Manually update Wikipedia link and coordinate display without triggering change event
        updateWikipediaLinkFn();
        updateCoordinateDisplayFn();
      }
    }

    // Update color scheme dropdown
    if (preset.theme) {
      const colorSchemeSelect = document.getElementById('color-scheme');
      if (colorSchemeSelect) {
        colorSchemeSelect.value = preset.theme;
        // Don't trigger change event - just update the UI directly to avoid timing issues in production
        // The change event listener in controls.js would trigger auto-render which we don't want here
      }
    }

    // Update iterations slider and display to 250
    const iterationsSlider = document.getElementById('iterations');
    const iterationsValue = document.getElementById('iterations-value');
    const fullscreenIterationsNumber = document.getElementById('fullscreen-iterations-number');

    if (iterationsSlider) {
      iterationsSlider.value = 250;
      // Don't trigger input event to avoid triggering auto-render (we'll render after fractal loads)
      // Just update the display value directly
    }
    if (iterationsValue) {
      iterationsValue.textContent = '250';
    }
    if (fullscreenIterationsNumber) {
      fullscreenIterationsNumber.textContent = '250';
    }
  }

  // Setup UI layout and displays
  setupUILayoutAndDisplays(appState, renderingEngine, updateCoordinateDisplayFn, loadFractalFromPreset, loadFractal);

  // Initialize benchmark UI
  initBenchmarkUI(appState, renderingEngine, loadFractal);

  // Get the initial fractal type from the dropdown (defaults to mandelbrot if not found)
  initInitialFractalType(appState);

  // Initialize Wikipedia link
  updateWikipediaLinkFn();

  // Load initial fractal (from URL or default)
  await loadInitialFractal(
    appState,
    renderingEngine,
    loadFractal,
    updateWikipediaLinkFn,
    updateCoordinateDisplayFn
  );

  // Defer non-critical initialization using requestIdleCallback
  // This allows the browser to prioritize rendering the first fractal
  const deferredInit = () => {
    const getters = appState.getGetters();
    const setters = appState.getSetters();

    // Setup share button (non-critical for first render)
    import('../sharing/state-manager.js')
      .then(({ setupShareFractal }) => {
        setupShareFractal(getters.getCurrentFractalType, getters.getParams);
      })
      .catch((error) => {
        console.error('Failed to load sharing module:', error);
      });

    // Setup discovery and favorites UI (non-critical for first render)
    import('../ui/discovery-ui.js')
      .then(({ initializeDiscoveryUI }) => {
        // Create callback to apply fractal state changes
        const onFractalStateChange = async (state) => {
          // Update fractal type if needed
          if (state.fractalType && state.fractalType !== getters.getCurrentFractalType()) {
            setters.setCurrentFractalType(state.fractalType);
            const fractalTypeSelect = document.getElementById('fractal-type');
            if (fractalTypeSelect) {
              fractalTypeSelect.value = state.fractalType;
            }
            await loadFractal(state.fractalType);
          }

          // Update parameters
          const params = getters.getParams();
          if (state.zoom !== undefined) params.zoom = state.zoom;
          if (state.offsetX !== undefined) params.offset.x = state.offsetX;
          if (state.offsetY !== undefined) params.offset.y = state.offsetY;
          if (state.iterations !== undefined) params.iterations = state.iterations;
          if (state.colorScheme !== undefined) params.colorScheme = state.colorScheme;
          if (state.xScale !== undefined) params.xScale = state.xScale;
          if (state.yScale !== undefined) params.yScale = state.yScale;
          if (state.juliaCX !== undefined && params.juliaC) params.juliaC.x = state.juliaCX;
          if (state.juliaCY !== undefined && params.juliaC) params.juliaC.y = state.juliaCY;

          // Update UI controls
          const iterationsSlider = document.getElementById('iterations');
          const iterationsValue = document.getElementById('iterations-value');
          if (iterationsSlider && state.iterations !== undefined) {
            iterationsSlider.value = state.iterations;
          }
          if (iterationsValue && state.iterations !== undefined) {
            iterationsValue.textContent = state.iterations;
          }

          const colorSchemeSelect = document.getElementById('color-scheme');
          if (colorSchemeSelect && state.colorScheme !== undefined) {
            colorSchemeSelect.value = state.colorScheme;
          }

          // Update fullscreen color palette preview if color scheme changed
          if (state.colorScheme !== undefined) {
            updatePalettePreviewDirectly(state.colorScheme, 3);
          }

          // Update coordinate display
          updateCoordinateDisplayFn();

          // Render the fractal
          renderingEngine.renderFractal();
        };

        initializeDiscoveryUI(getters, onFractalStateChange);
      })
      .catch((error) => {
        console.error('Failed to load discovery UI module:', error);
      });
  };

  // Use requestIdleCallback if available, otherwise use setTimeout with a small delay
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(deferredInit, { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(deferredInit, 100);
  }
}

/**
 * Bootstrap the application
 * Entry point that initializes everything and sets up event listeners
 */
function bootstrap() {
  // Initialize on load
  window.addEventListener('load', async () => {
    await init();

    // Defer footer height tracking using requestIdleCallback
    // This is non-critical for first render
    const deferredFooterInit = () => {
      import('../ui/footer-height.js')
        .then(({ initFooterHeightTracking, updateFooterHeight }) => {
          initFooterHeightTracking();
          updateFooterHeight();
        })
        .catch((error) => {
          console.error('Failed to load footer height module:', error);
        });
    };

    // Use requestIdleCallback if available, otherwise use setTimeout with a small delay
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(deferredFooterInit, { timeout: 2000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(deferredFooterInit, 100);
    }
  });
}

// Auto-bootstrap when module is loaded
bootstrap();
