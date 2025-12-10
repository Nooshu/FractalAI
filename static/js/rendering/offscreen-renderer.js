/**
 * OffscreenCanvas Renderer
 * Provides non-blocking rendering using OffscreenCanvas with transfer control
 * Renders fractals off the main thread and transfers results efficiently
 */

import createRegl from 'regl';
import { detectWebGLCapabilities } from './webgl-capabilities.js';
import { devLog } from '../core/logger.js';

/**
 * OffscreenCanvas Renderer
 * Manages offscreen rendering and transfer to main canvas
 */
export class OffscreenRenderer {
  /**
   * @param {HTMLCanvasElement} mainCanvas - Main canvas element
   * @param {Object} options - Configuration options
   */
  constructor(mainCanvas, _options = {}) {
    this.mainCanvas = mainCanvas;
    this.offscreenCanvas = null;
    this.offscreenRegl = null;
    this.offscreenGl = null;
    this.isAvailable = false;
    this.pendingRender = null;

    // Check if OffscreenCanvas is available
    if (typeof OffscreenCanvas !== 'undefined') {
      try {
        // Create offscreen canvas with same dimensions as main canvas
        const width = mainCanvas.width || 800;
        const height = mainCanvas.height || 600;
        this.offscreenCanvas = new OffscreenCanvas(width, height);

        // Get WebGL2 context on offscreen canvas
        this.offscreenGl = this.offscreenCanvas.getContext('webgl2', {
          antialias: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: false,
          alpha: false,
        });

        if (this.offscreenGl) {
          // Create regl context for offscreen canvas
          this.offscreenRegl = createRegl({
            gl: this.offscreenGl,
            canvas: this.offscreenCanvas,
            attributes: {
              antialias: true,
              powerPreference: 'high-performance',
              stencil: false,
              depth: false,
              alpha: false,
              webglVersion: 2,
            },
          });

          // Detect capabilities
          this.offscreenCapabilities = detectWebGLCapabilities(this.offscreenGl);

          this.isAvailable = true;

          devLog.log(
            '%c[OffscreenCanvas]%c Non-blocking rendering enabled',
            'color: #4CAF50; font-weight: bold;',
            'color: inherit;'
          );
        }
      } catch (error) {
        console.warn('[OffscreenCanvas] Failed to initialize:', error);
        this.isAvailable = false;
      }
    } else {
      devLog.log(
        '%c[OffscreenCanvas]%c Not available, using main thread rendering',
        'color: #FF9800; font-weight: bold;',
        'color: inherit;'
      );
    }
  }

