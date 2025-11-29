/**
 * Rendering Engine Module
 * Complex, core functionality module for managing fractal rendering
 * Handles rendering, progressive rendering, frame caching, and animation loop
 */

import { showLoadingBar, hideLoadingBar } from '../ui/loading-bar.js';
import { updatePixelRatio } from './pixel-ratio.js';
import { incrementFrameCount } from '../performance/fps-tracker.js';
import { performanceInstrumentation } from '../performance/instrumentation.js';

/**
 * Rendering Engine class
 * Manages all rendering operations including progressive rendering and animation loop
 */
export class RenderingEngine {
  constructor(getters, setters, frameCache) {
    // Getters for accessing state
    this.getCurrentFractalModule = getters.getCurrentFractalModule;
    this.getCurrentFractalType = getters.getCurrentFractalType;
    this.getParams = getters.getParams;
    this.getRegl = getters.getRegl;
    this.getCanvas = getters.getCanvas;
    this.getDrawFractal = getters.getDrawFractal;
    this.getNeedsRender = getters.getNeedsRender;
    this.getIsProgressiveRendering = getters.getIsProgressiveRendering;
    this.getIsDisplayingCached = getters.getIsDisplayingCached;
    this.getCachedDrawCommand = getters.getCachedDrawCommand;
    this.getCurrentProgressiveIterations = getters.getCurrentProgressiveIterations;
    this.getTargetIterations = getters.getTargetIterations;

    // Setters for updating state
    this.setDrawFractal = setters.setDrawFractal;
    this.setNeedsRender = setters.setNeedsRender;
    this.setIsProgressiveRendering = setters.setIsProgressiveRendering;
    this.setIsDisplayingCached = setters.setIsDisplayingCached;
    this.setCachedDrawCommand = setters.setCachedDrawCommand;
    this.setCurrentProgressiveIterations = setters.setCurrentProgressiveIterations;
    this.setTargetIterations = setters.setTargetIterations;

    this.frameCache = frameCache;

    // Internal state
    this.renderScheduled = false;
    this.progressiveRenderAnimationFrame = null;
    this.animationFrameId = null;
  }

  /**
   * Schedule a render using progressive rendering for faster feedback
   */
  scheduleRender() {
    // Show loading bar immediately when render is scheduled
    showLoadingBar();

    if (!this.renderScheduled) {
      this.renderScheduled = true;
      requestAnimationFrame(() => {
        this.renderScheduled = false;
        // Use progressive rendering for faster feedback
        this.renderFractalProgressive();
      });
    }
    // If render is already scheduled, the next render will be handled by the existing requestAnimationFrame
  }

