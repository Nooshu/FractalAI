/**
 * Core rendering logic for fractals
 * Handles rendering, caching, and frame display
 */

import { showLoadingBar, hideLoadingBar } from '../ui/loading-bar.js';
import { updatePixelRatio } from './pixel-ratio.js';
import { createOptimizedFramebuffer } from './framebuffer-utils.js';

/**
 * Renderer class
 */
export class Renderer {
  constructor(state, frameCache) {
    this.state = state;
    this.frameCache = frameCache;
  }

  /**
   * Render the current fractal
   * @param {Object} regl - Regl context
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} fractalModule - Current fractal module
   * @param {Object} params - Fractal parameters
   */
  render(regl, canvas, fractalModule, params) {
    if (!fractalModule) {
      // Silently return if no fractal module is loaded
      // This prevents warnings during initialization or when resize fires before fractal loads
      hideLoadingBar();
      return;
    }

    if (!fractalModule.render || !regl) {
      console.error(
        'Fractal module missing render function or regl not initialized:',
        this.state.getFractalType()
      );
      hideLoadingBar();
      return;
    }

    // Check cache first
    const cached = this.frameCache.getCachedFrame(
      canvas,
      this.state.getFractalType(),
      params,
      regl
    );
    if (cached && cached.framebuffer) {
      this.displayCachedFrame(regl, canvas, cached.framebuffer);
      hideLoadingBar();
      this.state.isProgressiveRendering = false;
      return;
    }

    // Not using cache
    this.state.isDisplayingCached = false;
    this.state.cachedDrawCommand = null;

    // Show loading bar
    showLoadingBar();

    // Update pixel ratio based on zoom level
    updatePixelRatio(canvas, params.zoom);

    // Clear the canvas before rendering
    regl.clear({
      color: [0, 0, 0, 1],
      depth: 1,
    });

    // Call the fractal's render function to create draw command
    this.state.drawFractal = fractalModule.render(regl, params, canvas);

    // Execute the draw command
    if (this.state.drawFractal) {
      this.state.drawFractal();
    }

    this.state.needsRender = false;
    this.state.isDisplayingCached = false;

    // Cache the rendered frame after a short delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.cacheCurrentFrame(regl, canvas, this.state.drawFractal);
        setTimeout(() => {
          hideLoadingBar();
        }, 100);
      });
    });
  }

  /**
   * Display a cached frame
   * @param {Object} regl - Regl context
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} framebuffer - Cached framebuffer
   */
  displayCachedFrame(regl, canvas, framebuffer) {
    if (!regl || !framebuffer || !canvas) return;

    // Clear the canvas first
    regl.clear({
      color: [0, 0, 0, 1],
      depth: 1,
    });

    // Create draw command to display the cached framebuffer
    const texture = framebuffer.color[0] || framebuffer.color;

    this.state.cachedDrawCommand = regl({
      vert: `
        attribute vec2 position;
        varying vec2 vUv;
        void main() {
          vUv = position * 0.5 + 0.5;
          gl_Position = vec4(position, 0, 1);
        }
      `,
      frag: `
        precision highp float;
        uniform sampler2D texture;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(texture, vUv);
        }
      `,
      attributes: {
        position: [-1, -1, 1, -1, -1, 1, 1, 1],
      },
      uniforms: {
        texture: texture,
      },
      viewport: {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
      },
      count: 4,
      primitive: 'triangle strip',
    });

    this.state.isDisplayingCached = true;
    this.state.needsRender = true;
    // Render immediately
    if (this.state.cachedDrawCommand) {
      this.state.cachedDrawCommand();
    }
  }

  /**
   * Cache the current rendered frame
   * @param {Object} regl - Regl context
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Function} drawFractal - Draw command function
   */
  cacheCurrentFrame(regl, canvas, drawFractal) {
    if (!drawFractal || !regl || !canvas) return;

    // Create optimized framebuffer to capture the current frame
    // Uses half-float textures when available for 2x memory savings
    const width = canvas.width;
    const height = canvas.height;

    const framebuffer = createOptimizedFramebuffer(regl, width, height);

    // Render to framebuffer
    framebuffer.use(() => {
      if (drawFractal) {
        drawFractal();
      }
    });

    // Store in cache
    this.frameCache.cacheFrame(
      canvas,
      this.state.getFractalType(),
      this.state.getParams(),
      framebuffer
    );
  }
}
