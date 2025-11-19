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
      'rainbow2',
      'rainbow3',
      'rainbow4',
      'rainbow5',
      'rainbow6',
      'monochrome',
      'forest',
      'sunset',
      'purple',
      'cyan',
      'gold',
      'ice',
      'neon',
      'cosmic',
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
};

