/**
 * Canvas/Renderer Setup Module
 * Core but can be isolated module for canvas and regl initialization
 * Handles canvas setup, regl initialization, resize handling, and renderer size updates
 */

import createRegl from 'regl';
import { updatePixelRatio } from './pixel-ratio.js';
import { detectWebGLCapabilities, formatCapabilities } from './webgl-capabilities.js';
import { initWebGPURenderer } from './webgpu-renderer.js';

/**
 * Initialize canvas and renderer (WebGPU or WebGL)
 * @param {string} canvasId - ID of the canvas element
 * @param {Object} options - Configuration options
 * @param {Function} options.getZoom - Function to get current zoom level
 * @param {Function} options.onResize - Optional callback when resize occurs
 * @returns {Promise<Object>} Promise resolving to object containing canvas, regl/webgpuRenderer, and updateRendererSize function
 */
export async function initCanvasRenderer(canvasId, options = {}) {
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

  // Check for WebGPU support first (if enabled)
  let webgpuRenderer = null;
  let regl = null;
  let webglCapabilities = null;

  // Try to initialize WebGPU if enabled
  const { CONFIG } = await import('../core/config.js');
  if (CONFIG.features.webgpu && 'gpu' in navigator) {
    try {
      webgpuRenderer = await initWebGPURenderer(canvas, {
        powerPreference: 'high-performance',
      });
      if (webgpuRenderer && import.meta.env?.DEV) {
        console.log(
          '%c[Renderer]%c Using WebGPU renderer',
          'color: #9C27B0; font-weight: bold;',
          'color: inherit;'
        );
      }
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.warn(
          '%c[Renderer]%c WebGPU initialization failed, falling back to WebGL:',
          'color: #FF9800; font-weight: bold;',
          'color: inherit;',
          error
        );
      }
    }
  }

  // Fallback to WebGL if WebGPU is not available or not enabled
  if (!webgpuRenderer) {
    // Initialize regl
    // Note: regl automatically tries to get a WebGL2 context if available,
    // and falls back to WebGL1 if WebGL2 is not supported
    regl = createRegl({
      canvas,
      attributes: {
        antialias: true,
        powerPreference: 'high-performance',
        stencil: false,
        depth: false,
        alpha: false, // Disable transparency to prevent background bleed-through
      },
    });

    // Detect and store WebGL capabilities (only if using WebGL)
    if (regl) {
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
    }
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
    regl, // null if using WebGPU
    webgpuRenderer, // null if using WebGL
    updateRendererSize,
    cleanup,
    webglCapabilities, // null if using WebGPU
    rendererType: webgpuRenderer ? 'webgpu' : 'webgl', // Indicate which renderer is active
  };
}