  /**
   * Render fractal with progressive quality
   * @param {number} startIterations - Starting iteration count (optional)
   */
  renderFractalProgressive(startIterations = null) {
    const regl = this.getRegl();
    const canvas = this.getCanvas();
    const currentFractalModule = this.getCurrentFractalModule();
    const params = this.getParams();

    if (!currentFractalModule || !currentFractalModule.render || !regl) {
      hideLoadingBar();
      return;
    }

    // Check cache first - if we have a cached frame, use it immediately
    const cached = this.frameCache.getCachedFrame(canvas, this.getCurrentFractalType(), params, regl);
    if (cached && cached.framebuffer) {
      // Display cached frame
      this.displayCachedFrame(cached.framebuffer);
      hideLoadingBar();
      this.setIsProgressiveRendering(false);
      return;
    }

    // Not using cache, so we're not displaying cached
    this.setIsDisplayingCached(false);
    this.setCachedDrawCommand(null);

    // Cancel any existing progressive render
    if (this.progressiveRenderAnimationFrame !== null) {
      cancelAnimationFrame(this.progressiveRenderAnimationFrame);
      this.progressiveRenderAnimationFrame = null;
    }

    const targetIterations = params.iterations;
    this.setTargetIterations(targetIterations);

    // Update pixel ratio based on zoom level
    updatePixelRatio(canvas, params.zoom);

    // Clear the canvas before rendering
    regl.clear({
      color: [0, 0, 0, 1],
      depth: 1,
    });

    // Start with low quality for immediate feedback
    const initialIterations = startIterations || Math.max(20, Math.floor(targetIterations * 0.2));
    this.setCurrentProgressiveIterations(initialIterations);

    // Create or recreate draw command with progressive iterations
    const drawFractal = currentFractalModule.render(
      regl,
      { ...params, iterations: initialIterations },
      canvas
    );
    this.setDrawFractal(drawFractal);

    // Render immediately
    if (drawFractal) {
      drawFractal();
    }
    this.setNeedsRender(false); // Progressive rendering handles its own renders

    this.setIsProgressiveRendering(true);

    // Progressively increase quality
    const stepSize = Math.max(10, Math.floor(targetIterations * 0.15));
    const progressiveStep = () => {
      const currentIterations = this.getCurrentProgressiveIterations();
      if (currentIterations < targetIterations) {
        const newIterations = Math.min(
          currentIterations + stepSize,
          targetIterations
        );
        this.setCurrentProgressiveIterations(newIterations);

        // Recreate draw command with updated iterations
        const updatedDrawFractal = currentFractalModule.render(
          regl,
          { ...params, iterations: newIterations },
          canvas
        );
        this.setDrawFractal(updatedDrawFractal);
        if (updatedDrawFractal) {
          updatedDrawFractal();
        }
        this.setNeedsRender(false); // Progressive rendering handles its own renders

        // Schedule next step using requestAnimationFrame for smooth rendering aligned with display refresh
        this.progressiveRenderAnimationFrame = requestAnimationFrame(progressiveStep);
      } else {
        this.setIsProgressiveRendering(false);
        // Cache the fully rendered frame
        this.cacheCurrentFrame();
        hideLoadingBar();
      }
    };

    // Start progressive rendering using requestAnimationFrame for smooth rendering aligned with display refresh
    this.progressiveRenderAnimationFrame = requestAnimationFrame(progressiveStep);
  }

