import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { init } from '../../static/js/core/initialization.js';

// Mock all dependencies
vi.mock('../../static/js/rendering/canvas-renderer.js', () => ({
  initCanvasRenderer: vi.fn(() => ({
    canvas: document.createElement('canvas'),
    regl: { _gl: {} },
    updateRendererSize: vi.fn(),
    webglCapabilities: { isWebGL2: false },
  })),
}));

vi.mock('../../static/js/ui/loading-bar.js', () => ({
  initLoadingBar: vi.fn(),
}));

vi.mock('../../static/js/performance/fps-tracker.js', () => ({
  initFPSTracker: vi.fn(),
  startFPSTracking: vi.fn(),
}));

vi.mock('../../static/js/core/dom-cache.js', () => ({
  cacheElement: vi.fn(),
}));

vi.mock('../../static/js/ui/coordinate-display.js', () => ({
  setupCoordinateCopy: vi.fn(),
  updateCoordinateAndDebugDisplay: vi.fn(),
}));

vi.mock('../../static/js/sharing/state-manager.js', () => ({
  loadFractalFromURL: vi.fn(() => Promise.resolve(false)),
  setupShareFractal: vi.fn(),
}));

vi.mock('../../static/js/fractals/fractal-config.js', () => ({
  updateWikipediaLink: vi.fn(),
}));

vi.mock('../../static/js/ui/panels.js', () => ({
  initUILayout: vi.fn(),
}));

