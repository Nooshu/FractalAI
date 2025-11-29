/**
 * Configuration constants for the FractalAI application
 * Centralizes all magic numbers and configuration values
 */

export const CONFIG = {
  rendering: {
    defaultIterations: 125,
    minIterations: 10,
    maxIterations: 400,
    cacheSize: 10,
    progressiveDelayMs: 16, // ~60fps
    resizeThrottleMs: 100,
  },
  canvas: {
    defaultWidth: 800,
    defaultHeight: 600,
    basePixelRatio: 1,
    maxPixelRatio: 4,
  },
  zoom: {
    defaultZoom: 1,
    zoomFactor: 2.0,
    zoomInFactor: 1.1,
    zoomOutFactor: 0.9,
    minZoom: 0.1,
    maxZoom: 1e10,
  },
  selection: {
    minBoxSize: 10, // Minimum selection box size in pixels
  },
  colors: {
    defaultScheme: 'classic',
    schemes: [
      'classic',
      'fire',
      'ocean',
      'rainbow',
      'rainbow-pastel',
      'rainbow-dark',
      'rainbow-vibrant',
      'rainbow-double',
      'rainbow-shifted',
      'monochrome',
      'forest',
      'sunset',
      'purple',
      'cyan',
      'gold',
      'ice',
      'neon',
      'cosmic',
      'aurora',
      'coral',
      'autumn',
      'midnight',
      'emerald',
      'rosegold',
      'electric',
      'vintage',
      'tropical',
      'galaxy',
    ],
  },
  julia: {
    defaultC: { x: -0.7269, y: 0.1889 },
  },
  fractal: {
    defaultType: 'mandelbrot',
  },
  performance: {
    resizeThrottleMs: 100,
  },
  workers: {
    // Feature flag: enable worker-based optimizations if browser supports them
    enabled: true, // Will be overridden by feature detection
    // Minimum CPU cores required to enable workers (avoid overhead on single-core)
    minCores: 2,
    // Maximum number of workers (will be capped by hardwareConcurrency)
    maxWorkers: 4,
    // Require SharedArrayBuffer (for future optimizations, currently optional)
    requireSharedArrayBuffer: false,
  },
};