  /**
   * Render fractal at full quality
   */
  renderFractal() {
    const regl = this.getRegl();
    const canvas = this.getCanvas();
    const currentFractalModule = this.getCurrentFractalModule();
    const params = this.getParams();

    if (!currentFractalModule) {
      // Silently return if no fractal module is loaded
      // This prevents warnings during initialization or when resize fires before fractal loads
      // The fractal will be loaded and rendered when it's ready
      hideLoadingBar();
      return;
    }

    if (!currentFractalModule.render || !regl) {
      console.error(
        'Fractal module missing render function or regl not initialized:',
        this.getCurrentFractalType()
      );
      hideLoadingBar();
      return;
    }

    // Check cache first
    const cached = this.frameCache.getCachedFrame(canvas, this.getCurrentFractalType(), params, regl);
    if (cached && cached.framebuffer) {
      performanceInstrumentation.recordCacheHit();
      this.displayCachedFrame(cached.framebuffer);
      hideLoadingBar();
      this.setIsProgressiveRendering(false);
      return;
    }
    
    performanceInstrumentation.recordCacheMiss();
    performanceInstrumentation.recordRender();

    // Not using cache, so we're not displaying cached
    this.setIsDisplayingCached(false);
    this.setCachedDrawCommand(null);

    // Cancel progressive rendering if active
    if (this.progressiveRenderAnimationFrame !== null) {
      cancelAnimationFrame(this.progressiveRenderAnimationFrame);
      this.progressiveRenderAnimationFrame = null;
      this.setIsProgressiveRendering(false);
    }

    // Show loading bar (if not already shown by scheduleRender)
    showLoadingBar();

    // Update pixel ratio based on zoom level for better quality when zoomed in
    updatePixelRatio(canvas, params.zoom);

    // Clear the canvas before rendering
    regl.clear({
      color: [0, 0, 0, 1],
      depth: 1,
    });

    // Call the fractal's render function to create draw command
    const drawFractal = currentFractalModule.render(regl, params, canvas);
    this.setDrawFractal(drawFractal);

    // Execute the draw command
    if (drawFractal) {
      drawFractal();
    }

    this.setNeedsRender(false); // Render complete (renderFractal handles its own render call)
    this.setIsDisplayingCached(false); // Not displaying cached frame

    // Cache the rendered frame after a short delay to ensure it's fully rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.cacheCurrentFrame();
        setTimeout(() => {
          hideLoadingBar();
        }, 100);
      });
    });
  }

  /**
   * Display a cached frame
   * @param {Object} framebuffer - Cached framebuffer
   */
  displayCachedFrame(framebuffer) {
    const regl = this.getRegl();
    const canvas = this.getCanvas();

    if (!regl || !framebuffer || !canvas) return;

    // Clear the canvas first to prevent background bleed-through
    regl.clear({
      color: [0, 0, 0, 1],
      depth: 1,
    });

    // Create draw command to display the cached framebuffer
    // Use the texture from the framebuffer
    const texture = framebuffer.color[0] || framebuffer.color;

    const cachedDrawCommand = regl({
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

    this.setCachedDrawCommand(cachedDrawCommand);
    this.setIsDisplayingCached(true);
    this.setNeedsRender(true); // Mark that we need to render this cached frame
    // Render immediately so cached frame appears right away
    if (cachedDrawCommand) {
      cachedDrawCommand();
    }
  }

  /**
   * Cache the current rendered frame
   */
  cacheCurrentFrame() {
    const regl = this.getRegl();
    const canvas = this.getCanvas();
    const drawFractal = this.getDrawFractal();

    if (!drawFractal || !regl || !canvas) return;

    // Create framebuffer to capture the current frame
    const width = canvas.width;
    const height = canvas.height;

    const framebuffer = regl.framebuffer({
      width,
      height,
      color: regl.texture({
        width,
        height,
        min: 'linear',
        mag: 'linear',
      }),
      depth: false,
      stencil: false,
    });

    // Render to framebuffer using regl context
    framebuffer.use(() => {
      if (drawFractal) {
        drawFractal();
      }
    });

    // Store in cache
    this.frameCache.cacheFrame(canvas, this.getCurrentFractalType(), this.getParams(), framebuffer);
  }

  /**
   * Start the animation loop
   */
  startAnimation() {
    if (this.animationFrameId !== null) {
      return; // Already running
    }

    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      // Increment frame counter (FPS calculation moved to separate interval)
      incrementFrameCount();

      // Only render when necessary:
      // 1. When progressive rendering is active (needs continuous updates)
      // 2. When explicitly marked as needing a render (one-time render)
      const shouldRender = this.getNeedsRender() || this.getIsProgressiveRendering();

      if (shouldRender) {
        // Render cached frame or fractal
        if (this.getIsDisplayingCached() && this.getCachedDrawCommand()) {
          this.getCachedDrawCommand()();
        } else if (this.getDrawFractal()) {
          this.getDrawFractal()();
        }

        // Reset needsRender flag after rendering (progressive rendering will keep setting it)
        if (!this.getIsProgressiveRendering()) {
          this.setNeedsRender(false);
          // If we were displaying a cached frame, we've now rendered it once, so stop
          if (this.getIsDisplayingCached()) {
            this.setIsDisplayingCached(false);
          }
        }
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Stop the animation loop
   */
  stopAnimation() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Cancel progressive rendering
   */
  cancelProgressiveRender() {
    if (this.progressiveRenderAnimationFrame !== null) {
      cancelAnimationFrame(this.progressiveRenderAnimationFrame);
      this.progressiveRenderAnimationFrame = null;
      this.setIsProgressiveRendering(false);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopAnimation();
    this.cancelProgressiveRender();
    // Note: Worker pool cleanup is handled by appState.cleanup()
  }
}