vi.mock('../../static/js/fractals/loader.js', () => ({
  fractalLoader: {
    getIsLoading: vi.fn(() => false),
  },
  loadFractal: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../static/js/rendering/engine.js', () => {
  const RenderingEngineClass = vi.fn().mockImplementation(function() {
    this.renderFractal = vi.fn();
    this.renderFractalProgressive = vi.fn();
    this.scheduleRender = vi.fn();
    this.startAnimation = vi.fn();
    this.cancelProgressiveRender = vi.fn();
  });
  return { RenderingEngine: RenderingEngineClass };
});

vi.mock('../../static/js/input/controls.js', () => ({
  setupInputControls: vi.fn(),
  zoomToSelection: vi.fn(),
}));

vi.mock('../../static/js/ui/controls.js', () => ({
  setupUIControls: vi.fn(),
}));

vi.mock('../../static/js/fractals/random-view.js', () => ({
  getRandomInterestingView: vi.fn(() => ({})),
}));

vi.mock('../../static/js/core/app-state.js', () => ({
  appState: {
    getParams: vi.fn(() => ({ zoom: 1, offset: { x: 0, y: 0 } })),
    getCurrentFractalType: vi.fn(() => 'mandelbrot'),
    getRenderingEngine: vi.fn(() => null),
    getFrameCache: vi.fn(() => ({
      trim: vi.fn(),
      removeOldEntries: vi.fn(),
      clear: vi.fn(),
    })),
    getGPUTimer: vi.fn(() => null),
    getOcclusionQueryManager: vi.fn(() => null),
    getGetters: vi.fn(() => ({
      getParams: vi.fn(() => ({ zoom: 1, offset: { x: 0, y: 0 } })),
      getCurrentFractalType: vi.fn(() => 'mandelbrot'),
      getCurrentFractalModule: vi.fn(() => null),
      getDrawFractal: vi.fn(() => null),
      getCachedDrawCommand: vi.fn(() => null),
      getIsDisplayingCached: vi.fn(() => false),
      getRegl: vi.fn(() => ({})),
      getCanvas: vi.fn(() => document.createElement('canvas')),
      getUpdateRendererSize: vi.fn(() => vi.fn()),
      getRenderingEngine: vi.fn(() => null),
      getFrameCache: vi.fn(() => ({
        trim: vi.fn(),
        removeOldEntries: vi.fn(),
      })),
    })),
    getSetters: vi.fn(() => ({
      setCurrentFractalType: vi.fn(),
      setDrawFractal: vi.fn(),
      setCachedDrawCommand: vi.fn(),
      setIsDisplayingCached: vi.fn(),
      setMultiResolutionManager: vi.fn(),
      setAdaptiveQualityManager: vi.fn(),
      setPredictiveRenderingManager: vi.fn(),
      setOcclusionQueryManager: vi.fn(),
    })),
    setCanvas: vi.fn(),
    setRegl: vi.fn(),
    setUpdateRendererSize: vi.fn(),
    setWebGLCapabilities: vi.fn(),
    setRenderingEngine: vi.fn(),
    setFractalParamsUBO: vi.fn(),
    setCurrentFractalType: vi.fn(),
    setMultiResolutionManager: vi.fn(),
    setAdaptiveQualityManager: vi.fn(),
    setPredictiveRenderingManager: vi.fn(),
    setOcclusionQueryManager: vi.fn(),
    setContextLossHandler: vi.fn(),
    setGPUTimer: vi.fn(),
    setWebGLComputeRenderer: vi.fn(),
    setOffscreenRenderer: vi.fn(),
    setWebGPURenderer: vi.fn(),
    cancelWorkerTasks: vi.fn(),
    cleanup: vi.fn(),
  },
}));

vi.mock('../../static/js/fractals/utils.js', () => ({
  getColorSchemeIndex: vi.fn(() => 0),
  computeColorForScheme: vi.fn(() => [0, 0, 0]),
}));

vi.mock('../../static/js/workers/feature-detection.js', () => ({
  getWorkerCapabilities: vi.fn(() => ({
    recommended: true,
    workers: true,
    hardwareConcurrency: 4,
    sharedArrayBuffer: false,
    offscreenCanvas: false,
  })),
}));

vi.mock('../../static/js/core/config.js', () => ({
  CONFIG: {
    workers: {
      enabled: false,
      minCores: 2,
    },
    features: {
      sharedArrayBuffer: false,
      wasmSimd: false,
      webgpu: false,
      computeShaders: false,
      offscreenCanvas: true,
      webCodecs: false,
      occlusionQueries: true,
      adaptiveQuality: true,
      predictiveRendering: false,
      multiResolution: true,
    },
    performance: {
      targetFPS: 60,
      maxFrameTime: 16.67,
      qualitySteps: [0.5, 0.75, 1.0, 1.5, 2.0],
    },
  },
}));

vi.mock('../../static/js/performance/long-task-detector.js', () => {
  const mockStart = vi.fn();
  const mockStop = vi.fn();
  const LongTaskDetectorClass = vi.fn().mockImplementation(function() {
    this.start = mockStart;
    this.stop = mockStop;
  });
  return {
    LongTaskDetector: LongTaskDetectorClass,
  };
});

vi.mock('../../static/js/core/lifecycle-manager.js', () => ({
  lifecycleManager: {
    endSession: vi.fn(),
  },
}));

vi.mock('../../static/js/core/idle-cleanup.js', () => ({
  idleCleanupManager: {
    registerTask: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock('../../static/js/rendering/uniform-buffer.js', () => ({
  createFractalParamsUBO: vi.fn(() => ({})),
}));

vi.mock('../../static/js/rendering/occlusion-query.js', () => ({
  createOcclusionQueryManager: vi.fn(() => ({})),
}));

vi.mock('../../static/js/rendering/adaptive-quality.js', () => ({
  createAdaptiveQualityManager: vi.fn(() => ({
    adjustQuality: vi.fn(),
    recordFrameTime: vi.fn(),
  })),
}));

vi.mock('../../static/js/rendering/predictive-rendering.js', () => ({
  createPredictiveRenderingManager: vi.fn(() => ({
    predictNextFrame: vi.fn(),
    updateVelocity: vi.fn(),
  })),
}));

vi.mock('../../static/js/rendering/multi-resolution.js', () => ({
  createMultiResolutionManager: vi.fn(() => ({
    renderLowRes: vi.fn(),
    renderHighRes: vi.fn(),
  })),
}));

describe('initialization module', () => {
  let originalConsoleLog;
  let originalConsoleWarn;
  let originalConsoleError;
  let originalRequestIdleCallback;
  let originalSetTimeout;

  beforeEach(() => {
    // Mock console methods
    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();

    // Mock requestIdleCallback
    originalRequestIdleCallback = global.requestIdleCallback;
    global.requestIdleCallback = vi.fn((callback) => {
      setTimeout(() => {
        callback({ timeRemaining: () => 50, didTimeout: false });
      }, 0);
      return 123;
    });

    // Mock setTimeout
    originalSetTimeout = global.setTimeout;
    global.setTimeout = vi.fn((fn, delay) => {
      return originalSetTimeout(fn, delay || 0);
    });

    // Mock import.meta.env
    global.import = { meta: { env: { DEV: false } } };

    // Mock WebGL2RenderingContext for occlusion query tests
    global.WebGL2RenderingContext = class WebGL2RenderingContext {};

    // Setup DOM elements
    document.body.innerHTML = `
      <select id="fractal-type"><option value="mandelbrot">Mandelbrot</option></select>
      <div class="top-action-bar"></div>
    `;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    global.requestIdleCallback = originalRequestIdleCallback;
    global.setTimeout = originalSetTimeout;
    vi.clearAllMocks();
  });

  it('exports init function', () => {
    expect(init).toBeTypeOf('function');
  });

  it('should initialize the application', async () => {
    const { cacheElement } = await import('../../static/js/core/dom-cache.js');
    const { initLoadingBar } = await import('../../static/js/ui/loading-bar.js');
    const { initFPSTracker } = await import('../../static/js/performance/fps-tracker.js');
    const { initCanvasRenderer } = await import('../../static/js/rendering/canvas-renderer.js');
    const { appState } = await import('../../static/js/core/app-state.js');
    const { LongTaskDetector: _LongTaskDetector } = await import('../../static/js/performance/long-task-detector.js');
    const { idleCleanupManager } = await import('../../static/js/core/idle-cleanup.js');
    const { RenderingEngine: _RenderingEngine } = await import('../../static/js/rendering/engine.js');
    const { setupUIControls } = await import('../../static/js/ui/controls.js');
    const { setupInputControls } = await import('../../static/js/input/controls.js');
    const { initUILayout } = await import('../../static/js/ui/panels.js');
    const { setupCoordinateCopy } = await import('../../static/js/ui/coordinate-display.js');
    const { loadFractalFromURL } = await import('../../static/js/sharing/state-manager.js');
    const { loadFractal } = await import('../../static/js/fractals/loader.js');
    const { updateWikipediaLink } = await import('../../static/js/fractals/fractal-config.js');

    await init();

    // Verify DOM cache initialization
    expect(cacheElement).toHaveBeenCalledWith('coord-zoom');
    expect(cacheElement).toHaveBeenCalledWith('coord-offset-x');
    expect(cacheElement).toHaveBeenCalledWith('coord-offset-y');
    expect(cacheElement).toHaveBeenCalledWith('copy-coords-btn');
    expect(initLoadingBar).toHaveBeenCalled();
    expect(initFPSTracker).toHaveBeenCalledWith('fps');

    // Verify canvas initialization
    expect(initCanvasRenderer).toHaveBeenCalled();
    expect(appState.setCanvas).toHaveBeenCalled();
    expect(appState.setRegl).toHaveBeenCalled();
    expect(appState.setUpdateRendererSize).toHaveBeenCalled();
    expect(appState.setWebGLCapabilities).toHaveBeenCalled();

    // Verify long task detector
    const { LongTaskDetector: LongTaskDetectorClass } = await import('../../static/js/performance/long-task-detector.js');
    expect(LongTaskDetectorClass).toHaveBeenCalled();
    const longTaskDetectorInstance = LongTaskDetectorClass.mock.results[0].value;
    expect(longTaskDetectorInstance.start).toHaveBeenCalled();

    // Verify idle cleanup
    expect(idleCleanupManager.registerTask).toHaveBeenCalled();
    expect(idleCleanupManager.start).toHaveBeenCalled();

    // Verify rendering engine
    const { RenderingEngine: RenderingEngineClass } = await import('../../static/js/rendering/engine.js');
    expect(RenderingEngineClass).toHaveBeenCalled();
    expect(appState.setRenderingEngine).toHaveBeenCalled();

    // Verify UI controls setup
    expect(setupUIControls).toHaveBeenCalled();
    expect(setupInputControls).toHaveBeenCalled();
    expect(initUILayout).toHaveBeenCalled();
    expect(setupCoordinateCopy).toHaveBeenCalled();

    // Verify fractal loading
    expect(loadFractalFromURL).toHaveBeenCalled();
    expect(loadFractal).toHaveBeenCalled();
    expect(updateWikipediaLink).toHaveBeenCalled();
  });

  it('should handle worker capabilities when recommended', async () => {
    const { getWorkerCapabilities } = await import('../../static/js/workers/feature-detection.js');
    const { CONFIG } = await import('../../static/js/core/config.js');

    getWorkerCapabilities.mockReturnValue({
      recommended: true,
      workers: true,
      hardwareConcurrency: 4,
      sharedArrayBuffer: false,
      offscreenCanvas: false,
    });

    await init();

    expect(CONFIG.workers.enabled).toBe(true);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[Worker Optimizations]'),
      expect.any(String),
      expect.any(String)
    );
  });

  it('should handle worker capabilities when not recommended', async () => {
    const { getWorkerCapabilities } = await import('../../static/js/workers/feature-detection.js');
    const { CONFIG } = await import('../../static/js/core/config.js');

    getWorkerCapabilities.mockReturnValue({
      recommended: false,
      workers: false,
      hardwareConcurrency: 1,
      sharedArrayBuffer: false,
      offscreenCanvas: false,
    });

    await init();

    expect(CONFIG.workers.enabled).toBe(false);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[Worker Optimizations]'),
      expect.any(String),
      expect.any(String)
    );
  });

  it('should handle worker capabilities with insufficient cores', async () => {
    const { getWorkerCapabilities } = await import('../../static/js/workers/feature-detection.js');
    const { CONFIG } = await import('../../static/js/core/config.js');

    getWorkerCapabilities.mockReturnValue({
      recommended: false,
      workers: true,
      hardwareConcurrency: 1,
      sharedArrayBuffer: false,
      offscreenCanvas: false,
    });

    await init();

    expect(CONFIG.workers.enabled).toBe(false);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Insufficient CPU cores'),
      expect.any(String),
      expect.any(String)
    );
  });

  it('should create UBO for WebGL2', async () => {
    const { initCanvasRenderer } = await import('../../static/js/rendering/canvas-renderer.js');
    const { createFractalParamsUBO } = await import('../../static/js/rendering/uniform-buffer.js');
    const { appState } = await import('../../static/js/core/app-state.js');

    initCanvasRenderer.mockReturnValue({
      canvas: document.createElement('canvas'),
      regl: { _gl: {} },
      updateRendererSize: vi.fn(),
      webglCapabilities: { isWebGL2: true },
    });

    // Wait for the dynamic import to complete
    await init();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(createFractalParamsUBO).toHaveBeenCalled();
    expect(appState.setFractalParamsUBO).toHaveBeenCalled();
  });

  it('should handle loadFractalFromURL returning true', async () => {
    const { loadFractalFromURL } = await import('../../static/js/sharing/state-manager.js');
    const { startFPSTracking } = await import('../../static/js/performance/fps-tracker.js');
    const { loadFractal } = await import('../../static/js/fractals/loader.js');

    loadFractalFromURL.mockResolvedValue(true);

    await init();

    expect(startFPSTracking).toHaveBeenCalled();
    const { RenderingEngine: RenderingEngineClass } = await import('../../static/js/rendering/engine.js');
    const renderingEngine = RenderingEngineClass.mock.results[0].value;
    expect(renderingEngine.startAnimation).toHaveBeenCalled();
    // Should not call loadFractal when loaded from URL
    expect(loadFractal).not.toHaveBeenCalled();
  });

  it('should handle loadFractalFromURL returning false', async () => {
    const { loadFractalFromURL } = await import('../../static/js/sharing/state-manager.js');
    const { startFPSTracking } = await import('../../static/js/performance/fps-tracker.js');
    const { RenderingEngine } = await import('../../static/js/rendering/engine.js');
    const { loadFractal } = await import('../../static/js/fractals/loader.js');

    loadFractalFromURL.mockResolvedValue(false);

    await init();
    // Wait for loadFractal promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(loadFractal).toHaveBeenCalled();
    expect(startFPSTracking).toHaveBeenCalled();
    const renderingEngine = RenderingEngine.mock.results[0].value;
    expect(renderingEngine.startAnimation).toHaveBeenCalled();
  });

  it('should setup cleanup handlers', async () => {
    const { LongTaskDetector: LongTaskDetectorClass } = await import('../../static/js/performance/long-task-detector.js');
    const { lifecycleManager } = await import('../../static/js/core/lifecycle-manager.js');
    const { idleCleanupManager } = await import('../../static/js/core/idle-cleanup.js');
    const { appState } = await import('../../static/js/core/app-state.js');

    await init();

    // Trigger beforeunload event
    const beforeunloadEvent = new Event('beforeunload');
    window.dispatchEvent(beforeunloadEvent);

    const longTaskDetectorInstance = LongTaskDetectorClass.mock.results[0].value;
    expect(longTaskDetectorInstance.stop).toHaveBeenCalled();
    expect(idleCleanupManager.stop).toHaveBeenCalled();
    expect(lifecycleManager.endSession).toHaveBeenCalled();
    expect(appState.cleanup).toHaveBeenCalled();
  });

  it('should handle requestIdleCallback fallback', async () => {
    delete global.requestIdleCallback;

    await init();

    // Should use setTimeout as fallback
    expect(global.setTimeout).toHaveBeenCalled();
  });

  it('should handle deferred initialization', async () => {
    await init();

    // Wait for requestIdleCallback
    await new Promise((resolve) => setTimeout(resolve, 10));

    // The deferred init should have been called
    expect(global.requestIdleCallback).toHaveBeenCalled();
  });

  it('should handle deferred initialization error', async () => {
    const sharingModule = await import('../../static/js/sharing/state-manager.js');
    sharingModule.setupShareFractal.mockImplementation(() => {
      throw new Error('Test error');
    });

    await init();

    // Wait for requestIdleCallback
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(console.error).toHaveBeenCalledWith(
      'Failed to load sharing module:',
      expect.any(Error)
    );
  });

  it('should initialize initial fractal type from dropdown', async () => {
    const { appState } = await import('../../static/js/core/app-state.js');
    // Reset the mock to clear previous calls
    appState.setCurrentFractalType.mockClear();

    // Create a fresh DOM with the select element
    document.body.innerHTML = `
      <select id="fractal-type"><option value="julia">Julia</option></select>
      <div class="top-action-bar"></div>
    `;
    const fractalTypeSelect = document.getElementById('fractal-type');
    fractalTypeSelect.value = 'julia';

    await init();

    expect(appState.setCurrentFractalType).toHaveBeenCalledWith('julia');
  });

  it('should handle missing fractal type select', async () => {
    document.getElementById('fractal-type').remove();

    await init();

    // Should not throw
    expect(true).toBe(true);
  });
});
