/**
 * Application State Management Module
 * Centralizes all application state and provides getters/setters
 * Extracted after other modules to reduce dependencies on global state
 */

import { CONFIG } from './config.js';
import { FrameCache } from './frameCache.js';
import { WorkerPool } from '../workers/pool.js';
import { shouldEnableWorkerOptimizations } from '../workers/feature-detection.js';
import { devLog } from './logger.js';

/**
 * Application State Manager
 * Manages all global application state with getters and setters
 */
export class AppStateManager {
  constructor() {
    // Rendering context and canvas
    this.regl = null;
    this.canvas = null;
    this.updateRendererSize = null;
    this.webglCapabilities = null;
    this.fractalParamsUBO = null; // Uniform Buffer Object for WebGL2
    this.webgpuRenderer = null; // WebGPU renderer (if available)
    this.occlusionQueryManager = null; // Occlusion query manager for tile-based rendering
    this.adaptiveQualityManager = null; // Adaptive quality manager
    this.predictiveRenderingManager = null; // Predictive rendering manager
    this.multiResolutionManager = null; // Multi-resolution rendering manager
    this.gpuTimer = null; // GPU timer for accurate GPU timing
    this.contextLossHandler = null; // Context loss handler
    this.webglComputeRenderer = null; // WebGL compute shader renderer
    this.offscreenRenderer = null; // OffscreenCanvas renderer for non-blocking rendering

    // Fractal state
    this.currentFractalType = CONFIG.fractal.defaultType;
    this.currentFractalModule = null;
    this.drawFractal = null;

    // Rendering state
    this.needsRender = false;
    this.isDisplayingCached = false;
    this.cachedDrawCommand = null;
    this.isProgressiveRendering = false;
    this.currentProgressiveIterations = 0;
    this.targetIterations = 0;

    // Frame cache
    const MAX_CACHE_SIZE = CONFIG.rendering.cacheSize || 10;
    this.frameCache = new FrameCache(MAX_CACHE_SIZE);

    // Rendering engine reference
    this.renderingEngine = null;

    // Worker pool (lazy initialized)
    this.workerPool = null;

    // Fractal parameters
    this.params = {
      iterations: CONFIG.rendering.defaultIterations,
      colorScheme: CONFIG.colors.defaultScheme,
      juliaC: { ...CONFIG.julia.defaultC },
      center: { x: 0, y: 0 },
      zoom: CONFIG.zoom.defaultZoom,
      offset: { x: 0, y: 0 },
      xScale: 1.0,
      yScale: 1.0,
    };
  }

  // Getters
  getRegl() {
    return this.regl;
  }
  getCanvas() {
    return this.canvas;
  }
  getUpdateRendererSize() {
    return this.updateRendererSize;
  }
  getWebGLCapabilities() {
    return this.webglCapabilities;
  }
  getFractalParamsUBO() {
    return this.fractalParamsUBO;
  }
  getWebGPURenderer() {
    return this.webgpuRenderer;
  }
  getOcclusionQueryManager() {
    return this.occlusionQueryManager;
  }
  getAdaptiveQualityManager() {
    return this.adaptiveQualityManager;
  }
  getPredictiveRenderingManager() {
    return this.predictiveRenderingManager;
  }
  getMultiResolutionManager() {
    return this.multiResolutionManager;
  }
  getGPUTimer() {
    return this.gpuTimer;
  }
  getContextLossHandler() {
    return this.contextLossHandler;
  }
  getWebGLComputeRenderer() {
    return this.webglComputeRenderer;
  }
  getOffscreenRenderer() {
    return this.offscreenRenderer;
  }
  getCurrentFractalType() {
    return this.currentFractalType;
  }
  getCurrentFractalModule() {
    return this.currentFractalModule;
  }
  getDrawFractal() {
    return this.drawFractal;
  }
  getNeedsRender() {
    return this.needsRender;
  }
  getIsDisplayingCached() {
    return this.isDisplayingCached;
  }
  getCachedDrawCommand() {
    return this.cachedDrawCommand;
  }
  getIsProgressiveRendering() {
    return this.isProgressiveRendering;
  }
  getCurrentProgressiveIterations() {
    return this.currentProgressiveIterations;
  }
  getTargetIterations() {
    return this.targetIterations;
  }
  getFrameCache() {
    return this.frameCache;
  }
  getRenderingEngine() {
    return this.renderingEngine;
  }
  getParams() {
    return this.params;
  }
  getWorkerPool() {
    // Lazy initialization of worker pool (only if feature is enabled)
    if (!this.workerPool && this.areWorkersEnabled()) {
      const maxWorkers = Math.min(
        CONFIG.workers.maxWorkers,
        Math.max(1, (navigator.hardwareConcurrency || 4) - 1)
      );
      this.workerPool = new WorkerPool({
        maxWorkers,
        minWorkers: 1,
      });

      // Log that worker optimizations are being used
      devLog.log(
        `%c[Worker Optimizations]%c Enabled with ${maxWorkers} worker(s) (${navigator.hardwareConcurrency || 4} CPU cores detected)`,
        'color: #4CAF50; font-weight: bold;',
        'color: inherit;'
      );
    }
    return this.workerPool;
  }