  /**
   * Resize offscreen canvas to match main canvas
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   */
  resize(width, height) {
    if (!this.isAvailable || !this.offscreenCanvas) {
      return;
    }

    // Only resize if dimensions changed
    if (this.offscreenCanvas.width !== width || this.offscreenCanvas.height !== height) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
    }
  }

  /**
   * Render fractal to offscreen canvas
   * @param {Object} fractalModule - Fractal module with render function
   * @param {Object} params - Fractal parameters
   * @param {Object} options - Additional options (ubo, webglCapabilities)
   * @returns {Promise<ImageBitmap>} Promise resolving to rendered ImageBitmap
   */
  async render(fractalModule, params, options = {}) {
    if (!this.isAvailable || !this.offscreenRegl || !fractalModule) {
      return null;
    }

    // Cancel any pending render
    if (this.pendingRender) {
      this.pendingRender.cancelled = true;
    }

    // Resize offscreen canvas to match main canvas
    this.resize(this.mainCanvas.width, this.mainCanvas.height);

    // Create render promise
    const renderPromise = new Promise((resolve, reject) => {
      try {
        // Clear offscreen canvas
        this.offscreenRegl.clear({
          color: [0, 0, 0, 1],
          depth: 1,
        });

        // Create draw command using fractal's render function
        const webglCapabilities = options.webglCapabilities || this.offscreenCapabilities;
        const ubo = options.ubo;

        let drawFractal;
        if (
          fractalModule.render.length >= 4 ||
          (webglCapabilities?.isWebGL2 && ubo)
        ) {
          drawFractal = fractalModule.render(
            this.offscreenRegl,
            params,
            this.offscreenCanvas,
            {
              webglCapabilities,
              ubo,
            }
          );
        } else {
          drawFractal = fractalModule.render(
            this.offscreenRegl,
            params,
            this.offscreenCanvas
          );
        }

        // Execute draw command
        if (drawFractal) {
          drawFractal();
        }

        // Transfer to ImageBitmap (non-blocking, efficient transfer)
        const imageBitmap = this.offscreenCanvas.transferToImageBitmap();

        // Check if render was cancelled
        if (renderPromise.cancelled) {
          if (imageBitmap) {
            imageBitmap.close();
          }
          reject(new Error('Render cancelled'));
          return;
        }

        resolve(imageBitmap);
      } catch (error) {
        reject(error);
      }
    });

    this.pendingRender = renderPromise;
    return renderPromise;
  }

  /**
   * Display rendered ImageBitmap on main canvas
   * @param {ImageBitmap} imageBitmap - Rendered ImageBitmap
   */
  display(imageBitmap) {
    if (!imageBitmap || !this.mainCanvas) {
      return;
    }

    try {
      const ctx = this.mainCanvas.getContext('2d', {
        willReadFrequently: false,
        desynchronized: true, // Allow async rendering
      });

      if (ctx) {
        // Use transferFromImageBitmap for efficient transfer
        if (ctx.transferFromImageBitmap) {
          ctx.transferFromImageBitmap(imageBitmap);
        } else {
          // Fallback to drawImage if transferFromImageBitmap not available
          ctx.drawImage(imageBitmap, 0, 0);
          imageBitmap.close();
        }
      }
    } catch (error) {
      console.error('[OffscreenCanvas] Failed to display result:', error);
      if (imageBitmap) {
        imageBitmap.close();
      }
    }
  }

  /**
   * Render and display in one async operation
   * @param {Object} fractalModule - Fractal module
   * @param {Object} params - Fractal parameters
   * @param {Object} options - Additional options
   * @returns {Promise<void>} Promise that resolves when rendering and display are complete
   */
  async renderAndDisplay(fractalModule, params, options = {}) {
    try {
      const imageBitmap = await this.render(fractalModule, params, options);
      if (imageBitmap) {
        this.display(imageBitmap);
      }
    } catch (error) {
      if (error.message !== 'Render cancelled') {
        console.error('[OffscreenCanvas] Render error:', error);
      }
    }
  }

  /**
   * Check if offscreen rendering is available
   * @returns {boolean} True if available
   */
  isOffscreenAvailable() {
    return this.isAvailable;
  }

  /**
   * Get offscreen regl context (for UBO initialization, etc.)
   * @returns {Object|null} Offscreen regl context or null
   */
  getOffscreenRegl() {
    return this.offscreenRegl;
  }

  /**
   * Get offscreen WebGL context
   * @returns {WebGL2RenderingContext|null} Offscreen GL context or null
   */
  getOffscreenGL() {
    return this.offscreenGl;
  }

  /**
   * Get offscreen capabilities
   * @returns {Object|null} Offscreen capabilities or null
   */
  getOffscreenCapabilities() {
    return this.offscreenCapabilities;
  }

  /**
   * Cleanup resources
   */
  dispose() {
    // Cancel pending render
    if (this.pendingRender) {
      this.pendingRender.cancelled = true;
      this.pendingRender = null;
    }

    // Cleanup regl
    if (this.offscreenRegl) {
      this.offscreenRegl.destroy();
      this.offscreenRegl = null;
    }

    // OffscreenCanvas and GL context are automatically cleaned up
    this.offscreenCanvas = null;
    this.offscreenGl = null;
    this.offscreenCapabilities = null;
    this.isAvailable = false;
  }
}

/**
 * Create an OffscreenCanvas renderer
 * @param {HTMLCanvasElement} mainCanvas - Main canvas element
 * @param {Object} options - Configuration options
 * @returns {OffscreenRenderer|null} Offscreen renderer or null if not available
 */
export function createOffscreenRenderer(mainCanvas, options = {}) {
  if (typeof OffscreenCanvas === 'undefined') {
    return null;
  }

  try {
    const renderer = new OffscreenRenderer(mainCanvas, options);
    if (renderer.isOffscreenAvailable()) {
      return renderer;
    }
  } catch (error) {
    console.error('[OffscreenCanvas] Failed to create renderer:', error);
  }

  return null;
}

