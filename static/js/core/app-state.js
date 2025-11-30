/**
 * Application State Management Module
 * Centralizes all application state and provides getters/setters
 * Extracted after other modules to reduce dependencies on global state
 */

import { CONFIG } from './config.js';
import { FrameCache } from './frameCache.js';
import { WorkerPool } from '../workers/pool.js';
import { shouldEnableWorkerOptimizations } from '../workers/feature-detection.js';

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
      console.log(
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
   * Cleanup resources
   */
  cleanup() {
    if (this.frameCache) {
      this.frameCache.clear();
    }
    if (this.renderingEngine) {
      this.renderingEngine.cleanup();
    }
    if (this.workerPool) {
      this.workerPool.shutdown();
      this.workerPool = null;
    }
  }
}

// Export singleton instance
export const appState = new AppStateManager();