  /**
   * Check if worker optimizations are enabled
   * @returns {boolean}
   */
  areWorkersEnabled() {
    // Check config flag first
    if (!CONFIG.workers.enabled) {
      return false;
    }

    // Check browser compatibility
    return shouldEnableWorkerOptimizations({
      requireSharedArrayBuffer: CONFIG.workers.requireSharedArrayBuffer,
      minCores: CONFIG.workers.minCores,
    });
  }

  /**
   * Cancel all pending worker tasks
   * Useful when switching fractal types or parameters
   */
  cancelWorkerTasks() {
    if (this.workerPool) {
      // Cancel all pending tasks (empty array cancels all)
      this.workerPool.cancelTiles([]);
    }
  }

  // Setters
  setRegl(value) {
    this.regl = value;
  }
  setCanvas(value) {
    this.canvas = value;
  }
  setUpdateRendererSize(value) {
    this.updateRendererSize = value;
  }
  setWebGLCapabilities(value) {
    this.webglCapabilities = value;
  }
  setFractalParamsUBO(value) {
    this.fractalParamsUBO = value;
  }
  setWebGPURenderer(value) {
    this.webgpuRenderer = value;
  }
  setOcclusionQueryManager(value) {
    this.occlusionQueryManager = value;
  }
  setAdaptiveQualityManager(value) {
    this.adaptiveQualityManager = value;
  }
  setPredictiveRenderingManager(value) {
    this.predictiveRenderingManager = value;
  }
  setMultiResolutionManager(value) {
    this.multiResolutionManager = value;
  }
  setGPUTimer(value) {
    this.gpuTimer = value;
  }
  setContextLossHandler(value) {
    this.contextLossHandler = value;
  }
  setWebGLComputeRenderer(value) {
    this.webglComputeRenderer = value;
  }
  setOffscreenRenderer(value) {
    this.offscreenRenderer = value;
  }
  setCurrentFractalType(value) {
    this.currentFractalType = value;
  }
  setCurrentFractalModule(value) {
    this.currentFractalModule = value;
  }
  setDrawFractal(value) {
    this.drawFractal = value;
  }
  setNeedsRender(value) {
    this.needsRender = value;
  }
  setIsDisplayingCached(value) {
    this.isDisplayingCached = value;
  }
  setCachedDrawCommand(value) {
    this.cachedDrawCommand = value;
  }
  setIsProgressiveRendering(value) {
    this.isProgressiveRendering = value;
  }
  setCurrentProgressiveIterations(value) {
    this.currentProgressiveIterations = value;
  }
  setTargetIterations(value) {
    this.targetIterations = value;
  }
  setRenderingEngine(value) {
    this.renderingEngine = value;
  }
  updateParams(updates) {
    Object.assign(this.params, updates);
  }

  /**
   * Get getters object for passing to modules
   * @returns {Object} Object with all getter functions
   */
  getGetters() {
    return {
      getRegl: () => this.getRegl(),
      getWebGLCapabilities: () => this.getWebGLCapabilities(),
      getFractalParamsUBO: () => this.getFractalParamsUBO(),
      getWebGPURenderer: () => this.getWebGPURenderer(),
      getOcclusionQueryManager: () => this.getOcclusionQueryManager(),
      getAdaptiveQualityManager: () => this.getAdaptiveQualityManager(),
      getPredictiveRenderingManager: () => this.getPredictiveRenderingManager(),
      getMultiResolutionManager: () => this.getMultiResolutionManager(),
      getGPUTimer: () => this.getGPUTimer(),
      getWebGLComputeRenderer: () => this.getWebGLComputeRenderer(),
      getOffscreenRenderer: () => this.getOffscreenRenderer(),
      getCanvas: () => this.getCanvas(),
      getUpdateRendererSize: () => this.getUpdateRendererSize(),
      getCurrentFractalType: () => this.getCurrentFractalType(),
      getCurrentFractalModule: () => this.getCurrentFractalModule(),
      getDrawFractal: () => this.getDrawFractal(),
      getNeedsRender: () => this.getNeedsRender(),
      getIsDisplayingCached: () => this.getIsDisplayingCached(),
      getCachedDrawCommand: () => this.getCachedDrawCommand(),
      getIsProgressiveRendering: () => this.getIsProgressiveRendering(),
      getCurrentProgressiveIterations: () => this.getCurrentProgressiveIterations(),
      getTargetIterations: () => this.getTargetIterations(),
      getFrameCache: () => this.getFrameCache(),
      getRenderingEngine: () => this.getRenderingEngine(),
      getParams: () => this.getParams(),
    };
  }

