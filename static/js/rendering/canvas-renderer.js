/**
 * Canvas/Renderer Setup Module
 * Core but can be isolated module for canvas and regl initialization
 * Handles canvas setup, regl initialization, resize handling, and renderer size updates
 */

import createRegl from 'regl';
import { updatePixelRatio } from './pixel-ratio.js';
import { detectWebGLCapabilities, formatCapabilities } from './webgl-capabilities.js';

/**
 * Initialize canvas and regl renderer
 * @param {string} canvasId - ID of the canvas element
 * @param {Object} options - Configuration options
 * @param {Function} options.getZoom - Function to get current zoom level
 * @param {Function} options.onResize - Optional callback when resize occurs
 * @returns {Object} Object containing canvas, regl, and updateRendererSize function
 */
export function initCanvasRenderer(canvasId, options = {}) {
  const { getZoom, onResize } = options;

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    throw new Error(`Canvas element with id "${canvasId}" not found`);
  }

  const container = canvas.parentElement;
  if (!container) {
    throw new Error('Canvas must have a parent container');
  }

  // Set initial canvas size before initializing regl
  const rect = container.getBoundingClientRect();
  const initialWidth = rect.width || container.clientWidth || 800;
  const initialHeight = rect.height || container.clientHeight || 600;
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = initialWidth * pixelRatio;
  canvas.height = initialHeight * pixelRatio;
  canvas.style.width = initialWidth + 'px';
  canvas.style.height = initialHeight + 'px';
  canvas.style.display = 'block';

  // Initialize regl
  // Note: regl automatically tries to get a WebGL2 context if available,
  // and falls back to WebGL1 if WebGL2 is not supported
  const regl = createRegl({
    canvas,
    attributes: {
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: false,
      alpha: false, // Disable transparency to prevent background bleed-through
    },
  });

  // Detect and store WebGL capabilities
  // regl automatically prefers WebGL2 if available, so we detect what we got
  let webglCapabilities = null;
  try {
    const gl = regl._gl;
    if (gl) {
      webglCapabilities = detectWebGLCapabilities(gl);

      // Log capabilities in development mode
      if (import.meta.env?.DEV) {
        console.log(
          `%c[WebGL Capabilities]%c\n${formatCapabilities(webglCapabilities)}`,
          'color: #4CAF50; font-weight: bold;',
          'color: inherit; font-family: monospace; font-size: 11px;'
        );
      }
    }
  } catch (error) {
    console.warn('Failed to detect WebGL capabilities:', error);
  }

  // Function to update canvas size and pixel ratio
  const updateRendererSize = () => {
    if (!getZoom) {
      // Fallback if no getZoom function provided
      updatePixelRatio(canvas, 1);
    } else {
      const zoom = getZoom();
      updatePixelRatio(canvas, zoom);
    }

    // Ensure canvas style is set
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
  };

  // Initial size setup
  updateRendererSize();

  // Throttled resize handler to avoid excessive renders
  let resizeTimeout = null;
  const handleResize = () => {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(() => {
      updateRendererSize();
      if (onResize) {
        onResize();
      }
      resizeTimeout = null;
    }, 100); // Throttle resize to 100ms
  };

  // Handle window resize
  window.addEventListener('resize', handleResize, { passive: true });

  // Use ResizeObserver for more accurate container size tracking
  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(container);

  // Cleanup function
  const cleanup = () => {
    resizeObserver.disconnect();
    window.removeEventListener('resize', handleResize);
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
      resizeTimeout = null;
    }
  };

  // Setup cleanup on page unload
  window.addEventListener('beforeunload', cleanup);

  return {
    canvas,
    regl,
    updateRendererSize,
    cleanup,
    webglCapabilities, // Expose capabilities for use throughout the app
  };
}
