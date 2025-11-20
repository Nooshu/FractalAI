/**
 * Progressive rendering for fractals
 * Renders fractals with increasing quality for faster initial feedback
 */

import { hideLoadingBar } from '../ui/loading-bar.js';
import { updatePixelRatio } from './pixel-ratio.js';
import { CONFIG } from '../core/config.js';
import { isLineBasedFractal } from '../fractals/utils.js';

/**
 * Progressive renderer class
 */
export class ProgressiveRenderer {
  constructor(state, frameCache, renderer) {
    this.state = state;
    this.frameCache = frameCache;
    this.renderer = renderer;
    this.progressiveRenderAnimationFrame = null;
  }

  /**
   * Render fractal with progressive quality
   * @param {Object} regl - Regl context
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} fractalModule - Current fractal module
   * @param {Object} params - Fractal parameters
   * @param {number} startIterations - Starting iteration count (optional)
   */
  render(regl, canvas, fractalModule, params, startIterations = null) {
    if (!fractalModule || !fractalModule.render || !regl) {
      hideLoadingBar();
      return;
    }

    // Line-based fractals (dragon curves, space-filling curves) generate vertices
    // based on iterations. Progressive rendering breaks them because changing
    // iterations requires regenerating vertices. Skip progressive rendering for these.
    const fractalType = this.state.getFractalType();
    if (isLineBasedFractal(fractalType)) {
      // Use regular rendering instead of progressive for line-based fractals
      this.renderer.render(regl, canvas, fractalModule, params);
      return;
    }

    // Check cache first
    const cached = this.frameCache.getCachedFrame(
      canvas,
      fractalType,
      params,
      regl
    );
    if (cached && cached.framebuffer) {
      this.renderer.displayCachedFrame(regl, canvas, cached.framebuffer);
      hideLoadingBar();
      this.state.isProgressiveRendering = false;
      return;
    }

    // Not using cache
    this.state.isDisplayingCached = false;
    this.state.cachedDrawCommand = null;

    // Cancel any existing progressive render
    if (this.progressiveRenderAnimationFrame !== null) {
      cancelAnimationFrame(this.progressiveRenderAnimationFrame);
      this.progressiveRenderAnimationFrame = null;
    }

    const targetIterations = params.iterations;
    this.state.targetIterations = targetIterations;

    // Update pixel ratio based on zoom level
    updatePixelRatio(canvas, params.zoom);

    // Clear the canvas before rendering
    regl.clear({
      color: [0, 0, 0, 1],
      depth: 1,
    });

    // Start with low quality for immediate feedback
    const initialIterations = startIterations || Math.max(20, Math.floor(targetIterations * 0.2));
    this.state.currentProgressiveIterations = initialIterations;

    // Create or recreate draw command with progressive iterations
    const progressiveParams = { ...params, iterations: this.state.currentProgressiveIterations };
    this.state.drawFractal = fractalModule.render(regl, progressiveParams, canvas);

    // Render immediately
    if (this.state.drawFractal) {
      this.state.drawFractal();
    }
    this.state.needsRender = false;

    this.state.isProgressiveRendering = true;

    // Progressively increase quality
    const stepSize = Math.max(10, Math.floor(targetIterations * 0.15));
    const progressiveStep = () => {
      if (this.state.currentProgressiveIterations < targetIterations) {
        this.state.currentProgressiveIterations = Math.min(
          this.state.currentProgressiveIterations + stepSize,
          targetIterations
        );

        // Recreate draw command with updated iterations
        const updatedParams = { ...params, iterations: this.state.currentProgressiveIterations };
        this.state.drawFractal = fractalModule.render(regl, updatedParams, canvas);
        if (this.state.drawFractal) {
          this.state.drawFractal();
        }
        this.state.needsRender = false;

        // Schedule next step using requestAnimationFrame for smooth rendering aligned with display refresh
        this.progressiveRenderAnimationFrame = requestAnimationFrame(progressiveStep);
      } else {
        this.state.isProgressiveRendering = false;
        // Cache the fully rendered frame
        this.renderer.cacheCurrentFrame(regl, canvas, this.state.drawFractal);
        hideLoadingBar();
      }
    };

    // Start progressive rendering using requestAnimationFrame for smooth rendering aligned with display refresh
    this.progressiveRenderAnimationFrame = requestAnimationFrame(progressiveStep);
  }

  /**
   * Cancel progressive rendering
   */
  cancel() {
    if (this.progressiveRenderAnimationFrame !== null) {
      cancelAnimationFrame(this.progressiveRenderAnimationFrame);
      this.progressiveRenderAnimationFrame = null;
      this.state.isProgressiveRendering = false;
    }
  }
}