  /**
   * Get setters object for passing to modules
   * @returns {Object} Object with all setter functions
   */
  getSetters() {
    return {
      setRegl: (value) => this.setRegl(value),
      setCanvas: (value) => this.setCanvas(value),
      setUpdateRendererSize: (value) => this.setUpdateRendererSize(value),
      setWebGPURenderer: (value) => this.setWebGPURenderer(value),
      setOcclusionQueryManager: (value) => this.setOcclusionQueryManager(value),
      setAdaptiveQualityManager: (value) => this.setAdaptiveQualityManager(value),
      setPredictiveRenderingManager: (value) => this.setPredictiveRenderingManager(value),
      setMultiResolutionManager: (value) => this.setMultiResolutionManager(value),
      setGPUTimer: (value) => this.setGPUTimer(value),
      setCurrentFractalType: (value) => this.setCurrentFractalType(value),
      setCurrentFractalModule: (value) => this.setCurrentFractalModule(value),
      setDrawFractal: (value) => this.setDrawFractal(value),
      setNeedsRender: (value) => this.setNeedsRender(value),
      setIsDisplayingCached: (value) => this.setIsDisplayingCached(value),
      setCachedDrawCommand: (value) => this.setCachedDrawCommand(value),
      setIsProgressiveRendering: (value) => this.setIsProgressiveRendering(value),
      setCurrentProgressiveIterations: (value) => this.setCurrentProgressiveIterations(value),
      setTargetIterations: (value) => this.setTargetIterations(value),
      setRenderingEngine: (value) => this.setRenderingEngine(value),
      updateParams: (updates) => this.updateParams(updates),
    };
  }

  /**
   * Get dependencies object for passing to modules
   * @returns {Object} Object with dependency instances
   */
  getDependencies() {
    return {
      frameCache: this.frameCache,
    };
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this.currentFractalType = CONFIG.fractal.defaultType;
    this.currentFractalModule = null;
    this.drawFractal = null;
    this.needsRender = false;
    this.isDisplayingCached = false;
    this.cachedDrawCommand = null;
    this.isProgressiveRendering = false;
    this.currentProgressiveIterations = 0;
    this.targetIterations = 0;
    this.params = {
      iterations: CONFIG.rendering.defaultIterations,
      colorScheme: CONFIG.colors.defaultScheme,
      juliaC: { ...CONFIG.julia.defaultC },
      center: { x: 0, y: 0 },
      zoom: CONFIG.zoom.defaultZoom,
      offset: { x: 0, y: 0 },
      xScale: 1.0,
      yScale: 1.0,
    };
  }

  /**
   * Save application state for context loss recovery
   * @returns {Object} Saved state object
   */
  saveState() {
    return {
      currentFractalType: this.currentFractalType,
      params: { ...this.params },
      targetIterations: this.targetIterations,
    };
  }

  /**
   * Restore application state after context recovery
   * @param {Object} savedState - Saved state object
   */
  restoreState(savedState) {
    if (!savedState) return;

    if (savedState.currentFractalType) {
      this.currentFractalType = savedState.currentFractalType;
    }
    if (savedState.params) {
      this.params = { ...savedState.params };
    }
    if (savedState.targetIterations !== undefined) {
      this.targetIterations = savedState.targetIterations;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.frameCache) {
      this.frameCache.clear();
    }
    if (this.renderingEngine) {
      this.renderingEngine.cleanup();
    }
    if (this.predictiveRenderingManager) {
      this.predictiveRenderingManager.clear();
    }
    if (this.multiResolutionManager) {
      this.multiResolutionManager.cleanup();
    }
    if (this.gpuTimer) {
      this.gpuTimer.dispose();
    }
    if (this.contextLossHandler) {
      this.contextLossHandler.dispose();
    }
    if (this.webglComputeRenderer) {
      this.webglComputeRenderer.dispose();
    }
    if (this.offscreenRenderer) {
      this.offscreenRenderer.dispose();
    }
    if (this.workerPool) {
      this.workerPool.shutdown();
      this.workerPool = null;
    }
  }
}

// Export singleton instance
export const appState = new AppStateManager();
