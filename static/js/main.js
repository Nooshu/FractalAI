import createRegl from 'regl';
import { getColorSchemeIndex, computeColorForScheme, isJuliaType } from './fractals/utils.js';
import { BenchmarkUI, addBenchmarkButton } from './performance/ui.js';
import { CONFIG } from './core/config.js';
import { FrameCache } from './core/frameCache.js';
import { initLoadingBar, showLoadingBar, hideLoadingBar } from './ui/loading-bar.js';
import { initFPSTracker, startFPSTracking, incrementFrameCount } from './performance/fps-tracker.js';
import { cacheElement } from './core/dom-cache.js';
import { updateAllDisplays, setupCoordinateCopy, setupDebugCopy } from './ui/coordinate-display.js';

// Application state
let regl = null;
let canvas = null;
let currentFractalType = 'mandelbrot';
let drawFractal = null; // Current regl draw command
let currentFractalModule = null; // Currently loaded fractal module
let fractalCache = new Map(); // Cache for loaded fractal modules
let isLoadingFractal = false; // Track if a fractal is currently being loaded
let needsRender = false; // Flag to indicate if a render is needed
let isDisplayingCached = false; // Track if we're displaying a cached frame

// Render throttling for smooth interaction
let renderScheduled = false;

// Progressive rendering state
let progressiveRenderAnimationFrame = null;
let currentProgressiveIterations = 0;
let targetIterations = 0;
let isProgressiveRendering = false;

// Frame cache for rendered fractals
const MAX_CACHE_SIZE = 10; // Maximum number of cached frames
let frameCache = new FrameCache(MAX_CACHE_SIZE);
let cachedDrawCommand = null; // Draw command for displaying cached frames

// Initialize DOM cache and other modules
function initDOMCache() {
  // Cache coordinate display elements
  cacheElement('coord-zoom');
  cacheElement('coord-offset-x');
  cacheElement('coord-offset-y');
  cacheElement('copy-coords-btn');
  // Initialize loading bar module
  initLoadingBar();
  // Initialize FPS tracker module
  initFPSTracker('fps');
}

// Function to calculate pixel ratio based on zoom level
// Higher zoom = higher pixel ratio for better quality
function calculatePixelRatio() {
  // Scale pixel ratio with zoom, but cap it to avoid performance issues
  // Base pixel ratio * sqrt(zoom) gives a good balance
  const basePixelRatio = window.devicePixelRatio || 1;
  const zoomMultiplier = Math.min(Math.sqrt(params.zoom), 4); // Cap at 4x
  return basePixelRatio * zoomMultiplier;
}

// Update canvas pixel ratio based on current zoom
function updatePixelRatio() {
  if (canvas && regl) {
    const pixelRatio = calculatePixelRatio();
    // Regl handles pixel ratio automatically, but we can set it explicitly
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const width = rect.width || container.clientWidth || 800;
    const height = rect.height || container.clientHeight || 600;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
  }
}

// Global function to update renderer size (needed for fullscreen and double-click)
let updateRendererSize = null;

// Throttled render function - batches multiple render requests
function scheduleRender() {
  // Show loading bar immediately when render is scheduled
  showLoadingBar();

  if (!renderScheduled) {
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      // Use progressive rendering for faster feedback
      renderFractalProgressive();
    });
  }
  // If render is already scheduled, the next render will be handled by the existing requestAnimationFrame
}

// Fractal parameters
let params = {
  iterations: 125,
  colorScheme: 'classic',
  juliaC: { x: -0.7269, y: 0.1889 },
  center: { x: 0, y: 0 },
  zoom: 1,
  offset: { x: 0, y: 0 },
  xScale: 1.0,
  yScale: 1.0,
};

// Mapping of fractal types to Wikipedia URLs
const fractalWikipediaUrls = {
  'mandelbrot': 'https://en.wikipedia.org/wiki/Mandelbrot_set',
  'celtic-mandelbrot': 'https://en.wikipedia.org/wiki/Mandelbrot_set',
  'multibrot': 'https://en.wikipedia.org/wiki/Multibrot_set',
  'mutant-mandelbrot': 'https://en.wikipedia.org/wiki/Mandelbrot_set',
  'phoenix-mandelbrot': 'https://en.wikipedia.org/wiki/Phoenix_fractal',
  'burning-ship': 'https://en.wikipedia.org/wiki/Burning_Ship_fractal',
  'tricorn': 'https://en.wikipedia.org/wiki/Tricorn_(mathematics)',
  'nebulabrot': 'https://en.wikipedia.org/wiki/Nebulabrot',
  'julia': 'https://en.wikipedia.org/wiki/Julia_set',
  'julia-snakes': 'https://en.wikipedia.org/wiki/Julia_set',
  'multibrot-julia': 'https://en.wikipedia.org/wiki/Julia_set',
  'burning-ship-julia': 'https://en.wikipedia.org/wiki/Julia_set',
  'tricorn-julia': 'https://en.wikipedia.org/wiki/Julia_set',
  'phoenix-julia': 'https://en.wikipedia.org/wiki/Julia_set',
  'lambda-julia': 'https://en.wikipedia.org/wiki/Julia_set',
  'hybrid-julia': 'https://en.wikipedia.org/wiki/Julia_set',
  'sierpinski': 'https://en.wikipedia.org/wiki/Sierpinski_triangle',
  'sierpinski-arrowhead': 'https://en.wikipedia.org/wiki/Sierpinski_curve',
  'sierpinski-carpet': 'https://en.wikipedia.org/wiki/Sierpinski_carpet',
  'sierpinski-gasket': 'https://en.wikipedia.org/wiki/Sierpinski_triangle',
  'sierpinski-hexagon': 'https://en.wikipedia.org/wiki/Sierpinski_triangle',
  'sierpinski-lsystem': 'https://en.wikipedia.org/wiki/Sierpinski_triangle',
  'sierpinski-pentagon': 'https://en.wikipedia.org/wiki/Sierpinski_triangle',
  'quadrilateral-subdivision': 'https://en.wikipedia.org/wiki/Fractal',
  'recursive-polygon-splitting': 'https://en.wikipedia.org/wiki/Fractal',
  'triangular-subdivision': 'https://en.wikipedia.org/wiki/Fractal',
  'fractal-islands': 'https://en.wikipedia.org/wiki/Koch_snowflake',
  'koch': 'https://en.wikipedia.org/wiki/Koch_snowflake',
  'quadratic-koch': 'https://en.wikipedia.org/wiki/Koch_snowflake',
  'cantor': 'https://en.wikipedia.org/wiki/Cantor_set',
  'cantor-dust-base-expansion': 'https://en.wikipedia.org/wiki/Cantor_set',
  'cantor-dust-circular': 'https://en.wikipedia.org/wiki/Cantor_set',
  'fat-cantor': 'https://en.wikipedia.org/wiki/Smith%E2%80%93Volterra%E2%80%93Cantor_set',
  'smith-volterra-cantor': 'https://en.wikipedia.org/wiki/Smith%E2%80%93Volterra%E2%80%93Cantor_set',
  'random-cantor': 'https://en.wikipedia.org/wiki/Cantor_set',
  'binary-dragon': 'https://en.wikipedia.org/wiki/Dragon_curve',
  'dragon-lsystem': 'https://en.wikipedia.org/wiki/Dragon_curve',
  'folded-paper-dragon': 'https://en.wikipedia.org/wiki/Dragon_curve',
  'heighway-dragon': 'https://en.wikipedia.org/wiki/Dragon_curve',
  'terdragon': 'https://en.wikipedia.org/wiki/Dragon_curve',
  'twindragon': 'https://en.wikipedia.org/wiki/Dragon_curve',
  'gosper-curve': 'https://en.wikipedia.org/wiki/Gosper_curve',
  'hilbert-curve': 'https://en.wikipedia.org/wiki/Hilbert_curve',
  'levy-c-curve': 'https://en.wikipedia.org/wiki/L%C3%A9vy_C_curve',
  'moore-curve': 'https://en.wikipedia.org/wiki/Moore_curve',
  'peano-curve': 'https://en.wikipedia.org/wiki/Peano_curve',
  'newton': 'https://en.wikipedia.org/wiki/Newton_fractal',
  'halley': 'https://en.wikipedia.org/wiki/Halley%27s_method',
  'nova': 'https://en.wikipedia.org/wiki/Newton_fractal',
  'plant': 'https://en.wikipedia.org/wiki/L-system',
  'barnsley-fern': 'https://en.wikipedia.org/wiki/Barnsley_fern',
  'domino-substitution': 'https://en.wikipedia.org/wiki/Aperiodic_tiling',
  'pinwheel-tiling': 'https://en.wikipedia.org/wiki/Pinwheel_tiling',
  'snowflake-tiling': 'https://en.wikipedia.org/wiki/Aperiodic_tiling',
  'amman-tiling': 'https://en.wikipedia.org/wiki/Ammann_tiling',
  'apollonian-gasket': 'https://en.wikipedia.org/wiki/Apollonian_gasket',
  'carpenter-square': 'https://en.wikipedia.org/wiki/Carpenter_square',
  'chair-tiling': 'https://en.wikipedia.org/wiki/Chair_tiling',
  'h-tree': 'https://en.wikipedia.org/wiki/H_tree',
  'h-tree-generalized': 'https://en.wikipedia.org/wiki/H_tree',
  'vicsek': 'https://en.wikipedia.org/wiki/Vicsek_fractal',
  'cross': 'https://en.wikipedia.org/wiki/Fractal',
  'diffusion-limited-aggregation': 'https://en.wikipedia.org/wiki/Diffusion-limited_aggregation',
  'fractional-brownian-motion': 'https://en.wikipedia.org/wiki/Fractional_Brownian_motion',
  'fractal-flame': 'https://en.wikipedia.org/wiki/Fractal_flame',
  'levy-flights': 'https://en.wikipedia.org/wiki/L%C3%A9vy_flight',
  'recursive-circle-removal': 'https://en.wikipedia.org/wiki/Fractal',
  'rose': 'https://en.wikipedia.org/wiki/Rose_(mathematics)',
  'box-variants': 'https://en.wikipedia.org/wiki/Cantor_set',
  'minkowski-sausage': 'https://en.wikipedia.org/wiki/Minkowski_sausage',
  'penrose-substitution': 'https://en.wikipedia.org/wiki/Penrose_tiling',
  'perlin-noise': 'https://en.wikipedia.org/wiki/Perlin_noise',
  'percolation-cluster': 'https://en.wikipedia.org/wiki/Percolation_theory',
  'buffalo': 'https://en.wikipedia.org/wiki/Mandelbrot_set',
  'popcorn': 'https://en.wikipedia.org/wiki/Popcorn_function',
  'random-midpoint-displacement': 'https://en.wikipedia.org/wiki/Midpoint_displacement',
  'rauzy': 'https://en.wikipedia.org/wiki/Rauzy_fractal',
  'simplex-noise': 'https://en.wikipedia.org/wiki/Simplex_noise',
  'spider-set': 'https://en.wikipedia.org/wiki/Mandelbrot_set',
  'magnet': 'https://en.wikipedia.org/wiki/Magnet_fractal',
  'cesaro': 'https://en.wikipedia.org/wiki/Ces%C3%A0ro_fractal',
};

// Update Wikipedia link based on current fractal type
function updateWikipediaLink() {
  const wikipediaLink = document.getElementById('wikipedia-link');
  if (wikipediaLink && currentFractalType) {
    const url = fractalWikipediaUrls[currentFractalType] || 'https://en.wikipedia.org/wiki/Fractal';
    wikipediaLink.href = url;
  }
}

// Initialize regl
async function init() {
  // Initialize DOM cache first
  initDOMCache();

  canvas = document.getElementById('fractal-canvas');
  const container = canvas.parentElement;

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

  // Check for WebGL2 support
  // WebGL context check (logging removed)
  try {
    const gl = regl._gl;
    if (gl instanceof WebGL2RenderingContext) {
      // WebGL2 available
    } else {
      // WebGL1 in use
    }
  } catch {
    // WebGL context check completed
  }

  // Function to update canvas size and pixel ratio
  updateRendererSize = () => {
    updatePixelRatio();

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
      renderFractal();
      resizeTimeout = null;
    }, 100); // Throttle resize to 100ms
  };

  // Handle window resize
  window.addEventListener('resize', handleResize, { passive: true });

  // Use ResizeObserver for more accurate container size tracking
  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(container);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    resizeObserver.disconnect();
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    frameCache.clear();
    if (progressiveRenderAnimationFrame !== null) {
      cancelAnimationFrame(progressiveRenderAnimationFrame);
      progressiveRenderAnimationFrame = null;
    }
  });

  // Setup controls
  setupControls();
  setupUI();
  setupCollapsibleSections();
  setupPanelToggle();
  // Setup coordinate display with getter functions
  setupCoordinateCopy(() => currentFractalType, () => params);
  setupDebugCopy(() => currentFractalType, () => params);
  setupShareFractal();
  updateAllDisplays(currentFractalType, params);

  // Initialize benchmark UI
  const benchmarkUI = new BenchmarkUI(
    regl,
    canvas,
    async (fractalType) => {
      await loadFractal(fractalType);
      // Ensure render happens after load
      await new Promise((resolve) => setTimeout(resolve, 50));
    },
    (newParams) => {
      // Update params
      Object.assign(params, newParams);
      // Trigger render
      renderFractal();
      // Wait for render to complete
      return new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
    }
  );
  addBenchmarkButton(benchmarkUI);

  // Get the initial fractal type from the dropdown (defaults to mandelbrot if not found)
  const fractalTypeSelect = document.getElementById('fractal-type');
  if (fractalTypeSelect && fractalTypeSelect.value) {
    currentFractalType = fractalTypeSelect.value;
  }

  // Initialize Wikipedia link
  updateWikipediaLink();

  // Try to load fractal state from URL first
  const loadedFromURL = await loadFractalFromURL();

  if (!loadedFromURL) {
    // Load initial fractal if not loaded from URL
    loadFractal(currentFractalType).then(() => {
      renderFractal();
      updateCoordinateDisplay();
      startFPSTracking();
      animate();
    });
  } else {
    // If loaded from URL, just start animation
    startFPSTracking();
    animate();
  }
}

// Dynamically load a fractal module
async function loadFractal(fractalType) {
  // Check cache first
  if (fractalCache.has(fractalType)) {
    currentFractalModule = fractalCache.get(fractalType);
    currentFractalType = fractalType; // Ensure currentFractalType is updated
    return;
  }

  isLoadingFractal = true;
  try {
    // All fractals are 2D, load from 2d folder
    const module = await import(`./fractals/2d/${fractalType}.js`);

    // Verify the module has required exports
    if (!module.render) {
      throw new Error(`Fractal module ${fractalType} missing render function`);
    }

    currentFractalModule = module;
    currentFractalType = fractalType; // Ensure currentFractalType is updated

    // Cache the module
    fractalCache.set(fractalType, module);
  } catch (error) {
    console.error(`Failed to load fractal: ${fractalType}`, error);
    // Fallback to mandelbrot if loading fails
    if (fractalType !== 'mandelbrot') {
      console.warn(`Falling back to mandelbrot`);
      return loadFractal('mandelbrot');
    } else {
      throw error; // Re-throw if mandelbrot also fails
    }
  } finally {
    isLoadingFractal = false;
  }
}

function setupControls() {
  const canvas = document.getElementById('fractal-canvas');
  const canvasContainer = canvas.parentElement; // Get container for fullscreen event handling
  const selectionBox = document.getElementById('selection-box');
  let isDragging = false;
  let isSelecting = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let selectionStartX = 0;
  let selectionStartY = 0;
  let cachedCanvasRect = null; // Cache canvas rect to avoid repeated getBoundingClientRect calls

  // Helper to get canvas rect (cached for performance)
  const getCanvasRect = () => {
    // Invalidate cache on resize or after a delay
    if (!cachedCanvasRect) {
      cachedCanvasRect = canvas.getBoundingClientRect();
      // Invalidate cache after 100ms to allow for resize
      setTimeout(() => {
        cachedCanvasRect = null;
      }, 100);
    }
    return cachedCanvasRect;
  };

  canvas.addEventListener('mousedown', (e) => {
    // Only start dragging on left mouse button
    if (e.button === 0) {
      // Check if the click is on a fullscreen control button - if so, don't handle it
      const target = e.target;
      if (target.closest?.('.fullscreen-control-btn')) {
        return; // Let the button handle its own click
      }

      const rect = getCanvasRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Check if Shift key is held for selection mode
      if (e.shiftKey) {
        // Start selection box
        isSelecting = true;
        isDragging = false;
        selectionStartX = mouseX;
        selectionStartY = mouseY;
        selectionBox.style.left = mouseX + 'px';
        selectionBox.style.top = mouseY + 'px';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        selectionBox.classList.add('active');
        canvas.style.cursor = 'crosshair';
        e.preventDefault();
      } else {
        // Start panning
        isDragging = true;
        isSelecting = false;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
        selectionBox.classList.remove('active');
        // Prevent text selection while dragging
        e.preventDefault();
      }
    }
  });

  // Use window mousemove so dragging continues even if mouse leaves canvas
  window.addEventListener('mousemove', (e) => {
    // Don't interfere if mouse is over fullscreen control buttons
    const target = e.target;
    if (target.closest?.('.fullscreen-control-btn')) {
      return; // Let buttons handle their own hover states
    }

    if (isSelecting) {
      // Update selection box - constrained to render buffer aspect ratio
      const rect = getCanvasRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate render buffer aspect ratio (must match what the shader uses)
      // This ensures the selection box matches the actual fractal coordinates
      const renderBufferAspect = canvas.width / canvas.height;

      // Calculate raw dimensions from start point
      const rawWidth = mouseX - selectionStartX;
      const rawHeight = mouseY - selectionStartY;

      // Determine which dimension to use as the base (use the larger one)
      let width, height;
      if (Math.abs(rawWidth / renderBufferAspect) > Math.abs(rawHeight)) {
        // Width is the constraining dimension
        width = rawWidth;
        height = width / renderBufferAspect;
      } else {
        // Height is the constraining dimension
        height = rawHeight;
        width = height * renderBufferAspect;
      }

      // Calculate position (ensure box grows from start point)
      let left = rawWidth >= 0 ? selectionStartX : selectionStartX + width;
      let top = rawHeight >= 0 ? selectionStartY : selectionStartY + height;

      // Ensure selection box stays within canvas bounds
      const absWidth = Math.abs(width);
      const absHeight = Math.abs(height);

      // Clamp position to keep box within bounds
      left = Math.max(0, Math.min(left, rect.width - absWidth));
      top = Math.max(0, Math.min(top, rect.height - absHeight));

      // Clamp dimensions if they exceed bounds
      const maxWidth = rect.width - left;
      const maxHeight = rect.height - top;

      if (absWidth > maxWidth || absHeight > maxHeight) {
        // Recalculate to fit within bounds while maintaining aspect ratio
        const scaleByWidth = maxWidth / absWidth;
        const scaleByHeight = maxHeight / absHeight;
        const scale = Math.min(scaleByWidth, scaleByHeight);

        width = width * scale;
        height = height * scale;
      }

      selectionBox.style.left = left + 'px';
      selectionBox.style.top = top + 'px';
      selectionBox.style.width = Math.abs(width) + 'px';
      selectionBox.style.height = Math.abs(height) + 'px';
    } else if (isDragging) {
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;
      // Adjust sensitivity based on zoom level for better control
      // Sensitivity decreases with zoom to allow precise panning at high zoom levels
      // Base sensitivity of 0.001 works well at zoom 1, and scales inversely with zoom
      const baseSensitivity = 0.001;
      const sensitivity = baseSensitivity / params.zoom;
      params.offset.x -= deltaX * sensitivity;
      params.offset.y += deltaY * sensitivity;
      updateCoordinateDisplay();
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      scheduleRender(); // Use throttled render for smooth panning
    }
  }, { passive: true });

  // Use window mouseup so dragging stops even if mouse is outside canvas
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      if (isSelecting) {
        // Zoom into selection box - use the actual displayed box dimensions
        const rect = getCanvasRect();

        // Get the actual selection box position and size from the DOM
        // This ensures we use the constrained aspect-ratio box that's displayed
        const boxLeft = parseFloat(selectionBox.style.left) || 0;
        const boxTop = parseFloat(selectionBox.style.top) || 0;
        const boxWidth = parseFloat(selectionBox.style.width) || 0;
        const boxHeight = parseFloat(selectionBox.style.height) || 0;

        // Validate selection box dimensions
        if (isNaN(boxLeft) || isNaN(boxTop) || isNaN(boxWidth) || isNaN(boxHeight)) {
          console.warn('Selection box has invalid dimensions (NaN)');
          isSelecting = false;
          selectionBox.classList.remove('active');
          canvas.style.cursor = 'grab';
          return;
        }

        // Only zoom if selection box is large enough (at least 10x10 pixels)
        if (boxWidth > 10 && boxHeight > 10) {
          // Calculate end coordinates from the box position and size
          const startX = boxLeft;
          const startY = boxTop;
          const endX = boxLeft + boxWidth;
          const endY = boxTop + boxHeight;

          // Validate coordinates before zooming
          if (isFinite(startX) && isFinite(startY) && isFinite(endX) && isFinite(endY)) {
            zoomToSelection(startX, startY, endX, endY, rect);
          } else {
            console.warn('Selection box coordinates are invalid (Infinity)');
          }
        }

        isSelecting = false;
        selectionBox.classList.remove('active');
        canvas.style.cursor = 'grab';
      } else if (isDragging) {
        isDragging = false;
        canvas.style.cursor = 'grab';
      }
    }
  }, { passive: true });

  // Also handle mouse leave to reset cursor if drag ends
  canvas.addEventListener('mouseleave', () => {
    if (!isDragging && !isSelecting) {
      canvas.style.cursor = 'grab';
    }
  }, { passive: true });

  // Update cursor based on modifier keys (consolidated handler)
  const updateCursor = (shiftKey) => {
    if (!isDragging && !isSelecting) {
      canvas.style.cursor = shiftKey ? 'crosshair' : 'grab';
    }
  };

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging && !isSelecting) {
      updateCursor(e.shiftKey);
    }
  }, { passive: true });

  // Handle keydown/keyup to update cursor
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') {
      updateCursor(true);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') {
      updateCursor(false);
    }
  });

  // Double-click to zoom into a point
  // Handle on both canvas and container to ensure it works in fullscreen
  const handleDoubleClick = (e) => {
    // Check if the click is on a fullscreen control button - if so, don't zoom
    const target = e.target;
    if (target.closest?.('.fullscreen-control-btn')) {
      return; // Let the button handle its own click
    }

    // The fullscreen-controls container has pointer-events: none, so clicks pass through
    // We only need to check if we're actually clicking on a button (already done above)
    // Allow handling if clicking on canvas, container, or anywhere in the canvas container
    if (
      target === canvas ||
      target === canvasContainer ||
      canvas.contains(target) ||
      canvasContainer.contains(target)
    ) {
      // Continue with zoom logic - clicks pass through the controls container
    } else {
      return; // Not clicking on canvas area
    }

    e.preventDefault();
    e.stopPropagation();

    // Ensure renderer size is up-to-date (important for fullscreen mode)
    if (updateRendererSize) {
      updateRendererSize();
    }

    // Get canvas bounding rect for mouse position (use cached version)
    const rect = getCanvasRect();

    // Calculate mouse position relative to canvas (0 to 1)
    // UV coordinates are based on the geometry, which uses display dimensions
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Ensure we have valid dimensions
    if (displayWidth === 0 || displayHeight === 0) {
      console.warn('Invalid canvas dimensions for double-click zoom');
      return;
    }

    const uvX = mouseX / displayWidth;
    const uvY = mouseY / displayHeight;

    // Get the canvas's actual pixel dimensions (which the shader uses for uResolution)
    // The shader calculates aspect as uResolution.x / uResolution.y
    // Note: pixel ratio affects both dimensions equally, so aspect should match display aspect
    // But we use canvas dimensions to match exactly what the shader sees
    const rendererWidth = canvas.width;
    const rendererHeight = canvas.height;

    // Ensure we have valid renderer dimensions
    if (rendererWidth === 0 || rendererHeight === 0) {
      console.warn('Invalid renderer dimensions for double-click zoom');
      return;
    }

    const aspect = rendererWidth / rendererHeight;

    // Convert to fractal coordinates using the exact same formula as the shader
    // Shader: (uv.x - 0.5) * scale * aspect * uXScale + uOffset.x
    // where scale = 4.0 / uZoom
    const scale = 4.0 / params.zoom;
    const fractalX = (uvX - 0.5) * scale * aspect * params.xScale + params.offset.x;
    const fractalY = (uvY - 0.5) * scale * params.yScale + params.offset.y;

    // Zoom in by a factor (e.g., 2x)
    const zoomFactor = 2.0;
    params.zoom *= zoomFactor;

    // Center on the clicked point by setting offset to the fractal coordinate
    // After zooming, when uv = 0.5 (center), the formula becomes:
    // (0.5 - 0.5) * (4.0 / newZoom) * aspect * xScale + offset = offset
    // So setting offset to the fractal coordinate centers it correctly
    params.offset.x = fractalX;
    params.offset.y = fractalY;
    updateCoordinateDisplay();

    // Use progressive rendering for faster feedback
    renderFractalProgressive();
  };

  // Attach double-click handler to both canvas and container
  // This ensures it works in both normal and fullscreen modes
  canvas.addEventListener('dblclick', handleDoubleClick);
  canvasContainer.addEventListener('dblclick', handleDoubleClick);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    // Reversed logic: deltaY > 0 (pinch out/spread fingers) should zoom in, deltaY < 0 (pinch in) should zoom out
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    params.zoom *= zoomFactor;
    updateCoordinateDisplay();
    scheduleRender(); // Use throttled render for smooth zooming
  });
}

// Function to get initial render position for a fractal type
function getInitialRenderPosition(fractalType) {
  switch (fractalType) {
    case 'burning-ship':
      return { zoom: 1.2, offset: { x: -0.2924, y: -0.2544 } };
    case 'tricorn':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'celtic-mandelbrot':
      return { zoom: 1.2, offset: { x: -0.4868, y: 0.1464 } };
    case 'mutant-mandelbrot':
      return { zoom: 1, offset: { x: -0.536, y: 0.006 } };
    case 'phoenix-mandelbrot':
      return { zoom: 1, offset: { x: -0.514, y: 0.01 } };
    case 'buffalo':
      return { zoom: 1.2, offset: { x: -0.1592, y: 0.5616 } };
    case 'popcorn':
      return { zoom: 1, offset: { x: 0.173, y: 0.114 } };
    case 'rose':
      return { zoom: 1, offset: { x: 0.132, y: 0.139 } };
    case 'julia-snakes':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'binary-dragon':
      return { zoom: 1, offset: { x: 2.812, y: 0.009 } };
    case 'dragon-lsystem':
      return { zoom: 0.666, offset: { x: 0.2164, y: 0.3085 } };
    case 'folded-paper-dragon':
      return { zoom: 2, offset: { x: -0.3009, y: -0.2052 } };
    case 'heighway-dragon':
      return { zoom: 2, offset: { x: 0.2257, y: -0.1287 } };
    case 'terdragon':
      return { zoom: 1, offset: { x: 0.167, y: 0.114 } };
    case 'twindragon':
      return { zoom: 1, offset: { x: 0.299, y: 0.148 } };
    case 'gosper-curve':
      return { zoom: 2, offset: { x: 0.0723, y: 0.0598 } };
    case 'hilbert-curve':
      return { zoom: 3.015, offset: { x: -0.006, y: 0.0693 } };
    case 'levy-c-curve':
      return { zoom: 1.24, offset: { x: 0.0087, y: 0.1054 } };
    case 'moore-curve':
      return { zoom: 2.662, offset: { x: 0.0016, y: 0.1022 } };
    case 'peano-curve':
      return { zoom: 2.969, offset: { x: -0.003, y: 0.0713 } };
    case 'newton':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'nova':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'halley':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'plant':
      return { zoom: 0.59, offset: { x: 0.003, y: 1.094 } };
    case 'barnsley-fern':
      return { zoom: 1.403, offset: { x: 1.673, y: 1.9506 } };
    case 'multibrot':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'multibrot-julia':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'burning-ship-julia':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'tricorn-julia':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'phoenix-julia':
      return { zoom: 0.605, offset: { x: 0.0284, y: 0.0611 } };
    case 'lambda-julia':
      return { zoom: 1, offset: { x: 0.734, y: 0.24 } };
    case 'hybrid-julia':
      return { zoom: 1, offset: { x: 0.194, y: 0.242 } };
    case 'magnet':
      return { zoom: 2, offset: { x: 0.338, y: -0.048 } };
    case 'amman-tiling':
      return { zoom: 3.2, offset: { x: 0.9382, y: 0.7956 } };
    case 'chair-tiling':
      return { zoom: 4, offset: { x: 0.77, y: 0.502 } };
    case 'snowflake-tiling':
      return { zoom: 4, offset: { x: 0.7616, y: 0.516 } };
    case 'domino-substitution':
      return { zoom: 8.8, offset: { x: 0.3353, y: 0.2999 } };
    case 'pinwheel-tiling':
      return { zoom: 1, offset: { x: 2.46, y: 1.631 } };
    case 'carpenter-square':
      return { zoom: 1, offset: { x: 2.9559, y: 2.7137 } };
    case 'diffusion-limited-aggregation':
      return { zoom: 0.197, offset: { x: 1.2026, y: 0.9662 } };
    case 'sierpinski':
      return { zoom: 1.772, offset: { x: 0.0089, y: 0.039 } };
    case 'sierpinski-arrowhead':
      return { zoom: 2, offset: { x: -0.002, y: -0.0211 } };
    case 'sierpinski-carpet':
      return { zoom: 1.456, offset: { x: 0.1169, y: 0.1266 } };
    case 'sierpinski-gasket':
      return { zoom: 1, offset: { x: 0.019, y: 0.144 } };
    case 'sierpinski-hexagon':
      return { zoom: 1.871, offset: { x: 0.0056, y: 0.0898 } };
    case 'sierpinski-lsystem':
      return { zoom: 1.35, offset: { x: 0, y: 0 } };
    case 'sierpinski-pentagon':
      return { zoom: 1.938, offset: { x: 0, y: 0 } };
    case 'quadrilateral-subdivision':
      return { zoom: 3.186, offset: { x: 0.9638, y: 0.6144 } };
    case 'recursive-polygon-splitting':
      return { zoom: 2, offset: { x: 1.4952, y: 1.059 } };
    case 'triangular-subdivision':
      return { zoom: 1.949, offset: { x: 1.3925, y: 1.0736 } };
    case 'fractal-islands':
      return { zoom: 1, offset: { x: 2.63, y: 2.178 } };
    case 'koch':
      return { zoom: 3.095, offset: { x: -0.0082, y: 0.0351 } };
    case 'quadratic-koch':
      return { zoom: 2.571, offset: { x: -0.0117, y: 0.088 } };
    case 'cantor':
      return { zoom: 1, offset: { x: -0.015, y: 0.331 } };
    case 'cantor-dust-base-expansion':
      return { zoom: 1, offset: { x: 2.978, y: 2.04 } };
    case 'cantor-dust-circular':
      return { zoom: 2.597, offset: { x: 1.1991, y: 0.9663 } };
    case 'fat-cantor':
      return { zoom: 1, offset: { x: -0.001, y: 0.102 } };
    case 'smith-volterra-cantor':
      return { zoom: 1, offset: { x: -0.001, y: 0.047 } };
    case 'random-cantor':
      return { zoom: 1, offset: { x: 0, y: 0.075 } };
    case 'apollonian-gasket':
      return { zoom: 2, offset: { x: 1.3446, y: 1.0435 } };
    case 'h-tree':
      return { zoom: 2, offset: { x: 0.1054, y: 0.0943 } };
    case 'h-tree-generalized':
      return { zoom: 2, offset: { x: 0.0928, y: 0.0537 } };
    case 'vicsek':
      return { zoom: 2, offset: { x: 1.4429, y: 1.1241 } };
    case 'cross':
      return { zoom: 2, offset: { x: 1.2376, y: 0.986 } };
    case 'fractal-flame':
      return { zoom: 2, offset: { x: 1.5885, y: 1.0331 } };
    case 'recursive-circle-removal':
      return { zoom: 3.294, offset: { x: 0.9156, y: 0.747 } };
    case 'box-variants':
      return { zoom: 2, offset: { x: 1.4905, y: 1.1342 } };
    case 'minkowski-sausage':
      return { zoom: 3.191, offset: { x: 0.0067, y: 0.0534 } };
    case 'penrose-substitution':
      return { zoom: 4, offset: { x: 0.7834, y: 0.5579 } };
    case 'rauzy':
      return { zoom: 4, offset: { x: 0.7877, y: 0.6103 } };
    case 'spider-set':
      return { zoom: 2, offset: { x: -0.7682, y: 0.0595 } };
    case 'cesaro':
      return { zoom: 3.032, offset: { x: 0.0808, y: 0.0587 } };
    case 'julia':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'mandelbrot':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    case 'nebulabrot':
      return { zoom: 1, offset: { x: 0, y: 0 } };
    default:
      return { zoom: 1, offset: { x: 0, y: 0 } };
  }
}

function setupUI() {
  const fractalTypeSelect = document.getElementById('fractal-type');
  const iterationsSlider = document.getElementById('iterations');
  const iterationsValue = document.getElementById('iterations-value');
  const colorSchemeSelect = document.getElementById('color-scheme');
  const juliaCReal = document.getElementById('julia-c-real');
  const juliaCRealValue = document.getElementById('julia-c-real-value');
  const juliaCImag = document.getElementById('julia-c-imag');
  const juliaCImagValue = document.getElementById('julia-c-imag-value');
  const resetViewBtn = document.getElementById('reset-view');
  const screenshotBtn = document.getElementById('screenshot');
  const fullscreenBtn = document.getElementById('fullscreen');
  const juliaControls = document.getElementById('julia-controls');
  const xScaleSlider = document.getElementById('x-scale');
  const xScaleValue = document.getElementById('x-scale-value');
  const yScaleSlider = document.getElementById('y-scale');
  const yScaleValue = document.getElementById('y-scale-value');

  const updateFractalBtn = document.getElementById('update-fractal');
  const autoRenderCheckbox = document.getElementById('auto-render');

  // Auto-render functionality
  let autoRenderEnabled = false;

  // Throttled render function for slider updates
  // Updates UI immediately but throttles render calls to reduce unnecessary renders
  let renderTimeoutId = null;
  const triggerAutoRender = () => {
    if (autoRenderEnabled) {
      // Cancel any pending render
      if (renderTimeoutId !== null) {
        cancelAnimationFrame(renderTimeoutId);
      }
      // Schedule render for next animation frame (~16ms at 60fps)
      renderTimeoutId = requestAnimationFrame(() => {
        renderFractalProgressive();
        renderTimeoutId = null;
      });
    }
  };

  autoRenderCheckbox.addEventListener('change', (e) => {
    autoRenderEnabled = e.target.checked;
    updateFractalBtn.disabled = autoRenderEnabled;

    // If enabling auto-render, immediately render
    if (autoRenderEnabled) {
      renderFractalProgressive();
    }
  });

  // Initialize Julia controls state based on current fractal type
  const isJulia = isJuliaType(currentFractalType);
  juliaCReal.disabled = !isJulia;
  juliaCImag.disabled = !isJulia;
  if (isJulia) {
    juliaControls.classList.remove('disabled');
  } else {
    juliaControls.classList.add('disabled');
  }

  // Color scheme cycling (shared between main UI and fullscreen controls)
  // Use CONFIG as the single source of truth for color schemes
  const colorSchemes = CONFIG.colors.schemes;

  // Populate color scheme dropdown dynamically from CONFIG
  if (colorSchemeSelect) {
    // Clear existing options (keep the first one as placeholder if needed)
    colorSchemeSelect.innerHTML = '';

    // Helper function to format scheme names for display
    const formatSchemeName = (scheme) => {
      const nameMap = {
        'classic': 'Classic',
        'fire': 'Fire',
        'ocean': 'Ocean',
        'rainbow': 'Rainbow',
        'rainbow-pastel': 'Rainbow Pastel',
        'rainbow-dark': 'Rainbow Dark',
        'rainbow-vibrant': 'Rainbow Vibrant',
        'rainbow-double': 'Rainbow Double',
        'rainbow-shifted': 'Rainbow Shifted',
        'monochrome': 'Monochrome',
        'forest': 'Forest',
        'sunset': 'Sunset',
        'purple': 'Purple',
        'cyan': 'Cyan',
        'gold': 'Gold',
        'ice': 'Ice',
        'neon': 'Neon',
        'cosmic': 'Cosmic',
        'aurora': 'Aurora',
        'coral': 'Coral',
        'autumn': 'Autumn',
        'midnight': 'Midnight',
        'emerald': 'Emerald',
        'rosegold': 'Rose Gold',
        'electric': 'Electric',
        'vintage': 'Vintage',
        'tropical': 'Tropical',
        'galaxy': 'Galaxy',
      };
      return nameMap[scheme] || scheme.charAt(0).toUpperCase() + scheme.slice(1);
    };

    // Add all schemes from CONFIG
    colorSchemes.forEach((scheme) => {
      const option = document.createElement('option');
      option.value = scheme;
      option.textContent = formatSchemeName(scheme);
      colorSchemeSelect.appendChild(option);
    });

    // Set the current value
    if (params.colorScheme) {
      colorSchemeSelect.value = params.colorScheme;
    }
  }

  let currentColorSchemeIndex = colorSchemes.indexOf(params.colorScheme);
  if (currentColorSchemeIndex === -1) currentColorSchemeIndex = 0;

  // Function to render a mini palette preview for the current color scheme
  const updateColorPalettePreview = () => {
    const paletteCanvas = document.getElementById('fullscreen-color-palette');
    if (!paletteCanvas) return;

    const ctx = paletteCanvas.getContext('2d');
    if (!ctx) return;

    const width = paletteCanvas.width;
    const height = paletteCanvas.height;
    const numColors = 8; // Number of color swatches to show

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Use getColorSchemeIndex from utils.js to get the correct scheme index
    // This ensures the index matches what's used in the actual color computation
    const schemeIndex = getColorSchemeIndex(params.colorScheme);
    if (schemeIndex === -1) return;

    // Draw color swatches using the same color computation as utils.js
    const swatchWidth = width / numColors;
    for (let i = 0; i < numColors; i++) {
      const t = i / (numColors - 1);

      // Use the same color computation function as utils.js
      const color = computeColorForScheme(t, schemeIndex);

      // Draw the color swatch
      ctx.fillStyle = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
      ctx.fillRect(i * swatchWidth, 0, swatchWidth, height);
    }
  };

  fractalTypeSelect.addEventListener('change', async (e) => {
    currentFractalType = e.target.value;
    updateWikipediaLink();
    updateCoordinateDisplay();

    // Clear previous fractal draw command
    drawFractal = null;
    cachedDrawCommand = null;
    isDisplayingCached = false;

    // Clear the cache for this fractal type to force a fresh load
    fractalCache.delete(currentFractalType);

    // Clear frame cache when fractal type changes
    frameCache.clear();

    // Load the new fractal module
    try {
      await loadFractal(currentFractalType);
    } catch (error) {
      console.error('Failed to load fractal on change:', error);
      return;
    }

    // Enable/disable Julia controls based on fractal type
    const isJulia = isJuliaType(currentFractalType);
    juliaCReal.disabled = !isJulia;
    juliaCImag.disabled = !isJulia;
    if (isJulia) {
      juliaControls.classList.remove('disabled');
    } else {
      juliaControls.classList.add('disabled');
    }

    // Set default view parameters based on fractal type
    // First, reset scale parameters to defaults to avoid stretching issues
    // (will be overridden by fractal-specific values below if needed)
    params.xScale = 1.0;
    params.yScale = 1.0;
    // Update scale sliders to match params
    if (xScaleSlider) {
      xScaleSlider.value = 1.0;
      updateSliderAccessibility(xScaleSlider, xScaleValue, xScaleAnnounce, 1.0, 'X Axis', false);
    }
    if (yScaleSlider) {
      yScaleSlider.value = 1.0;
      updateSliderAccessibility(yScaleSlider, yScaleValue, yScaleAnnounce, 1.0, 'Y Axis', false);
    }

    // Track whether iterations were explicitly set for this fractal type
    let iterationsExplicitlySet = false;

    // Get initial render position from config if available, otherwise use fallback function
    const fractalConfig = currentFractalModule?.config;
    let initialPosition;
    if (fractalConfig?.initialPosition) {
      initialPosition = fractalConfig.initialPosition;
    } else {
      // Fallback to hardcoded positions for fractals without config
      initialPosition = getInitialRenderPosition(currentFractalType);
    }
    params.zoom = initialPosition.zoom;
    params.offset.x = initialPosition.offset.x;
    params.offset.y = initialPosition.offset.y;

    // Apply config's initialSettings - all parameters come from config files
    if (fractalConfig?.initialSettings) {
      const settings = fractalConfig.initialSettings;

      // Apply iterations if specified
      if (settings.iterations !== undefined) {
        params.iterations = settings.iterations;
        iterationsExplicitlySet = true;
        if (iterationsSlider) iterationsSlider.value = settings.iterations;
        if (iterationsValue) iterationsValue.textContent = settings.iterations.toString();
        const fullscreenIterationsNumberEl = document.getElementById('fullscreen-iterations-number');
        if (fullscreenIterationsNumberEl) {
          fullscreenIterationsNumberEl.textContent = settings.iterations.toString();
        }
      }

      // Apply colorScheme if specified
      if (settings.colorScheme !== undefined) {
        params.colorScheme = settings.colorScheme;
        if (colorSchemeSelect) {
          colorSchemeSelect.value = settings.colorScheme;
        }
        const newIndex = colorSchemes.indexOf(settings.colorScheme);
        if (newIndex !== -1) {
          currentColorSchemeIndex = newIndex;
        }
        updateColorPalettePreview();
        // Clear draw command to force regeneration with new palette
        drawFractal = null;
        cachedDrawCommand = null;
      }

      // Apply juliaC if specified (for Julia set fractals)
      if (settings.juliaC !== undefined) {
        params.juliaC.x = settings.juliaC.x;
        params.juliaC.y = settings.juliaC.y;
        if (juliaCReal) juliaCReal.value = settings.juliaC.x;
        if (juliaCImag) juliaCImag.value = settings.juliaC.y;
        if (juliaCRealValue) juliaCRealValue.textContent = settings.juliaC.x.toFixed(4);
        if (juliaCImagValue) juliaCImagValue.textContent = settings.juliaC.y.toFixed(4);
      }

      // Apply xScale if specified
      if (settings.xScale !== undefined) {
        params.xScale = settings.xScale;
        if (xScaleSlider) {
          xScaleSlider.value = settings.xScale;
          updateSliderAccessibility(xScaleSlider, xScaleValue, xScaleAnnounce, settings.xScale, 'X Axis', false);
        }
        if (xScaleValue) xScaleValue.textContent = settings.xScale.toString();
      }

      // Apply yScale if specified
      if (settings.yScale !== undefined) {
        params.yScale = settings.yScale;
        if (yScaleSlider) {
          yScaleSlider.value = settings.yScale;
          updateSliderAccessibility(yScaleSlider, yScaleValue, yScaleAnnounce, settings.yScale, 'Y Axis', false);
        }
        if (yScaleValue) yScaleValue.textContent = settings.yScale.toString();
      }
    }

    if (currentFractalType === 'burning-ship') {
      // Burning Ship - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'tricorn') {
      // Tricorn - similar view to Mandelbrot but inverted (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'celtic-mandelbrot') {
      // Celtic Mandelbrot - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'mutant-mandelbrot') {
      // Mutant Mandelbrot - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'phoenix-mandelbrot') {
      // Phoenix Mandelbrot - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'buffalo') {
      // Buffalo - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'popcorn') {
      // Popcorn fractal - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'rose') {
      // Rose window fractal - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'julia-snakes') {
      // Julia Snakes - settings come from config
    } else if (currentFractalType === 'binary-dragon') {
      // Binary Dragon - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'dragon-lsystem') {
      // Dragon L-System - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'folded-paper-dragon') {
      // Folded Paper Dragon - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'heighway-dragon') {
      // Heighway Dragon - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'terdragon') {
      // Terdragon - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'twindragon') {
      // Twindragon - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'gosper-curve') {
      // Gosper Curve - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'hilbert-curve') {
      // Hilbert Curve - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'levy-c-curve') {
      // Levy C-Curve - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'moore-curve') {
      // Moore Curve - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'peano-curve') {
      // Peano Curve - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'newton') {
      // Newton Fractal - settings come from config
    } else if (currentFractalType === 'nova') {
      // Nova Fractal - settings come from config
    } else if (currentFractalType === 'halley') {
      // Halley Fractal - settings come from config
    } else if (currentFractalType === 'plant') {
      // Plant - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'barnsley-fern') {
      // Barnsley Fern - settings come from config
    } else if (currentFractalType === 'multibrot') {
      // Multibrot Set - settings come from config
    } else if (currentFractalType === 'multibrot-julia') {
      // Multibrot Julia Set - settings come from config
    } else if (currentFractalType === 'burning-ship-julia') {
      // Burning Ship Julia Set - settings come from config
    } else if (currentFractalType === 'tricorn-julia') {
      // Tricorn Julia Set - settings come from config
    } else if (currentFractalType === 'phoenix-julia') {
      // Phoenix Julia Set - settings come from config
    } else if (currentFractalType === 'lambda-julia') {
      // Lambda Julia Set - settings come from config
    } else if (currentFractalType === 'hybrid-julia') {
      // Hybrid Julia Set - settings come from config
    } else if (currentFractalType === 'magnet') {
      // Magnet Fractal - settings come from config
    } else if (currentFractalType === 'amman-tiling') {
      // Amman Tiling - settings come from config
    } else if (currentFractalType === 'chair-tiling') {
      // Chair Tiling - settings come from config
    } else if (currentFractalType === 'snowflake-tiling') {
      // Snowflake Tiling - settings come from config
    } else if (currentFractalType === 'domino-substitution') {
      // Domino Substitution - settings come from config
    } else if (currentFractalType === 'pinwheel-tiling') {
      // Pinwheel Tiling - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'carpenter-square') {
      // Carpenter Square - settings come from config
    } else if (currentFractalType === 'diffusion-limited-aggregation') {
      // Diffusion Limited Aggregation - settings come from config
    } else if (currentFractalType === 'levy-flights') {
      // Lévy Flights - settings come from config
    } else if (currentFractalType === 'sierpinski') {
      // Sierpinski Triangle - settings come from config
    } else if (currentFractalType === 'sierpinski-arrowhead') {
      // Sierpinski Arrowhead - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'sierpinski-carpet') {
      // Sierpinski Carpet - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'sierpinski-gasket') {
      // Sierpinski Gasket - settings come from config
    } else if (currentFractalType === 'sierpinski-hexagon') {
      // Sierpinski Hexagon - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'sierpinski-lsystem') {
      // Sierpinski L-System - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'sierpinski-pentagon') {
      // Sierpinski Pentagon - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'quadrilateral-subdivision') {
      // Quadrilateral Subdivision - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'recursive-polygon-splitting') {
      // Recursive Polygon Splitting - settings come from config
    } else if (currentFractalType === 'triangular-subdivision') {
      // Triangular Subdivision - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'fractal-islands') {
      // Fractal Islands - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'koch') {
      // Koch Curve - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'quadratic-koch') {
      // Quadratic Koch Curve - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'cantor') {
      // Cantor Set - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'cantor-dust-base-expansion') {
      // Cantor Dust Base Expansion - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'cantor-dust-circular') {
      // Cantor Dust Circular - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'fat-cantor') {
      // Fat Cantor Set - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'smith-volterra-cantor') {
      // Smith-Volterra-Cantor Set - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'random-cantor') {
      // Random Cantor Set - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'apollonian-gasket') {
      // Apollonian Gasket - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'h-tree') {
      // H-Tree - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'h-tree-generalized') {
      // H-Tree Generalized - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'vicsek') {
      // Vicsek - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'cross') {
      // Cross - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'fractal-flame') {
      // Fractal Flame - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'recursive-circle-removal') {
      // Recursive Circle Removal - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'box-variants') {
      // Box Variants - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'minkowski-sausage') {
      // Minkowski Sausage - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'penrose-substitution') {
      // Penrose Substitution - settings come from config
    } else if (currentFractalType === 'rauzy') {
      // Rauzy - settings come from config
    } else if (currentFractalType === 'spider-set') {
      // Spider Set - additional settings (position set by getInitialRenderPosition)
    } else if (currentFractalType === 'cesaro') {
      // Cesaro - additional settings (position set by getInitialRenderPosition)
    }
    // Default view is handled by config.initialPosition or getInitialRenderPosition function
    // Config settings are applied early above, but can be overridden by specific fractal blocks above

    // Update coordinate display after setting positions
    updateCoordinateDisplay();

    // Set default iterations to 200 if not explicitly set for this fractal type
    if (!iterationsExplicitlySet) {
      params.iterations = 200;
      if (iterationsSlider) iterationsSlider.value = 200;
      if (iterationsValue) iterationsValue.textContent = '200';
      const fullscreenIterationsNumberEl = document.getElementById('fullscreen-iterations-number');
      if (fullscreenIterationsNumberEl) {
        fullscreenIterationsNumberEl.textContent = '200';
      }
    }

    // Render only if auto-render is enabled
    if (autoRenderEnabled) {
      // Clear the canvas before rendering the new fractal
      if (regl && canvas) {
        regl.clear({
          color: [0, 0, 0, 1],
          depth: 1,
        });
      }
      renderFractalProgressive();
    }
  });

  iterationsSlider.addEventListener('input', (e) => {
    params.iterations = parseInt(e.target.value);
    // Update UI immediately for responsiveness
    iterationsValue.textContent = params.iterations;
    // Update fullscreen iterations number
    const fullscreenIterationsNumberEl = document.getElementById('fullscreen-iterations-number');
    if (fullscreenIterationsNumberEl) {
      fullscreenIterationsNumberEl.textContent = params.iterations;
    }
    // Throttled render
    triggerAutoRender();
  });

  colorSchemeSelect.addEventListener('change', (e) => {
    params.colorScheme = e.target.value;
    // Update color scheme index for fullscreen cycling
    const newIndex = colorSchemes.indexOf(params.colorScheme);
    if (newIndex !== -1) {
      currentColorSchemeIndex = newIndex;
    }
    // Update palette preview when color scheme changes from main UI
    updateColorPalettePreview();
    triggerAutoRender();
  });

  juliaCReal.addEventListener('input', (e) => {
    params.juliaC.x = parseFloat(e.target.value);
    // Update UI immediately for responsiveness
    juliaCRealValue.textContent = params.juliaC.x.toFixed(4);
    // Throttled render
    triggerAutoRender();
  });

  juliaCImag.addEventListener('input', (e) => {
    params.juliaC.y = parseFloat(e.target.value);
    // Update UI immediately for responsiveness
    juliaCImagValue.textContent = params.juliaC.y.toFixed(4);
    // Throttled render
    triggerAutoRender();
  });

  // Get aria-live announcement elements
  const xScaleAnnounce = document.getElementById('x-scale-announce');
  const yScaleAnnounce = document.getElementById('y-scale-announce');

  // Function to update slider accessibility and announce value
  function updateSliderAccessibility(slider, valueElement, announceElement, value, label, announce = true) {
    const formattedValue = value.toFixed(1);
    valueElement.textContent = formattedValue;
    if (slider) {
      slider.setAttribute('aria-valuenow', formattedValue);
      slider.setAttribute('aria-valuetext', formattedValue);
    }

    // Announce to screen readers (only when user is interacting)
    if (announce && announceElement) {
      announceElement.textContent = `${label} scale set to ${formattedValue}`;
      // Clear after announcement to allow re-announcement of same value
      setTimeout(() => {
        announceElement.textContent = '';
      }, 1000);
    }
  }

  xScaleSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    params.xScale = value;
    // Update UI immediately for responsiveness
    updateSliderAccessibility(xScaleSlider, xScaleValue, xScaleAnnounce, value, 'X Axis');
    // Throttled render
    triggerAutoRender();
  });

  yScaleSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    params.yScale = value;
    // Update UI immediately for responsiveness
    updateSliderAccessibility(yScaleSlider, yScaleValue, yScaleAnnounce, value, 'Y Axis');
    // Throttled render
    triggerAutoRender();
  });

  // Ensure y-axis slider scrolls into view when focused via keyboard
  yScaleSlider.addEventListener('focus', () => {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      const panelContent = yScaleSlider.closest('.panel-content');
      if (panelContent) {
        const sliderRect = yScaleSlider.getBoundingClientRect();
        const panelRect = panelContent.getBoundingClientRect();
        const footer = document.querySelector('.app-footer');
        const footerHeight = footer ? footer.offsetHeight : 120;

        // Calculate if slider is hidden behind footer
        const viewportBottom = panelRect.bottom - footerHeight - 20; // 20px padding

        if (sliderRect.bottom > viewportBottom) {
          // Calculate how much to scroll
          const scrollAmount = sliderRect.bottom - viewportBottom + 20; // Extra padding
          panelContent.scrollTop += scrollAmount;
        }
      }
    });
  });

  updateFractalBtn.addEventListener('click', async () => {
    // Always ensure the correct fractal module is loaded for the current type
    try {
      await loadFractal(currentFractalType);
    } catch (error) {
      console.error('Failed to load fractal on update:', error);
      return;
    }

    // Verify the loaded module matches the current fractal type
    if (!currentFractalModule || !currentFractalModule.render) {
      console.error('Fractal module not properly loaded:', currentFractalType);
      return;
    }

    // Reset draw command to force recreation with new settings
    drawFractal = null;
    cachedDrawCommand = null;
    isDisplayingCached = false;

    // Clear the canvas before rendering new fractal
    if (regl && canvas) {
      regl.clear({
        color: [0, 0, 0, 1],
        depth: 1,
      });
    }

    // Add visual feedback
    updateFractalBtn.textContent = 'Rendering...';
    updateFractalBtn.disabled = true;

    // Use requestAnimationFrame to ensure UI updates before heavy computation
    requestAnimationFrame(() => {
      try {
        renderFractal();
      } catch (error) {
        console.error('Error rendering fractal:', error);
        hideLoadingBar();
      } finally {
        // Reset button after rendering completes
        setTimeout(() => {
          updateFractalBtn.textContent = 'Update Fractal';
          updateFractalBtn.disabled = false;
        }, 100);
      }
    });
  });

  resetViewBtn.addEventListener('click', () => {
    // Reset zoom and offset to initial render position from config or fallback
    const resetConfig = currentFractalModule?.config;
    let initialPosition;
    if (resetConfig?.initialPosition) {
      initialPosition = resetConfig.initialPosition;
    } else {
      initialPosition = getInitialRenderPosition(currentFractalType);
    }
    params.zoom = initialPosition.zoom;
    params.offset.x = initialPosition.offset.x;
    params.offset.y = initialPosition.offset.y;
    updateCoordinateDisplay();

    // Reset scale parameters and other settings from config
    if (resetConfig?.initialSettings) {
      const settings = resetConfig.initialSettings;

      // Reset xScale from config or default to 1.0
      if (settings.xScale !== undefined) {
        params.xScale = settings.xScale;
        if (xScaleSlider) {
          xScaleSlider.value = settings.xScale;
          updateSliderAccessibility(xScaleSlider, xScaleValue, xScaleAnnounce, settings.xScale, 'X Axis', false);
        }
      } else {
        params.xScale = 1.0;
        if (xScaleSlider) {
          xScaleSlider.value = 1.0;
          updateSliderAccessibility(xScaleSlider, xScaleValue, xScaleAnnounce, 1.0, 'X Axis', false);
        }
      }

      // Reset yScale from config or default to 1.0
      if (settings.yScale !== undefined) {
        params.yScale = settings.yScale;
        if (yScaleSlider) {
          yScaleSlider.value = settings.yScale;
          updateSliderAccessibility(yScaleSlider, yScaleValue, yScaleAnnounce, settings.yScale, 'Y Axis', false);
        }
      } else {
        params.yScale = 1.0;
        if (yScaleSlider) {
          yScaleSlider.value = 1.0;
          updateSliderAccessibility(yScaleSlider, yScaleValue, yScaleAnnounce, 1.0, 'Y Axis', false);
        }
      }

      // Reset juliaC from config if specified
      if (settings.juliaC !== undefined) {
        params.juliaC.x = settings.juliaC.x;
        params.juliaC.y = settings.juliaC.y;
        if (juliaCReal) juliaCReal.value = settings.juliaC.x;
        if (juliaCImag) juliaCImag.value = settings.juliaC.y;
        if (juliaCRealValue) juliaCRealValue.textContent = settings.juliaC.x.toFixed(4);
        if (juliaCImagValue) juliaCImagValue.textContent = settings.juliaC.y.toFixed(4);
      }

      // Reset iterations from config if specified
      if (settings.iterations !== undefined) {
        params.iterations = settings.iterations;
        if (iterationsSlider) iterationsSlider.value = settings.iterations;
        if (iterationsValue) iterationsValue.textContent = settings.iterations.toString();
        const fullscreenIterationsNumberEl = document.getElementById('fullscreen-iterations-number');
        if (fullscreenIterationsNumberEl) {
          fullscreenIterationsNumberEl.textContent = settings.iterations.toString();
        }
      }

      // Reset color scheme from config if specified
      if (settings.colorScheme !== undefined) {
        params.colorScheme = settings.colorScheme;
        if (colorSchemeSelect) colorSchemeSelect.value = settings.colorScheme;
        const newIndex = colorSchemes.indexOf(settings.colorScheme);
        if (newIndex !== -1) {
          currentColorSchemeIndex = newIndex;
        }
        updateColorPalettePreview();
      }
    } else {
      // Default to 1.0 if no config
      params.xScale = 1.0;
      params.yScale = 1.0;
      if (xScaleSlider) {
        xScaleSlider.value = 1.0;
        updateSliderAccessibility(xScaleSlider, xScaleValue, xScaleAnnounce, 1.0, 'X Axis', false);
      }
      if (yScaleSlider) {
        yScaleSlider.value = 1.0;
        updateSliderAccessibility(yScaleSlider, yScaleValue, yScaleAnnounce, 1.0, 'Y Axis', false);
      }
    }

    renderFractal();
  });

  // Shared screenshot function to avoid code duplication
  const captureScreenshot = (event) => {
    // Ensure we render before capturing
    if (drawFractal) {
      drawFractal();
    }

    // Wait a frame to ensure rendering is complete
    requestAnimationFrame(() => {
      // Check if canvas has content
      if (canvas.width === 0 || canvas.height === 0) {
        console.error('Canvas has no dimensions, cannot capture screenshot');
        return;
      }

      // Determine which button was clicked (regular or fullscreen)
      const button = event?.target?.closest('button') || screenshotBtn;
      const originalHTML = button.innerHTML;

      // Show visual feedback that screenshot is being captured
      button.innerHTML = '<span>Capturing...</span>';
      button.disabled = true;

      try {
        // Use toBlob() instead of toDataURL() - non-blocking and more efficient
        // This runs asynchronously without blocking the main thread
        canvas.toBlob(
          (blob) => {
            // Re-enable button
            button.innerHTML = originalHTML;
            button.disabled = false;

            if (!blob) {
              console.error('Failed to capture canvas data');
              alert('Failed to capture screenshot. Please try again.');
              return;
            }

            // Create object URL from blob (much faster than base64 data URL)
            const url = URL.createObjectURL(blob);

            // Create download link
            const link = document.createElement('a');
            link.download = `fractal-${currentFractalType}-${Date.now()}.png`;
            link.href = url;

            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up object URL after a short delay
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          },
          'image/png',
          1.0 // Quality (1.0 = max quality for lossless PNG)
        );
      } catch (error) {
        button.innerHTML = originalHTML;
        button.disabled = false;
        console.error('Error capturing screenshot:', error);
        alert('Failed to capture screenshot. Please try again.');
      }
    });
  };

  screenshotBtn.addEventListener('click', captureScreenshot);

  // Fullscreen API functionality
  const canvasContainer = document.querySelector('.canvas-container');

  // Helper functions for cross-browser fullscreen support
  const requestFullscreen = (element) => {
    if (element.requestFullscreen) {
      return element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      return element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
      return element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
      return element.msRequestFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      return document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      return document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      return document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      return document.msExitFullscreen();
    }
  };

  const isFullscreen = () => {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  };

  // Fullscreen controls
  const fullscreenControls = document.getElementById('fullscreen-controls');
  const fullscreenScreenshotBtn = document.getElementById('fullscreen-screenshot');
  const fullscreenColorCycleBtn = document.getElementById('fullscreen-color-cycle');
  const fullscreenRandomBtn = document.getElementById('fullscreen-random');

  // Function to validate if coordinates will produce an interesting view
  // Samples points and checks for variation in iteration counts
  function isValidInterestingView(offset, zoom, fractalType) {
    // For geometric fractals and chaotic maps, they're generally always interesting
    if (fractalType === 'sierpinski' || fractalType === 'sierpinski-arrowhead' || fractalType === 'sierpinski-carpet' || fractalType === 'sierpinski-pentagon' || fractalType === 'sierpinski-hexagon' || fractalType === 'sierpinski-gasket' || fractalType === 'koch' || fractalType === 'quadratic-koch' || fractalType === 'minkowski-sausage' || fractalType === 'cesaro' || fractalType === 'vicsek' || fractalType === 'cross' || fractalType === 'box-variants' || fractalType === 'h-tree' || fractalType === 'h-tree-generalized' || fractalType === 'heighway-dragon' || fractalType === 'hilbert-curve' || fractalType === 'twindragon' || fractalType === 'terdragon' || fractalType === 'binary-dragon' || fractalType === 'folded-paper-dragon' || fractalType === 'peano-curve' || fractalType === 'popcorn' || fractalType === 'rose' || fractalType === 'mutant-mandelbrot' || fractalType === 'cantor' || fractalType === 'fat-cantor' || fractalType === 'smith-volterra-cantor' || fractalType === 'random-cantor') {
      return true;
    }

    // For Burning Ship, Buffalo, and Multibrot, use similar validation to Mandelbrot
    // (they're escape-time fractals with similar characteristics)
    if (fractalType === 'burning-ship' || fractalType === 'buffalo' || fractalType === 'multibrot') {
      fractalType = 'mandelbrot'; // Use same validation logic
    }

    // For Mandelbrot/Julia/Burning Ship/Buffalo, sample points to check for variation
    const samplePoints = 9; // 3x3 grid
    const iterations = params.iterations;
    // Cache canvas dimensions
    const canvasEl = canvas;
    const aspect = canvasEl.width / canvasEl.height;
    const scale = 4.0 / zoom;
    const scaleXAspect = scale * aspect * params.xScale;
    const scaleY = scale * params.yScale;

    let escapeCount = 0;
    let stayCount = 0;
    let midRangeCount = 0;

    // Pre-calculate constants
    const isMandelbrot = fractalType === 'mandelbrot';
    const maxCheckIter = Math.min(50, iterations);

    // Sample points across the view
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        // Sample at different positions in the view
        const u = (i + 0.5) / 3;
        const v = (j + 0.5) / 3;

        // Convert to fractal coordinates (optimized calculation)
        const cX = (u - 0.5) * scaleXAspect + offset.x;
        const cY = (v - 0.5) * scaleY + offset.y;

        // Quick iteration check (simplified Mandelbrot/Julia calculation)
        let zx = isMandelbrot ? 0 : cX;
        let zy = isMandelbrot ? 0 : cY;
        const cx = isMandelbrot ? cX : params.juliaC.x;
        const cy = isMandelbrot ? cY : params.juliaC.y;

        let iter = 0;
        let escaped = false;

        // Quick iteration (max 50 iterations for validation)
        for (let k = 0; k < maxCheckIter; k++) {
          const zx2 = zx * zx;
          const zy2 = zy * zy;
          if (zx2 + zy2 > 4.0) {
            escaped = true;
            iter = k;
            break;
          }
          const newZx = zx2 - zy2 + cx;
          zy = 2.0 * zx * zy + cy;
          zx = newZx;
        }

        if (escaped) {
          if (iter < 5) {
            escapeCount++; // Escaped very quickly (likely blank area)
          } else {
            midRangeCount++; // Escaped after some iterations (interesting boundary)
          }
        } else {
          stayCount++; // Never escaped (inside set)
        }
      }
    }

    // A view is interesting if:
    // 1. Not all points escape immediately (not all blank)
    // 2. Not all points stay in set (not all black)
    // 3. Has some variation (mix of escape times)
    const hasVariation = escapeCount > 0 && stayCount > 0;
    const hasMidRange = midRangeCount > 0;
    const notAllBlank = escapeCount < samplePoints;
    const notAllBlack = stayCount < samplePoints;

    // Also check if we're in a reasonable range for Mandelbrot
    if (isMandelbrot) {
      // Use squared distance to avoid sqrt calculation
      const distSquared = offset.x * offset.x + offset.y * offset.y;
      // If too far from origin at low zoom, likely blank (compare squared: 2.5^2 = 6.25)
      if (zoom < 10 && distSquared > 6.25) {
        return false;
      }
    }

    return (hasVariation || hasMidRange) && notAllBlank && notAllBlack;
  }

  // Helper function to remove duplicate points and replace with new random ones
  function removeDuplicatePoints(locations, fractalType) {
    const seen = new Set();
    const unique = [];

    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      // Create a key from x, y, and zoom (rounded to avoid floating point issues)
      const key = `${loc.x.toFixed(6)},${loc.y.toFixed(6)},${loc.zoom.toFixed(2)}`;

      if (seen.has(key)) {
        // Duplicate found - generate a new random interesting point
        const newPoint = generateRandomInterestingPoint(fractalType, seen);
        unique.push(newPoint);
        const newKey = `${newPoint.x.toFixed(6)},${newPoint.y.toFixed(6)},${newPoint.zoom.toFixed(2)}`;
        seen.add(newKey);
      } else {
        seen.add(key);
        unique.push(loc);
      }
    }

    return unique;
  }

  // Generate a random interesting point for a fractal type
  function generateRandomInterestingPoint(fractalType, excludeSet) {
    let attempts = 0;
    let newPoint;

    do {
      // Generate random point based on fractal type
      switch (fractalType) {
        case 'mandelbrot':
        case 'burning-ship':
        case 'buffalo':
        case 'multibrot':
          newPoint = {
            x: -2 + Math.random() * 2.5,
            y: -1.25 + Math.random() * 2.5,
            zoom: 1 + Math.random() * 1000,
          };
          break;
        case 'julia':
        case 'julia-snakes':
          newPoint = {
            x: -1 + Math.random() * 2,
            y: -1 + Math.random() * 2,
            zoom: 1 + Math.random() * 5,
          };
          break;
        case 'mutant-mandelbrot':
          newPoint = {
            x: -1 + Math.random() * 2,
            y: -1 + Math.random() * 2,
            zoom: 1 + Math.random() * 5,
          };
          break;
        default:
          // For geometric fractals, use smaller ranges
          newPoint = {
            x: -0.5 + Math.random() * 1,
            y: -0.5 + Math.random() * 1,
            zoom: 1 + Math.random() * 15,
          };
      }

      const key = `${newPoint.x.toFixed(6)},${newPoint.y.toFixed(6)},${newPoint.zoom.toFixed(2)}`;
      if (!excludeSet.has(key)) {
        return newPoint;
      }
      attempts++;
    } while (attempts < 100); // Prevent infinite loop

    // Fallback if we can't generate a unique point
    return {
      x: -0.5 + Math.random() * 1,
      y: -0.5 + Math.random() * 1,
      zoom: 1 + Math.random() * 10,
    };
  }

  // Function to generate random interesting coordinates and zoom for each fractal type
  function getRandomInterestingView() {
    const fractalType = currentFractalType;
    const fractalConfig = currentFractalModule?.config;

    // Check if fractal has interesting points defined in config
    if (fractalConfig?.interestingPoints && fractalConfig.interestingPoints.length > 0) {
      let interestingLocations = fractalConfig.interestingPoints;

      // Handle special cases that need additional logic
      if (fractalType === 'sierpinski-gasket') {
        // Generalised Sierpinski Gasket - randomly select polygon type
        const polygonTypes = [
          { sides: 3, name: 'Triangle' },   // xScale = 0.0
          { sides: 4, name: 'Square' },     // xScale = 0.167
          { sides: 5, name: 'Pentagon' },   // xScale = 0.333
          { sides: 6, name: 'Hexagon' },    // xScale = 0.5
          { sides: 7, name: 'Heptagon' },   // xScale = 0.667
          { sides: 8, name: 'Octagon' },    // xScale = 0.833
          { sides: 9, name: 'Nonagon' },    // xScale = 1.0
          { sides: 10, name: 'Decagon' },   // xScale = 1.167
          { sides: 12, name: 'Dodecagon' }, // xScale = 1.5
        ];
        const polygonType = polygonTypes[Math.floor(Math.random() * polygonTypes.length)];
        const xScale = (polygonType.sides - 3) / 6.0;

        const location = interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);

        // Update xScale slider
        const xScaleSlider = document.getElementById('x-scale');
        const xScaleValue = document.getElementById('x-scale-value');
        if (xScaleSlider) {
          xScaleSlider.value = xScale;
          updateSliderAccessibility(xScaleSlider, xScaleValue, xScaleAnnounce, xScale, 'X Axis', false);
        }
        params.xScale = xScale;

        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      if (fractalType === 'box-variants') {
        // Box fractal variants - randomly select pattern
        const patterns = [
          { name: 'Vicsek', xScale: 0.1 },
          { name: 'Anti-Vicsek', xScale: 0.3 },
          { name: 'Corners+Center', xScale: 0.5 },
          { name: 'Diagonal', xScale: 0.7 },
          { name: 'Checkerboard', xScale: 0.9 },
          { name: 'Checkerboard-2', xScale: 1.1 },
          { name: 'H-Pattern', xScale: 1.3 },
        ];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const location = interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);

        params.xScale = pattern.xScale;

        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      if (fractalType === 'h-tree-generalized') {
        // Generalized H-tree - randomly select rotation and scale
        const configurations = [
          { rotation: 0.0, scale: 1.0 }, // Classic H-tree
          { rotation: 0.5, scale: 1.0 }, // Small rotation
          { rotation: 1.0, scale: 1.0 }, // 45 degree rotation
          { rotation: 1.5, scale: 1.0 }, // 67.5 degree rotation
          { rotation: 2.0, scale: 1.0 }, // 90 degree rotation (windmill)
          { rotation: 0.5, scale: 0.7 }, // Small rotation, tight scaling
          { rotation: 1.0, scale: 0.7 }, // 45 degrees, tight scaling
          { rotation: 1.0, scale: 1.3 }, // 45 degrees, loose scaling
          { rotation: 0.3, scale: 0.5 }, // Slight rotation, very tight
          { rotation: 1.5, scale: 1.5 }, // Large rotation, loose scaling
        ];
        const config = configurations[Math.floor(Math.random() * configurations.length)];
        const location = interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);

        params.xScale = config.rotation;
        params.yScale = config.scale;

        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      // Handle Julia sets (julia, julia-snakes) - they have cReal and cImag
      if (fractalType === 'julia' || fractalType === 'julia-snakes') {
        // Try up to 10 times to find a valid interesting view
        for (let attempt = 0; attempt < 10; attempt++) {
          const juliaSet = interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
          const zoom = juliaSet.zoom * (0.8 + Math.random() * 0.4);
          const offset = { x: juliaSet.x, y: juliaSet.y };

          // Temporarily set Julia C for validation
          const oldJuliaC = { x: params.juliaC.x, y: params.juliaC.y };
          if (juliaSet.cReal !== undefined && juliaSet.cImag !== undefined) {
            params.juliaC.x = juliaSet.cReal;
            params.juliaC.y = juliaSet.cImag;
          }

          // Validate the view
          if (isValidInterestingView(offset, zoom, fractalType)) {
            // Update Julia C sliders if they exist
            const juliaCReal = document.getElementById('julia-c-real');
            const juliaCImag = document.getElementById('julia-c-imag');
            const juliaCRealValue = document.getElementById('julia-c-real-value');
            const juliaCImagValue = document.getElementById('julia-c-imag-value');
            if (juliaCReal && juliaSet.cReal !== undefined) juliaCReal.value = juliaSet.cReal;
            if (juliaCImag && juliaSet.cImag !== undefined) juliaCImag.value = juliaSet.cImag;
            if (juliaCRealValue && juliaSet.cReal !== undefined) juliaCRealValue.textContent = juliaSet.cReal.toFixed(4);
            if (juliaCImagValue && juliaSet.cImag !== undefined) juliaCImagValue.textContent = juliaSet.cImag.toFixed(4);
            return { offset, zoom };
          }

          // Restore old Julia C if validation failed
          params.juliaC.x = oldJuliaC.x;
          params.juliaC.y = oldJuliaC.y;
        }

        // Fallback to first interesting point
        const fallback = interestingLocations[0];
        if (fallback.cReal !== undefined && fallback.cImag !== undefined) {
          params.juliaC.x = fallback.cReal;
          params.juliaC.y = fallback.cImag;
          const juliaCReal = document.getElementById('julia-c-real');
          const juliaCImag = document.getElementById('julia-c-imag');
          const juliaCRealValue = document.getElementById('julia-c-real-value');
          const juliaCImagValue = document.getElementById('julia-c-imag-value');
          if (juliaCReal) juliaCReal.value = fallback.cReal;
          if (juliaCImag) juliaCImag.value = fallback.cImag;
          if (juliaCRealValue) juliaCRealValue.textContent = fallback.cReal.toFixed(4);
          if (juliaCImagValue) juliaCImagValue.textContent = fallback.cImag.toFixed(4);
        }
        return {
          offset: { x: fallback.x, y: fallback.y },
          zoom: fallback.zoom,
        };
      }

      // For fractals that need validation (mandelbrot, multibrot, burning-ship, buffalo)
      if (fractalType === 'mandelbrot' || fractalType === 'multibrot' ||
          fractalType === 'burning-ship' || fractalType === 'buffalo') {
        interestingLocations = removeDuplicatePoints(interestingLocations, fractalType);

        // Try up to 10 times to find a valid interesting view
        for (let attempt = 0; attempt < 10; attempt++) {
          const location = interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
          const zoomVariation = fractalType === 'multibrot' ? 0.2 : 0.4;
          const zoom = location.zoom * (0.8 + Math.random() * zoomVariation);
          const offset = { x: location.x, y: location.y };

          // Validate the view
          if (isValidInterestingView(offset, zoom, fractalType)) {
            return { offset, zoom };
          }
        }

        // Fallback to config's fallbackPosition or first interesting point
        if (fractalConfig?.fallbackPosition) {
          return {
            offset: fractalConfig.fallbackPosition.offset,
            zoom: fractalConfig.fallbackPosition.zoom,
          };
        }
        const fallback = interestingLocations[0];
        return {
          offset: { x: fallback.x, y: fallback.y },
          zoom: fallback.zoom,
        };
      }

      // Default: randomly select from interesting points
      const location = interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
      const zoom = location.zoom * (0.8 + Math.random() * 0.4);
      return {
        offset: { x: location.x, y: location.y },
        zoom: zoom,
      };
    }

    // Fallback: use old switch statement for fractals without config
    switch (fractalType) {
      case 'mandelbrot': {
        // Interesting Mandelbrot locations (curated list of known interesting areas)
        let interestingLocations = [
          { x: -0.75, y: 0.1, zoom: 50 }, // Seahorse valley
          { x: -0.5, y: 0.5, zoom: 100 }, // Top bulb
          { x: 0.0, y: 0.0, zoom: 1 }, // Center
          { x: -1.25, y: 0.0, zoom: 200 }, // Left side
          { x: -0.1592, y: 1.0317, zoom: 500 }, // Mini mandelbrot
          { x: -0.77568377, y: 0.13646737, zoom: 1000 }, // Deep zoom area
          { x: 0.285, y: 0.01, zoom: 300 }, // Right side detail
          { x: -0.8, y: 0.156, zoom: 800 }, // Elephant valley
          { x: -0.235125, y: 0.827215, zoom: 400 }, // Another interesting area
          { x: 0.286932, y: 0.008287, zoom: 250 }, // Right side detail
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'mandelbrot');

        // Try up to 10 times to find a valid interesting view
        for (let attempt = 0; attempt < 10; attempt++) {
          const location =
            interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
          const zoom = location.zoom * (0.8 + Math.random() * 0.4);
          const offset = { x: location.x, y: location.y };

          // Validate the view
          if (isValidInterestingView(offset, zoom, 'mandelbrot')) {
            return { offset, zoom };
          }
        }

        // Fallback to a known good location if validation fails
        return {
          offset: { x: -0.75, y: 0.1 },
          zoom: 50,
        };
      }

      case 'multibrot': {
        // Multibrot Set - interesting areas with low zoom levels to avoid CPU overload
        let interestingLocations = [
          { x: 0.0, y: 0.0, zoom: 1 }, // Center - full view
          { x: -0.5, y: 0.0, zoom: 2 }, // Left of center
          { x: 0.5, y: 0.0, zoom: 2 }, // Right of center
          { x: 0.0, y: 0.5, zoom: 2 }, // Top of center
          { x: 0.0, y: -0.5, zoom: 2 }, // Bottom of center
          { x: -0.75, y: 0.0, zoom: 3 }, // Left side
          { x: 0.75, y: 0.0, zoom: 3 }, // Right side
          { x: 0.0, y: 0.75, zoom: 3 }, // Top
          { x: -0.4, y: 0.4, zoom: 4 }, // Upper left quadrant
          { x: 0.4, y: 0.4, zoom: 4 }, // Upper right quadrant
          { x: -0.4, y: -0.4, zoom: 4 }, // Lower left quadrant
          { x: 0.4, y: -0.4, zoom: 4 }, // Lower right quadrant
          { x: -0.6, y: 0.2, zoom: 5 }, // Left side detail
          { x: 0.6, y: 0.2, zoom: 5 }, // Right side detail
          { x: -0.2, y: 0.6, zoom: 5 }, // Top detail
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'multibrot');

        // Try up to 10 times to find a valid interesting view
        for (let attempt = 0; attempt < 10; attempt++) {
          const location =
            interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
          const zoom = location.zoom * (0.9 + Math.random() * 0.2); // Smaller zoom variation
          const offset = { x: location.x, y: location.y };

          // Validate the view
          if (isValidInterestingView(offset, zoom, 'multibrot')) {
            return { offset, zoom };
          }
        }

        // Fallback to a known good location if validation fails
        return {
          offset: { x: 0.0, y: 0.0 },
          zoom: 1,
        };
      }

      case 'mutant-mandelbrot': {
        // Mutant Mandelbrot - interesting areas with coordinate transformations
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Center - see overall mutant structure
          { x: 0.5, y: 0.5, zoom: 2 }, // Upper right quadrant
          { x: -0.5, y: -0.5, zoom: 2 }, // Lower left quadrant
          { x: 0.3, y: 0, zoom: 3 }, // Right side detail
          { x: 0, y: 0.3, zoom: 3 }, // Top detail
          { x: -0.3, y: 0, zoom: 3 }, // Left side detail
          { x: 0.2, y: 0.2, zoom: 5 }, // Diagonal detail
          { x: -0.2, y: 0.2, zoom: 5 }, // Upper left detail
          { x: 0.1, y: -0.1, zoom: 4 }, // Lower right detail
          { x: 0, y: 0, zoom: 2 }, // Closer center view
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'mutant-mandelbrot');

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'julia': {
        // Random interesting Julia C values and corresponding views
        let interestingJuliaSets = [
          { cReal: -0.7269, cImag: 0.1889, x: 0, y: 0, zoom: 1.5 },
          { cReal: -0.8, cImag: 0.156, x: 0, y: 0, zoom: 2 },
          { cReal: 0.285, cImag: 0.01, x: 0, y: 0, zoom: 1.5 },
          { cReal: -0.4, cImag: 0.6, x: 0, y: 0, zoom: 2.5 },
          { cReal: 0.3, cImag: 0.5, x: 0, y: 0, zoom: 2 },
          { cReal: -0.123, cImag: 0.745, x: 0, y: 0, zoom: 3 },
          { cReal: 0.355, cImag: 0.355, x: 0, y: 0, zoom: 2.5 },
          { cReal: -0.70176, cImag: -0.3842, x: 0, y: 0, zoom: 2 },
          { cReal: 0.0, cImag: 0.8, x: 0, y: 0, zoom: 2.5 },
        ];
        // Check for duplicates based on x, y, zoom, cReal, and cImag
        const seenJulia = new Set();
        const uniqueJulia = [];
        for (let i = 0; i < interestingJuliaSets.length; i++) {
          const js = interestingJuliaSets[i];
          const key = `${js.x.toFixed(6)},${js.y.toFixed(6)},${js.zoom.toFixed(2)},${js.cReal.toFixed(6)},${js.cImag.toFixed(6)}`;
          if (seenJulia.has(key)) {
            // Duplicate found - generate new random Julia set
            const newPoint = generateRandomInterestingPoint('julia', seenJulia);
            uniqueJulia.push({
              cReal: -1 + Math.random() * 2,
              cImag: -1 + Math.random() * 2,
              x: newPoint.x,
              y: newPoint.y,
              zoom: newPoint.zoom,
            });
            const newKey = `${newPoint.x.toFixed(6)},${newPoint.y.toFixed(6)},${newPoint.zoom.toFixed(2)},${uniqueJulia[uniqueJulia.length - 1].cReal.toFixed(6)},${uniqueJulia[uniqueJulia.length - 1].cImag.toFixed(6)}`;
            seenJulia.add(newKey);
          } else {
            seenJulia.add(key);
            uniqueJulia.push(js);
          }
        }
        interestingJuliaSets = uniqueJulia;

        // Try up to 10 times to find a valid interesting view
        for (let attempt = 0; attempt < 10; attempt++) {
          const juliaSet =
            interestingJuliaSets[Math.floor(Math.random() * interestingJuliaSets.length)];
          const zoom = juliaSet.zoom * (0.8 + Math.random() * 0.4);
          const offset = { x: juliaSet.x, y: juliaSet.y };

          // Temporarily set Julia C for validation
          const oldJuliaC = { x: params.juliaC.x, y: params.juliaC.y };
          params.juliaC.x = juliaSet.cReal;
          params.juliaC.y = juliaSet.cImag;

          // Validate the view
          if (isValidInterestingView(offset, zoom, 'julia')) {
            // Update Julia C sliders if they exist
            const juliaCReal = document.getElementById('julia-c-real');
            const juliaCImag = document.getElementById('julia-c-imag');
            const juliaCRealValue = document.getElementById('julia-c-real-value');
            const juliaCImagValue = document.getElementById('julia-c-imag-value');
            if (juliaCReal) juliaCReal.value = juliaSet.cReal;
            if (juliaCImag) juliaCImag.value = juliaSet.cImag;
            if (juliaCRealValue) juliaCRealValue.textContent = juliaSet.cReal.toFixed(4);
            if (juliaCImagValue) juliaCImagValue.textContent = juliaSet.cImag.toFixed(4);
            return { offset, zoom };
          }

          // Restore old Julia C if validation failed
          params.juliaC.x = oldJuliaC.x;
          params.juliaC.y = oldJuliaC.y;
        }

        // Fallback to a known good Julia set
        const fallback = interestingJuliaSets[0];
        params.juliaC.x = fallback.cReal;
        params.juliaC.y = fallback.cImag;
        const juliaCReal = document.getElementById('julia-c-real');
        const juliaCImag = document.getElementById('julia-c-imag');
        const juliaCRealValue = document.getElementById('julia-c-real-value');
        const juliaCImagValue = document.getElementById('julia-c-imag-value');
        if (juliaCReal) juliaCReal.value = fallback.cReal;
        if (juliaCImag) juliaCImag.value = fallback.cImag;
        if (juliaCRealValue) juliaCRealValue.textContent = fallback.cReal.toFixed(4);
        if (juliaCImagValue) juliaCImagValue.textContent = fallback.cImag.toFixed(4);
        return {
          offset: { x: fallback.x, y: fallback.y },
          zoom: fallback.zoom,
        };
      }

      case 'julia-snakes': {
        // Julia Snakes - C values that create snake-like patterns
        let interestingSnakeSets = [
          { cReal: -0.4, cImag: 0.6, x: 0, y: 0, zoom: 1.5 },
          { cReal: -0.162, cImag: 1.04, x: 0, y: 0, zoom: 2 },
          { cReal: -0.54, cImag: 0.54, x: 0, y: 0, zoom: 1.8 },
          { cReal: 0.285, cImag: 0.01, x: 0, y: 0, zoom: 2 },
          { cReal: -0.7, cImag: 0.3, x: 0, y: 0, zoom: 1.5 },
          { cReal: -0.39, cImag: 0.587, x: 0.2, y: 0.2, zoom: 3 },
          { cReal: -0.194, cImag: 0.6557, x: 0, y: 0, zoom: 2.5 },
          { cReal: -0.8, cImag: 0.156, x: 0, y: 0, zoom: 2 },
          { cReal: -0.355, cImag: 0.355, x: 0.1, y: 0.1, zoom: 2.5 },
          { cReal: -0.45, cImag: 0.6, x: 0, y: 0, zoom: 1.8 },
        ];
        // Check for duplicates based on x, y, zoom, cReal, and cImag
        const seenSnakes = new Set();
        const uniqueSnakes = [];
        for (let i = 0; i < interestingSnakeSets.length; i++) {
          const ss = interestingSnakeSets[i];
          const key = `${ss.x.toFixed(6)},${ss.y.toFixed(6)},${ss.zoom.toFixed(2)},${ss.cReal.toFixed(6)},${ss.cImag.toFixed(6)}`;
          if (seenSnakes.has(key)) {
            // Duplicate found - generate new random snake set
            const newPoint = generateRandomInterestingPoint('julia-snakes', seenSnakes);
            uniqueSnakes.push({
              cReal: -1 + Math.random() * 2,
              cImag: -1 + Math.random() * 2,
              x: newPoint.x,
              y: newPoint.y,
              zoom: newPoint.zoom,
            });
            const newKey = `${newPoint.x.toFixed(6)},${newPoint.y.toFixed(6)},${newPoint.zoom.toFixed(2)},${uniqueSnakes[uniqueSnakes.length - 1].cReal.toFixed(6)},${uniqueSnakes[uniqueSnakes.length - 1].cImag.toFixed(6)}`;
            seenSnakes.add(newKey);
          } else {
            seenSnakes.add(key);
            uniqueSnakes.push(ss);
          }
        }
        interestingSnakeSets = uniqueSnakes;

        const snakeSet =
          interestingSnakeSets[Math.floor(Math.random() * interestingSnakeSets.length)];
        const zoom = snakeSet.zoom * (0.8 + Math.random() * 0.4);
        const offset = { x: snakeSet.x, y: snakeSet.y };

        // Set Julia C values
        params.juliaC.x = snakeSet.cReal;
        params.juliaC.y = snakeSet.cImag;

        // Update Julia C sliders
        const juliaCReal = document.getElementById('julia-c-real');
        const juliaCImag = document.getElementById('julia-c-imag');
        const juliaCRealValue = document.getElementById('julia-c-real-value');
        const juliaCImagValue = document.getElementById('julia-c-imag-value');
        if (juliaCReal) juliaCReal.value = snakeSet.cReal;
        if (juliaCImag) juliaCImag.value = snakeSet.cImag;
        if (juliaCRealValue) juliaCRealValue.textContent = snakeSet.cReal.toFixed(4);
        if (juliaCImagValue) juliaCImagValue.textContent = snakeSet.cImag.toFixed(4);

        return { offset, zoom };
      }

      case 'burning-ship': {
        // Interesting Burning Ship locations (curated list of known interesting areas)
        let interestingLocations = [
          { x: -0.5, y: -0.6, zoom: 1.2 }, // Main ship view
          { x: -1.75, y: -0.03, zoom: 100 }, // Bow detail
          { x: -1.62, y: 0.0, zoom: 250 }, // Right antenna
          { x: -1.755, y: -0.028, zoom: 500 }, // Deep bow zoom
          { x: -1.7, y: 0.0, zoom: 80 }, // Side structures
          { x: -0.4, y: -0.6, zoom: 150 }, // Hull detail
          { x: -1.8, y: -0.0085, zoom: 300 }, // Fine bow structures
          { x: -1.65, y: 0.0, zoom: 50 }, // Middle antenna
          { x: -0.9, y: -0.3, zoom: 200 }, // Central structures
          { x: -1.72, y: -0.025, zoom: 400 }, // Intricate bow patterns
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'burning-ship');

        for (let attempt = 0; attempt < 10; attempt++) {
          const location =
            interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
          const zoom = location.zoom * (0.8 + Math.random() * 0.4);
          const offset = { x: location.x, y: location.y };

          if (isValidInterestingView(offset, zoom, 'burning-ship')) {
            return { offset, zoom };
          }
        }

        return {
          offset: { x: -0.5, y: -0.6 },
          zoom: 1.2,
        };
      }

      case 'buffalo': {
        // Buffalo is the vertical mirror of Burning Ship, so use flipped y coordinates
        let interestingLocations = [
          { x: -0.5, y: 0.6, zoom: 1.2 }, // Main buffalo view (flipped ship)
          { x: -1.75, y: 0.03, zoom: 100 }, // Bow detail (flipped)
          { x: -1.62, y: 0.0, zoom: 250 }, // Right antenna
          { x: -1.755, y: 0.028, zoom: 500 }, // Deep bow zoom (flipped)
          { x: -1.7, y: 0.0, zoom: 80 }, // Side structures
          { x: -0.4, y: 0.6, zoom: 150 }, // Hull detail (flipped)
          { x: -1.8, y: 0.0085, zoom: 300 }, // Fine bow structures (flipped)
          { x: -1.65, y: 0.0, zoom: 50 }, // Middle antenna
          { x: -0.9, y: 0.3, zoom: 200 }, // Central structures (flipped)
          { x: -1.72, y: 0.025, zoom: 400 }, // Intricate bow patterns (flipped)
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'buffalo');

        for (let attempt = 0; attempt < 10; attempt++) {
          const location =
            interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
          const zoom = location.zoom * (0.8 + Math.random() * 0.4);
          const offset = { x: location.x, y: location.y };

          if (isValidInterestingView(offset, zoom, 'buffalo')) {
            return { offset, zoom };
          }
        }

        return {
          offset: { x: -0.5, y: 0.6 },
          zoom: 1.2,
        };
      }

      case 'sierpinski': {
        // Sierpinski triangle is centered, so random offsets around center
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 0.5;
        return {
          offset: {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
          },
          zoom: 1 + Math.random() * 3, // Zoom between 1x and 4x
        };
      }

      case 'sierpinski-arrowhead': {
        // Sierpinski arrowhead curve - interesting views of the curve
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full overview
          { x: 0, y: -0.2, zoom: 2 }, // Bottom detail
          { x: -0.2, y: 0.1, zoom: 3 }, // Left side curve
          { x: 0.2, y: 0.1, zoom: 3 }, // Right side curve
          { x: 0, y: 0.2, zoom: 4 }, // Top detail
          { x: -0.3, y: -0.1, zoom: 5 }, // Lower left spiral
          { x: 0.3, y: -0.1, zoom: 5 }, // Lower right spiral
          { x: 0, y: 0, zoom: 2.5 }, // Closer center view
          { x: -0.15, y: 0, zoom: 6 }, // Left detail zoom
          { x: 0.15, y: 0, zoom: 6 }, // Right detail zoom
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'sierpinski-arrowhead');

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'sierpinski-carpet': {
        // Sierpinski carpet - zoom into edge details and corners
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full overview
          { x: 0.33, y: 0.33, zoom: 3 }, // Upper right quadrant
          { x: -0.33, y: 0.33, zoom: 3 }, // Upper left quadrant
          { x: 0.33, y: -0.33, zoom: 3 }, // Lower right quadrant
          { x: -0.33, y: -0.33, zoom: 3 }, // Lower left quadrant
          { x: 0, y: 0, zoom: 4 }, // Center zoom
          { x: 0.22, y: 0.22, zoom: 9 }, // Deep zoom upper right
          { x: -0.22, y: -0.22, zoom: 9 }, // Deep zoom lower left
          { x: 0.11, y: 0.33, zoom: 12 }, // Edge detail
          { x: -0.15, y: 0.15, zoom: 15 }, // Very deep zoom
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'sierpinski-carpet');

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'sierpinski-pentagon': {
        // Sierpinski pentagon - zoom into vertices and edge details
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full overview
          { x: 0, y: 0.4, zoom: 2.5 }, // Top vertex region
          { x: 0.38, y: 0.12, zoom: 3 }, // Upper right vertex
          { x: 0.24, y: -0.32, zoom: 3 }, // Lower right vertex
          { x: -0.24, y: -0.32, zoom: 3 }, // Lower left vertex
          { x: -0.38, y: 0.12, zoom: 3 }, // Upper left vertex
          { x: 0, y: 0, zoom: 3.5 }, // Center detail
          { x: 0.3, y: 0.2, zoom: 6 }, // Deep zoom upper right
          { x: -0.3, y: 0.2, zoom: 6 }, // Deep zoom upper left
          { x: 0, y: -0.3, zoom: 8 }, // Deep zoom bottom
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'sierpinski-pentagon');

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'sierpinski-hexagon': {
        // Sierpinski hexagon - zoom into vertices and edge details
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full overview
          { x: 0, y: 0.42, zoom: 2.5 }, // Top vertex region
          { x: 0.36, y: 0.21, zoom: 3 }, // Upper right vertex
          { x: 0.36, y: -0.21, zoom: 3 }, // Lower right vertex
          { x: 0, y: -0.42, zoom: 3 }, // Bottom vertex
          { x: -0.36, y: -0.21, zoom: 3 }, // Lower left vertex
          { x: -0.36, y: 0.21, zoom: 3 }, // Upper left vertex
          { x: 0, y: 0, zoom: 3.5 }, // Center detail
          { x: 0.3, y: 0.15, zoom: 6 }, // Deep zoom upper right
          { x: -0.3, y: 0.15, zoom: 6 }, // Deep zoom upper left
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'sierpinski-hexagon');

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'sierpinski-gasket': {
        // Generalised Sierpinski Gasket - different polygon types
        // xScale controls number of sides (3-12)
        const polygonTypes = [
          { sides: 3, name: 'Triangle' },   // xScale = 0.0
          { sides: 4, name: 'Square' },     // xScale = 0.167
          { sides: 5, name: 'Pentagon' },   // xScale = 0.333
          { sides: 6, name: 'Hexagon' },    // xScale = 0.5
          { sides: 7, name: 'Heptagon' },   // xScale = 0.667
          { sides: 8, name: 'Octagon' },    // xScale = 0.833
          { sides: 9, name: 'Nonagon' },    // xScale = 1.0
          { sides: 10, name: 'Decagon' },   // xScale = 1.167
          { sides: 12, name: 'Dodecagon' }, // xScale = 1.5
        ];

        const polygonType = polygonTypes[Math.floor(Math.random() * polygonTypes.length)];
        // Convert sides to xScale: xScale = (sides - 3) / 6
        const xScale = (polygonType.sides - 3) / 6.0;

        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full overview
          { x: 0, y: 0.4, zoom: 2.5 }, // Top region
          { x: 0.35, y: 0.2, zoom: 3 }, // Upper right
          { x: 0.35, y: -0.2, zoom: 3 }, // Lower right
          { x: 0, y: -0.4, zoom: 3 }, // Bottom
          { x: -0.35, y: -0.2, zoom: 3 }, // Lower left
          { x: -0.35, y: 0.2, zoom: 3 }, // Upper left
          { x: 0, y: 0, zoom: 3.5 }, // Center detail
          { x: 0.25, y: 0.15, zoom: 6 }, // Deep zoom
          { x: -0.25, y: 0.15, zoom: 6 }, // Deep zoom left
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'sierpinski-gasket');

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);

        // Update xScale slider
        const xScaleSlider = document.getElementById('x-scale');
        const xScaleValue = document.getElementById('x-scale-value');
        if (xScaleSlider) {
          xScaleSlider.value = xScale;
          updateSliderAccessibility(xScaleSlider, xScaleValue, xScaleAnnounce, xScale, 'X Axis', false);
        }
        params.xScale = xScale;

        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'koch': {
        // Koch snowflake - zoom into interesting edge details
        let interestingLocations = [
          { x: 0, y: 0.5, zoom: 4 }, // Top peak
          { x: -0.4, y: -0.25, zoom: 5 }, // Bottom left edge
          { x: 0.4, y: -0.25, zoom: 5 }, // Bottom right edge
          { x: 0, y: 0.35, zoom: 8 }, // Upper tip detail
          { x: -0.3, y: -0.15, zoom: 10 }, // Left side detail
          { x: 0.3, y: -0.15, zoom: 10 }, // Right side detail
          { x: 0, y: 0, zoom: 2 }, // Center overview
          { x: -0.2, y: 0.3, zoom: 12 }, // Upper left detail
          { x: 0.2, y: 0.3, zoom: 12 }, // Upper right detail
          { x: 0, y: -0.2, zoom: 15 }, // Bottom center detail
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'koch');

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'quadratic-koch': {
        // Quadratic Koch island - zoom into interesting square wave patterns
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full overview
          { x: 0, y: 0.5, zoom: 3 }, // Top edge
          { x: 0.5, y: 0, zoom: 3 }, // Right edge
          { x: 0, y: -0.5, zoom: 3 }, // Bottom edge
          { x: -0.5, y: 0, zoom: 3 }, // Left edge
          { x: 0.35, y: 0.35, zoom: 5 }, // Top-right corner
          { x: -0.35, y: 0.35, zoom: 5 }, // Top-left corner
          { x: 0.35, y: -0.35, zoom: 5 }, // Bottom-right corner
          { x: -0.35, y: -0.35, zoom: 5 }, // Bottom-left corner
          { x: 0, y: 0, zoom: 2 }, // Medium zoom center
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'quadratic-koch');

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'minkowski-sausage': {
        // Minkowski sausage - zoom into rectangular protrusions
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full overview
          { x: 0, y: 0.5, zoom: 3 }, // Top edge bulge
          { x: 0.5, y: 0, zoom: 3 }, // Right edge bulge
          { x: 0, y: -0.5, zoom: 3 }, // Bottom edge bulge
          { x: -0.5, y: 0, zoom: 3 }, // Left edge bulge
          { x: 0.4, y: 0.4, zoom: 5 }, // Top-right corner detail
          { x: -0.4, y: 0.4, zoom: 5 }, // Top-left corner detail
          { x: 0.4, y: -0.4, zoom: 5 }, // Bottom-right corner detail
          { x: -0.4, y: -0.4, zoom: 5 }, // Bottom-left corner detail
          { x: 0, y: 0, zoom: 2.5 }, // Medium zoom center
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'minkowski-sausage');

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'cesaro': {
        // Cesàro fractal - zoom into zigzag patterns
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full overview
          { x: 0, y: 0.5, zoom: 3 }, // Top edge detail
          { x: 0.5, y: 0, zoom: 3 }, // Right edge detail
          { x: 0, y: -0.5, zoom: 3 }, // Bottom edge detail
          { x: -0.5, y: 0, zoom: 3 }, // Left edge detail
          { x: 0.35, y: 0.35, zoom: 5 }, // Top-right corner zigzag
          { x: -0.35, y: 0.35, zoom: 5 }, // Top-left corner zigzag
          { x: 0.35, y: -0.35, zoom: 5 }, // Bottom-right corner zigzag
          { x: -0.35, y: -0.35, zoom: 5 }, // Bottom-left corner zigzag
          { x: 0, y: 0, zoom: 2 }, // Medium zoom center
        ];

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'vicsek': {
        // Vicsek snowflake - zoom into cross patterns
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full overview showing cross
          { x: 0, y: 0, zoom: 3 }, // Center cross detail
          { x: 0.33, y: 0, zoom: 4 }, // Right arm
          { x: -0.33, y: 0, zoom: 4 }, // Left arm
          { x: 0, y: 0.33, zoom: 4 }, // Top arm
          { x: 0, y: -0.33, zoom: 4 }, // Bottom arm
          { x: 0.22, y: 0.22, zoom: 6 }, // Edge of center where cross meets
          { x: -0.22, y: 0.22, zoom: 6 }, // Edge of center
          { x: 0.11, y: 0.11, zoom: 9 }, // Deep zoom into self-similarity
          { x: 0, y: 0, zoom: 2 }, // Medium zoom center
        ];

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'cross': {
        // Cross fractal (T-square) - zoom into removed quadrants
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full overview
          { x: 0.25, y: 0.25, zoom: 2 }, // Top-right missing corner
          { x: 0.5, y: 0.5, zoom: 3 }, // Deep into top-right region
          { x: 0.375, y: 0.375, zoom: 4 }, // Edge of removed region
          { x: -0.25, y: -0.25, zoom: 3 }, // Bottom-left quadrant
          { x: 0.25, y: -0.25, zoom: 3 }, // Bottom-right quadrant
          { x: -0.25, y: 0.25, zoom: 3 }, // Top-left quadrant
          { x: 0.5, y: 0.25, zoom: 5 }, // Right edge detail
          { x: 0.25, y: 0.5, zoom: 5 }, // Top edge detail
          { x: 0, y: 0, zoom: 2.5 }, // Medium zoom center
        ];

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'box-variants': {
        // Box fractal variants - different patterns with xScale
        const patterns = [
          { name: 'Vicsek', xScale: 0.1 },
          { name: 'Anti-Vicsek', xScale: 0.3 },
          { name: 'Corners+Center', xScale: 0.5 },
          { name: 'Diagonal', xScale: 0.7 },
          { name: 'Checkerboard', xScale: 0.9 },
          { name: 'Checkerboard-2', xScale: 1.1 },
          { name: 'H-Pattern', xScale: 1.3 },
        ];

        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full overview
          { x: 0, y: 0, zoom: 3 }, // Center detail
          { x: 0.33, y: 0, zoom: 4 }, // Right side
          { x: -0.33, y: 0, zoom: 4 }, // Left side
          { x: 0, y: 0.33, zoom: 4 }, // Top side
          { x: 0, y: -0.33, zoom: 4 }, // Bottom side
          { x: 0.25, y: 0.25, zoom: 6 }, // Corner region
          { x: -0.25, y: 0.25, zoom: 6 }, // Another corner
          { x: 0.15, y: 0.15, zoom: 9 }, // Deep zoom
          { x: 0, y: 0, zoom: 2 }, // Medium zoom
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'box-variants');

        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);

        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
          params: { xScale: pattern.xScale },
        };
      }

      case 'h-tree': {
        // H-tree fractal - zoom into branch points
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full overview
          { x: 0, y: 0, zoom: 2 }, // Center H
          { x: -0.2, y: 0.2, zoom: 3 }, // Top-left branch
          { x: 0.2, y: 0.2, zoom: 3 }, // Top-right branch
          { x: -0.2, y: -0.2, zoom: 3 }, // Bottom-left branch
          { x: 0.2, y: -0.2, zoom: 3 }, // Bottom-right branch
          { x: -0.3, y: 0.3, zoom: 5 }, // Deep into top-left
          { x: 0.3, y: 0.3, zoom: 5 }, // Deep into top-right
          { x: -0.15, y: 0.15, zoom: 7 }, // Very deep zoom
          { x: 0, y: 0, zoom: 1.5 }, // Medium zoom center
        ];

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'h-tree-generalized': {
        // Generalized H-tree with rotation and scaling
        // Use xScale for rotation (0-2), yScale for scaling (0.5-1.5)
        const configurations = [
          { rotation: 0.0, scale: 1.0 }, // Classic H-tree
          { rotation: 0.5, scale: 1.0 }, // Small rotation
          { rotation: 1.0, scale: 1.0 }, // 45 degree rotation
          { rotation: 1.5, scale: 1.0 }, // 67.5 degree rotation
          { rotation: 2.0, scale: 1.0 }, // 90 degree rotation (windmill)
          { rotation: 0.5, scale: 0.7 }, // Small rotation, tight scaling
          { rotation: 1.0, scale: 0.7 }, // 45 degrees, tight scaling
          { rotation: 1.0, scale: 1.3 }, // 45 degrees, loose scaling
          { rotation: 0.3, scale: 0.5 }, // Slight rotation, very tight
          { rotation: 1.5, scale: 1.5 }, // Large rotation, loose scaling
        ];

        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full overview
          { x: 0, y: 0, zoom: 2 }, // Center detail
          { x: -0.2, y: 0.2, zoom: 3 }, // Top-left branch
          { x: 0.2, y: 0.2, zoom: 3 }, // Top-right branch
          { x: -0.2, y: -0.2, zoom: 3 }, // Bottom-left branch
          { x: 0.2, y: -0.2, zoom: 3 }, // Bottom-right branch
          { x: -0.3, y: 0.3, zoom: 5 }, // Deep into top-left
          { x: 0.3, y: 0.3, zoom: 5 }, // Deep into top-right
          { x: -0.15, y: 0.15, zoom: 7 }, // Very deep zoom
          { x: 0, y: 0, zoom: 1.5 }, // Medium zoom center
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'h-tree-generalized');

        const config = configurations[Math.floor(Math.random() * configurations.length)];
        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);

        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
          params: { xScale: config.rotation, yScale: config.scale },
        };
      }

      case 'heighway-dragon': {
        // Heighway dragon curve - zoom into dragon's body
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full dragon view
          { x: 0, y: 0, zoom: 2 }, // Center detail
          { x: 0.2, y: 0, zoom: 3 }, // Right side of dragon
          { x: -0.2, y: 0, zoom: 3 }, // Left side of dragon
          { x: 0.1, y: 0.1, zoom: 4 }, // Upper right quadrant
          { x: -0.1, y: 0.1, zoom: 4 }, // Upper left quadrant
          { x: 0.1, y: -0.1, zoom: 4 }, // Lower right quadrant
          { x: -0.1, y: -0.1, zoom: 4 }, // Lower left quadrant
          { x: 0.15, y: 0.05, zoom: 6 }, // Deep zoom right
          { x: 0, y: 0, zoom: 1.5 }, // Medium zoom center
        ];

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'twindragon': {
        // Twindragon curve - zoom into the tiled dragon pattern
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full twindragon view
          { x: 0, y: 0, zoom: 2 }, // Center detail
          { x: 0.25, y: 0, zoom: 3 }, // Right dragon
          { x: -0.25, y: 0, zoom: 3 }, // Left side
          { x: 0.15, y: 0.15, zoom: 4 }, // Upper right quadrant
          { x: -0.15, y: 0.15, zoom: 4 }, // Upper left quadrant
          { x: 0.15, y: -0.15, zoom: 4 }, // Lower right quadrant
          { x: -0.15, y: -0.15, zoom: 4 }, // Lower left quadrant
          { x: 0.2, y: 0.1, zoom: 6 }, // Deep zoom
          { x: 0, y: 0, zoom: 1.5 }, // Medium zoom center
        ];

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'terdragon': {
        // Terdragon curve - zoom into the three-dragon tiled pattern
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full terdragon view
          { x: 0, y: 0, zoom: 2 }, // Center detail
          { x: 0.2, y: 0.1, zoom: 3 }, // First dragon region
          { x: -0.15, y: 0.2, zoom: 3 }, // Second dragon region
          { x: 0.1, y: -0.2, zoom: 3 }, // Third dragon region
          { x: 0.15, y: 0.15, zoom: 4 }, // Upper right detail
          { x: -0.15, y: 0.15, zoom: 4 }, // Upper left detail
          { x: 0.15, y: -0.15, zoom: 4 }, // Lower right detail
          { x: 0.2, y: 0.1, zoom: 6 }, // Deep zoom
          { x: 0, y: 0, zoom: 1.5 }, // Medium zoom center
        ];

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'binary-dragon': {
        // Binary Dragon curve - zoom into the binary pattern
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full binary dragon view
          { x: 0, y: 0, zoom: 2 }, // Center detail
          { x: 0.2, y: 0.1, zoom: 3 }, // Right region
          { x: -0.2, y: 0.1, zoom: 3 }, // Left region
          { x: 0.1, y: -0.2, zoom: 3 }, // Lower region
          { x: 0.15, y: 0.15, zoom: 4 }, // Upper right detail
          { x: -0.15, y: 0.15, zoom: 4 }, // Upper left detail
          { x: 0.15, y: -0.15, zoom: 4 }, // Lower right detail
          { x: 0.2, y: 0.1, zoom: 6 }, // Deep zoom
          { x: 0, y: 0, zoom: 1.5 }, // Medium zoom center
        ];

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'folded-paper-dragon': {
        // Folded Paper Dragon curve - zoom into the paper-folding pattern
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full folded paper dragon view
          { x: 0, y: 0, zoom: 2 }, // Center detail
          { x: 0.2, y: 0.1, zoom: 3 }, // Right region
          { x: -0.2, y: 0.1, zoom: 3 }, // Left region
          { x: 0.1, y: -0.2, zoom: 3 }, // Lower region
          { x: 0.15, y: 0.15, zoom: 4 }, // Upper right detail
          { x: -0.15, y: 0.15, zoom: 4 }, // Upper left detail
          { x: 0.15, y: -0.15, zoom: 4 }, // Lower right detail
          { x: 0.2, y: 0.1, zoom: 6 }, // Deep zoom
          { x: 0, y: 0, zoom: 1.5 }, // Medium zoom center
        ];

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'peano-curve': {
        // Peano Curve - zoom into the space-filling pattern
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full Peano curve view
          { x: 0, y: 0, zoom: 2 }, // Center detail
          { x: 0.2, y: 0.2, zoom: 3 }, // Upper right quadrant
          { x: -0.2, y: 0.2, zoom: 3 }, // Upper left quadrant
          { x: 0.2, y: -0.2, zoom: 3 }, // Lower right quadrant
          { x: -0.2, y: -0.2, zoom: 3 }, // Lower left quadrant
          { x: 0.15, y: 0.15, zoom: 4 }, // Deep zoom upper right
          { x: -0.15, y: 0.15, zoom: 4 }, // Deep zoom upper left
          { x: 0.15, y: -0.15, zoom: 4 }, // Deep zoom lower right
          { x: 0, y: 0, zoom: 1.5 }, // Medium zoom center
        ];

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'hilbert-curve': {
        // Hilbert Curve - zoom into the space-filling pattern
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Full Hilbert curve view
          { x: 0, y: 0, zoom: 2 }, // Center detail
          { x: 0.2, y: 0.2, zoom: 3 }, // Upper right quadrant
          { x: -0.2, y: 0.2, zoom: 3 }, // Upper left quadrant
          { x: 0.2, y: -0.2, zoom: 3 }, // Lower right quadrant
          { x: -0.2, y: -0.2, zoom: 3 }, // Lower left quadrant
          { x: 0.15, y: 0.15, zoom: 4 }, // Deep zoom upper right
          { x: -0.15, y: 0.15, zoom: 4 }, // Deep zoom upper left
          { x: 0.15, y: -0.15, zoom: 4 }, // Deep zoom lower right
          { x: 0, y: 0, zoom: 1.5 }, // Medium zoom center
        ];

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'popcorn': {
        // Popcorn fractal - interesting chaotic regions
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Center view
          { x: 0.5, y: 0.5, zoom: 2 }, // Upper right quadrant
          { x: -0.5, y: -0.5, zoom: 2 }, // Lower left quadrant
          { x: 0.3, y: -0.3, zoom: 3 }, // Mixed region
          { x: -0.4, y: 0.4, zoom: 3 }, // Another mixed region
          { x: 0.7, y: 0.2, zoom: 4 }, // Edge patterns
          { x: -0.2, y: 0.7, zoom: 4 }, // More edge patterns
          { x: 0.1, y: 0.1, zoom: 5 }, // Detailed center
          { x: -0.6, y: 0.1, zoom: 4 }, // Left region detail
          { x: 0.4, y: -0.6, zoom: 4 }, // Bottom right detail
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'popcorn');

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'rose': {
        // Rose window fractal - symmetric petal patterns
        let interestingLocations = [
          { x: 0, y: 0, zoom: 1 }, // Center view - full rose
          { x: 0, y: 0, zoom: 2 }, // Closer center view
          { x: 0.3, y: 0, zoom: 3 }, // Right petal detail
          { x: -0.3, y: 0, zoom: 3 }, // Left petal detail
          { x: 0, y: 0.3, zoom: 3 }, // Top petal detail
          { x: 0, y: -0.3, zoom: 3 }, // Bottom petal detail
          { x: 0.2, y: 0.2, zoom: 4 }, // Diagonal petal detail
          { x: -0.2, y: 0.2, zoom: 4 }, // Upper left detail
          { x: 0.2, y: -0.2, zoom: 4 }, // Lower right detail
          { x: 0, y: 0, zoom: 5 }, // Deep center zoom
        ];
        interestingLocations = removeDuplicatePoints(interestingLocations, 'rose');

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'cantor': {
        // Cantor set - best viewed with specific zoom levels to see the structure
        let interestingLocations = [
          { x: 0, y: 0.5, zoom: 1 }, // Full overview
          { x: 0, y: 0.3, zoom: 1.5 }, // Upper levels detail
          { x: 0, y: 0, zoom: 2 }, // Mid-level focus
          { x: 0.5, y: 0.5, zoom: 2 }, // Right side upper levels
          { x: -0.5, y: 0.5, zoom: 2 }, // Left side upper levels
          { x: 0.3, y: 0, zoom: 3 }, // Right side detail
          { x: -0.3, y: 0, zoom: 3 }, // Left side detail
          { x: 0, y: -0.3, zoom: 2 }, // Lower levels
          { x: 0, y: 0.7, zoom: 1.2 }, // Top view
          { x: 0, y: 0, zoom: 1 }, // Centered full view
        ];

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.9 + Math.random() * 0.2);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'fat-cantor': {
        // Fat Cantor set - similar views to regular Cantor but showing fatter segments
        let interestingLocations = [
          { x: 0, y: 0.5, zoom: 1 }, // Full overview
          { x: 0, y: 0.3, zoom: 1.5 }, // Upper levels detail
          { x: 0, y: 0, zoom: 2 }, // Mid-level focus
          { x: 0.5, y: 0.5, zoom: 2 }, // Right side upper levels
          { x: -0.5, y: 0.5, zoom: 2 }, // Left side upper levels
          { x: 0.3, y: 0, zoom: 3 }, // Right side detail
          { x: -0.3, y: 0, zoom: 3 }, // Left side detail
          { x: 0, y: -0.3, zoom: 2 }, // Lower levels
          { x: 0, y: 0.7, zoom: 1.2 }, // Top view
          { x: 0, y: 0, zoom: 1 }, // Centered full view
        ];

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.9 + Math.random() * 0.2);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'smith-volterra-cantor': {
        // Smith-Volterra-Cantor set - measure 1/2 set with decreasing removed intervals
        let interestingLocations = [
          { x: 0, y: 0.5, zoom: 1 }, // Full overview
          { x: 0, y: 0.3, zoom: 1.5 }, // Upper levels detail
          { x: 0, y: 0, zoom: 2 }, // Mid-level focus
          { x: 0.5, y: 0.5, zoom: 2 }, // Right side upper levels
          { x: -0.5, y: 0.5, zoom: 2 }, // Left side upper levels
          { x: 0.3, y: 0, zoom: 3 }, // Right side detail
          { x: -0.3, y: 0, zoom: 3 }, // Left side detail
          { x: 0, y: -0.3, zoom: 2 }, // Lower levels
          { x: 0, y: 0.7, zoom: 1.2 }, // Top view
          { x: 0, y: 0, zoom: 1 }, // Centered full view
        ];

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.9 + Math.random() * 0.2);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      case 'random-cantor': {
        // Randomised Cantor set - uses random removal ratios for organic patterns
        let interestingLocations = [
          { x: 0, y: 0.5, zoom: 1 }, // Full overview
          { x: 0, y: 0.3, zoom: 1.5 }, // Upper levels detail
          { x: 0, y: 0, zoom: 2 }, // Mid-level focus
          { x: 0.5, y: 0.5, zoom: 2 }, // Right side upper levels
          { x: -0.5, y: 0.5, zoom: 2 }, // Left side upper levels
          { x: 0.3, y: 0, zoom: 3 }, // Right side detail
          { x: -0.3, y: 0, zoom: 3 }, // Left side detail
          { x: 0, y: -0.3, zoom: 2 }, // Lower levels
          { x: 0, y: 0.7, zoom: 1.2 }, // Top view
          { x: 0, y: 0, zoom: 1 }, // Centered full view
        ];

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.9 + Math.random() * 0.2);
        return {
          offset: { x: location.x, y: location.y },
          zoom: zoom,
        };
      }

      default:
        // Default: random offset and zoom
        return {
          offset: {
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2,
          },
          zoom: 1 + Math.random() * 5,
        };
    }
  }

  // Track current interesting point index
  let currentInterestingPointIndex = 1;
  const fullscreenRandomNumberEl = document.getElementById('fullscreen-random-number');

  // Random view button
  fullscreenRandomBtn.addEventListener('click', () => {
    // Get random interesting view
    const randomView = getRandomInterestingView();

    // Update parameters
    params.offset.x = randomView.offset.x;
    params.offset.y = randomView.offset.y;
    params.zoom = randomView.zoom;

    // Increment and update the interesting point number
    currentInterestingPointIndex++;
    if (fullscreenRandomNumberEl) {
      fullscreenRandomNumberEl.textContent = currentInterestingPointIndex;
    }

    // Clear frame cache since we're changing to a new view
    frameCache.clear();

    // Clear cached display if we're showing one
    if (isDisplayingCached) {
      isDisplayingCached = false;
      cachedDrawCommand = null;
    }

    // Cancel any ongoing progressive rendering
    if (progressiveRenderAnimationFrame !== null) {
      cancelAnimationFrame(progressiveRenderAnimationFrame);
      progressiveRenderAnimationFrame = null;
      isProgressiveRendering = false;
    }

    // Render the new random view with progressive rendering for better UX
    renderFractalProgressive();
  });

  // Iterations controls - cache DOM references
  const fullscreenIterationsUpBtn = document.getElementById('fullscreen-iterations-up');
  const fullscreenIterationsDownBtn = document.getElementById('fullscreen-iterations-down');
  const fullscreenIterationsNumberEl = document.getElementById('fullscreen-iterations-number');
  const iterationsSliderEl = document.getElementById('iterations');
  const iterationsValueEl = document.getElementById('iterations-value');

  // Shared function to update iterations (avoids code duplication)
  const updateIterations = (delta) => {
    // Update iterations with delta, clamped to valid range
    params.iterations = Math.max(10, Math.min(400, params.iterations + delta));

    // Update UI sliders
    if (iterationsSliderEl) {
      iterationsSliderEl.value = params.iterations;
    }
    if (iterationsValueEl) {
      iterationsValueEl.textContent = params.iterations;
    }
    // Update fullscreen iterations number
    if (fullscreenIterationsNumberEl) {
      fullscreenIterationsNumberEl.textContent = params.iterations;
    }

    // Clear cached display since iterations changed
    if (isDisplayingCached) {
      isDisplayingCached = false;
      cachedDrawCommand = null;
    }

    // Recreate draw command with updated iterations
    drawFractal = null;
    // Re-render with updated iterations
    renderFractalProgressive();
  };

  fullscreenIterationsUpBtn.addEventListener('click', () => updateIterations(5));
  fullscreenIterationsDownBtn.addEventListener('click', () => updateIterations(-5));

  fullscreenColorCycleBtn.addEventListener('click', async () => {
    // Cycle to next color scheme
    currentColorSchemeIndex = (currentColorSchemeIndex + 1) % colorSchemes.length;
    params.colorScheme = colorSchemes[currentColorSchemeIndex];

    // Update the color scheme select in the main UI
    if (colorSchemeSelect) {
      colorSchemeSelect.value = params.colorScheme;
    }

    // Update the palette preview
    updateColorPalettePreview();

    // Clear cached display if we're showing one (since color scheme changed)
    if (isDisplayingCached) {
      isDisplayingCached = false;
      cachedDrawCommand = null;
    }

    // Recreate draw command with updated color scheme
    drawFractal = null;
    // Re-render with updated color scheme
    renderFractalProgressive();
  });

  // Screenshot functionality for fullscreen (reuse shared function)
  fullscreenScreenshotBtn.addEventListener('click', captureScreenshot);

  // Update button text and renderer size based on fullscreen state
  const updateFullscreenButton = () => {
    if (isFullscreen()) {
      fullscreenBtn.textContent = 'Exit Fullscreen';
      // Show fullscreen controls
      if (fullscreenControls) {
        fullscreenControls.classList.add('visible');
      }
      // Add fullscreen class to body
      document.body.classList.add('is-fullscreen');
      // Reset interesting point counter when entering fullscreen
      currentInterestingPointIndex = 1;
      if (fullscreenRandomNumberEl) {
        fullscreenRandomNumberEl.textContent = '1';
      }
      // Update color palette preview when entering fullscreen
      updateColorPalettePreview();
      // Update iterations number when entering fullscreen
      if (fullscreenIterationsNumberEl) {
        fullscreenIterationsNumberEl.textContent = params.iterations;
      }
    } else {
      fullscreenBtn.textContent = 'View in Fullscreen';
      // Hide fullscreen controls
      if (fullscreenControls) {
        fullscreenControls.classList.remove('visible');
      }
      // Remove fullscreen class from body
      document.body.classList.remove('is-fullscreen');
    }
    // Force renderer size update when fullscreen changes
    // Use a small delay to ensure the DOM has updated
    setTimeout(() => {
      updateRendererSize();
      renderFractal();
    }, 100);
  };

  // Listen for fullscreen changes
  const fullscreenChangeHandlers = [
    { event: 'fullscreenchange', handler: updateFullscreenButton },
    { event: 'webkitfullscreenchange', handler: updateFullscreenButton },
    { event: 'mozfullscreenchange', handler: updateFullscreenButton },
    { event: 'MSFullscreenChange', handler: updateFullscreenButton },
  ];

  fullscreenChangeHandlers.forEach(({ event, handler }) => {
    document.addEventListener(event, handler);
  });

  // Cleanup fullscreen listeners on beforeunload
  window.addEventListener(
    'beforeunload',
    () => {
      fullscreenChangeHandlers.forEach(({ event, handler }) => {
        document.removeEventListener(event, handler);
      });
    },
    { once: true }
  );

  // Toggle fullscreen on button click
  fullscreenBtn.addEventListener('click', async () => {
    try {
      if (isFullscreen()) {
        await exitFullscreen();
      } else {
        await requestFullscreen(canvasContainer);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  });
}

function setupCollapsibleSections() {
  const sectionHeaders = document.querySelectorAll('.section-header');

  sectionHeaders.forEach((header) => {
    header.addEventListener('click', () => {
      const section = header.parentElement;
      const content = section.querySelector('.section-content');
      const isActive = content.classList.contains('active');

      if (isActive) {
        content.classList.remove('active');
        header.classList.add('collapsed');
      } else {
        content.classList.add('active');
        header.classList.remove('collapsed');
      }
    });
  });
}

function setupPanelToggle() {
  const sidePanel = document.querySelector('.side-panel');
  const backBtn = document.querySelector('.back-btn');
  const showPanelBtn = document.getElementById('show-panel-btn');

  // Hide panel when back button is clicked
  backBtn.addEventListener('click', () => {
    sidePanel.classList.add('hidden');
    // Resize canvas after panel animation
    setTimeout(() => {
      if (updateRendererSize) {
        updateRendererSize();
      }
    }, 300);
  });

  // Show panel when show button is clicked
  showPanelBtn.addEventListener('click', () => {
    sidePanel.classList.remove('hidden');
    // Resize canvas after panel animation
    setTimeout(() => {
      if (updateRendererSize) {
        updateRendererSize();
      }
    }, 300);
  });
}


function renderFractalProgressive(startIterations = null) {
  if (!currentFractalModule || !currentFractalModule.render || !regl) {
    hideLoadingBar();
    return;
  }

  // Check cache first - if we have a cached frame, use it immediately
  const cached = frameCache.getCachedFrame(canvas, currentFractalType, params, regl);
  if (cached && cached.framebuffer) {
    // Display cached frame
    displayCachedFrame(cached.framebuffer);
    hideLoadingBar();
    isProgressiveRendering = false; // Not rendering progressively
    return;
  }

  // Not using cache, so we're not displaying cached
  isDisplayingCached = false;
  cachedDrawCommand = null;

  // Cancel any existing progressive render
  if (progressiveRenderAnimationFrame !== null) {
    cancelAnimationFrame(progressiveRenderAnimationFrame);
    progressiveRenderAnimationFrame = null;
  }

  targetIterations = params.iterations;

  // Update pixel ratio based on zoom level
  updatePixelRatio();

  // Clear the canvas before rendering
  regl.clear({
    color: [0, 0, 0, 1],
    depth: 1,
  });

  // Start with low quality for immediate feedback
  const initialIterations = startIterations || Math.max(20, Math.floor(targetIterations * 0.2));
  currentProgressiveIterations = initialIterations;

  // Create or recreate draw command with progressive iterations
  drawFractal = currentFractalModule.render(
    regl,
    { ...params, iterations: currentProgressiveIterations },
    canvas
  );

  // Render immediately
  if (drawFractal) {
    drawFractal();
  }
  needsRender = false; // Progressive rendering handles its own renders

  isProgressiveRendering = true;

  // Progressively increase quality
  const stepSize = Math.max(10, Math.floor(targetIterations * 0.15));
  const progressiveStep = () => {
    if (currentProgressiveIterations < targetIterations) {
      currentProgressiveIterations = Math.min(
        currentProgressiveIterations + stepSize,
        targetIterations
      );

      // Recreate draw command with updated iterations
      drawFractal = currentFractalModule.render(
        regl,
        { ...params, iterations: currentProgressiveIterations },
        canvas
      );
      if (drawFractal) {
        drawFractal();
      }
      needsRender = false; // Progressive rendering handles its own renders

      // Schedule next step using requestAnimationFrame for smooth rendering aligned with display refresh
      progressiveRenderAnimationFrame = requestAnimationFrame(progressiveStep);
    } else {
      isProgressiveRendering = false;
      // Cache the fully rendered frame
      cacheCurrentFrame();
      hideLoadingBar();
    }
  };

  // Start progressive rendering using requestAnimationFrame for smooth rendering aligned with display refresh
  progressiveRenderAnimationFrame = requestAnimationFrame(progressiveStep);
}

// Zoom into a selection box area
function zoomToSelection(startX, startY, endX, endY, canvasRect) {
  // Validate input dimensions
  const displayWidth = canvasRect.width;
  const displayHeight = canvasRect.height;

  if (!displayWidth || !displayHeight || displayWidth <= 0 || displayHeight <= 0) {
    console.warn('Invalid canvas dimensions for zoom to selection');
    return;
  }

  // Validate selection coordinates
  if (isNaN(startX) || isNaN(startY) || isNaN(endX) || isNaN(endY)) {
    console.warn('Invalid selection coordinates (NaN)');
    return;
  }

  // Clamp coordinates to canvas bounds
  const clampedStartX = Math.max(0, Math.min(startX, displayWidth));
  const clampedStartY = Math.max(0, Math.min(startY, displayHeight));
  const clampedEndX = Math.max(0, Math.min(endX, displayWidth));
  const clampedEndY = Math.max(0, Math.min(endY, displayHeight));

  // Normalize coordinates to 0-1 (UV space)
  const x1 = Math.min(clampedStartX, clampedEndX) / displayWidth;
  const y1 = Math.min(clampedStartY, clampedEndY) / displayHeight;
  const x2 = Math.max(clampedStartX, clampedEndX) / displayWidth;
  const y2 = Math.max(clampedStartY, clampedEndY) / displayHeight;

  // Validate normalized coordinates
  if (x1 === x2 || y1 === y2) {
    console.warn('Selection box has zero width or height');
    return;
  }

  // Get canvas dimensions for aspect calculation (matches shader's uResolution)
  // The shader uses: aspect = uResolution.x / uResolution.y
  const rendererWidth = canvas.width;
  const rendererHeight = canvas.height;

  if (!rendererWidth || !rendererHeight || rendererWidth <= 0 || rendererHeight <= 0) {
    console.warn('Invalid renderer dimensions for zoom to selection');
    return;
  }

  const aspect = rendererWidth / rendererHeight;

  if (!isFinite(aspect) || aspect <= 0) {
    console.warn('Invalid aspect ratio calculated');
    return;
  }

  // Validate current zoom
  if (!params.zoom || !isFinite(params.zoom) || params.zoom <= 0) {
    console.warn('Invalid current zoom level');
    return;
  }

  // Calculate fractal coordinates for the selection corners
  // This matches the shader formula: (uv - 0.5) * scale * aspect * uXScale + uOffset
  const scale = 4.0 / params.zoom;

  // Top-left corner (x1, y1)
  const fractalX1 = (x1 - 0.5) * scale * aspect * params.xScale + params.offset.x;
  const fractalY1 = (y1 - 0.5) * scale * params.yScale + params.offset.y;

  // Bottom-right corner (x2, y2)
  const fractalX2 = (x2 - 0.5) * scale * aspect * params.xScale + params.offset.x;
  const fractalY2 = (y2 - 0.5) * scale * params.yScale + params.offset.y;

  // Validate fractal coordinates
  if (
    !isFinite(fractalX1) ||
    !isFinite(fractalY1) ||
    !isFinite(fractalX2) ||
    !isFinite(fractalY2)
  ) {
    console.warn('Invalid fractal coordinates calculated (NaN or Infinity)');
    return;
  }

  // Calculate center and size of selection in fractal space
  const centerX = (fractalX1 + fractalX2) / 2;
  const centerY = (fractalY1 + fractalY2) / 2;
  const width = Math.abs(fractalX2 - fractalX1);
  const height = Math.abs(fractalY2 - fractalY1);

  // Validate selection size in fractal space
  if (width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
    console.warn('Invalid selection size in fractal space');
    return;
  }

  // Calculate new zoom to fit the selection
  // The selection should fill the viewport after zooming
  // After zooming, the viewport will show: 4.0 / newZoom in fractal space
  // We want the selection to fill this viewport

  // Calculate the required viewport size in fractal space
  // The viewport in fractal space has dimensions:
  // width: (4.0 / newZoom) * aspect * xScale
  // height: (4.0 / newZoom) * yScale
  // We want these to match the selection dimensions

  // Solve for newZoom:
  // width = (4.0 / newZoom) * aspect * xScale  =>  newZoom = (4.0 * aspect * xScale) / width
  // height = (4.0 / newZoom) * yScale  =>  newZoom = (4.0 * yScale) / height

  // Use the larger zoom value to ensure the selection fits within the viewport
  // This ensures that the entire selection is visible after zooming
  const zoomByWidth = (4.0 * aspect * params.xScale) / width;
  const zoomByHeight = (4.0 * params.yScale) / height;

  // Validate zoom calculations
  if (!isFinite(zoomByWidth) || !isFinite(zoomByHeight) || zoomByWidth <= 0 || zoomByHeight <= 0) {
    console.warn('Invalid zoom calculation (NaN, Infinity, or <= 0)');
    return;
  }

  // Use the larger zoom value to ensure the selection fits
  // This means the selection will fill one dimension and fit within the other
  const newZoom = Math.max(zoomByWidth, zoomByHeight);

  // Validate final zoom value and apply reasonable bounds
  if (!isFinite(newZoom) || newZoom <= 0) {
    console.warn('Final zoom value is invalid');
    return;
  }

  // Apply reasonable zoom bounds (prevent extreme zoom levels that cause blank screens)
  const minZoom = 0.1;
  const maxZoom = 1e10; // Very high but still finite
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

  // Validate center coordinates
  if (!isFinite(centerX) || !isFinite(centerY)) {
    console.warn('Invalid center coordinates');
    return;
  }

  // Update parameters
  params.zoom = clampedZoom;
  params.offset.x = centerX;
  params.offset.y = centerY;

  // Render the new view
  renderFractalProgressive();
}

// Display a cached frame
function displayCachedFrame(framebuffer) {
  if (!regl || !framebuffer || !canvas) return;

  // Clear the canvas first to prevent background bleed-through
  regl.clear({
    color: [0, 0, 0, 1],
    depth: 1,
  });

  // Create draw command to display the cached framebuffer
  // Use the texture from the framebuffer
  const texture = framebuffer.color[0] || framebuffer.color;

  cachedDrawCommand = regl({
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

  isDisplayingCached = true;
  needsRender = true; // Mark that we need to render this cached frame
  // Render immediately so cached frame appears right away
  if (cachedDrawCommand) {
    cachedDrawCommand();
  }
}

// Cache the current rendered frame
function cacheCurrentFrame() {
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
  frameCache.cacheFrame(canvas, currentFractalType, params, framebuffer);
}

function renderFractal() {
  if (!currentFractalModule) {
    // Only warn if we're not currently loading a fractal
    // This prevents false warnings during initialization
    if (!isLoadingFractal) {
      console.warn('No fractal module loaded');
    }
    hideLoadingBar();
    return;
  }

  if (!currentFractalModule.render || !regl) {
    console.error(
      'Fractal module missing render function or regl not initialized:',
      currentFractalType
    );
    hideLoadingBar();
    return;
  }

  // Check cache first
  const cached = frameCache.getCachedFrame(canvas, currentFractalType, params, regl);
  if (cached && cached.framebuffer) {
    displayCachedFrame(cached.framebuffer);
    hideLoadingBar();
    isProgressiveRendering = false; // Not rendering progressively
    return;
  }

  // Not using cache, so we're not displaying cached
  isDisplayingCached = false;
  cachedDrawCommand = null;

  // Cancel progressive rendering if active
  if (progressiveRenderAnimationFrame !== null) {
    cancelAnimationFrame(progressiveRenderAnimationFrame);
    progressiveRenderAnimationFrame = null;
    isProgressiveRendering = false;
  }

  // Show loading bar (if not already shown by scheduleRender)
  showLoadingBar();

  // Update pixel ratio based on zoom level for better quality when zoomed in
  updatePixelRatio();

  // Clear the canvas before rendering
  regl.clear({
    color: [0, 0, 0, 1],
    depth: 1,
  });

  // Call the fractal's render function to create draw command
  drawFractal = currentFractalModule.render(regl, params, canvas);

  // Execute the draw command
  if (drawFractal) {
    drawFractal();
  }

  needsRender = false; // Render complete (renderFractal handles its own render call)
  isDisplayingCached = false; // Not displaying cached frame

  // Cache the rendered frame after a short delay to ensure it's fully rendered
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      cacheCurrentFrame();
      // Add a small delay so the loading bar is visible even for fast renders
      setTimeout(() => {
        hideLoadingBar();
      }, 100);
    });
  });
}

function animate() {
  requestAnimationFrame(animate);

  // Increment frame counter (FPS calculation moved to separate interval)
  incrementFrameCount();

  // Only render when necessary:
  // 1. When progressive rendering is active (needs continuous updates)
  // 2. When explicitly marked as needing a render (one-time render)
  const shouldRender = needsRender || isProgressiveRendering;

  if (shouldRender) {
    // Render cached frame or fractal
    if (isDisplayingCached && cachedDrawCommand) {
      cachedDrawCommand();
    } else if (drawFractal) {
      drawFractal();
    }

    // Reset needsRender flag after rendering (progressive rendering will keep setting it)
    if (!isProgressiveRendering) {
      needsRender = false;
      // If we were displaying a cached frame, we've now rendered it once, so stop
      if (isDisplayingCached) {
        isDisplayingCached = false;
      }
    }
  }
}


// Wrapper function to update coordinate display (for backward compatibility)
function updateCoordinateDisplay() {
  updateAllDisplays(currentFractalType, params);
}

// Fractal state encoding/decoding for sharing
function encodeFractalState() {
  const state = {
    t: currentFractalType, // type
    c: params.colorScheme, // color scheme
    z: Math.round(params.zoom * 10000) / 10000, // zoom
    i: params.iterations, // iterations
    ox: Math.round(params.offset.x * 100000) / 100000, // offset x
    oy: Math.round(params.offset.y * 100000) / 100000, // offset y
    xs: Math.round(params.xScale * 100) / 100, // x scale
    ys: Math.round(params.yScale * 100) / 100, // y scale
  };

  // Add Julia parameters if it's a Julia type fractal
  if (isJuliaType(currentFractalType)) {
    state.jx = Math.round(params.juliaC.x * 100000) / 100000; // julia c real
    state.jy = Math.round(params.juliaC.y * 100000) / 100000; // julia c imag
  }

  // Convert to base64 URL-safe string
  const json = JSON.stringify(state);
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function decodeFractalState(encoded) {
  try {
    // Decode base64 URL-safe string
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    const json = atob(base64);
    const state = JSON.parse(json);

    return {
      fractalType: state.t || 'mandelbrot',
      colorScheme: state.c || 'classic',
      zoom: state.z || 1,
      iterations: state.i || 125,
      offsetX: state.ox || 0,
      offsetY: state.oy || 0,
      xScale: state.xs || 1.0,
      yScale: state.ys || 1.0,
      juliaCX: state.jx,
      juliaCY: state.jy,
    };
  } catch (error) {
    console.error('Failed to decode fractal state:', error);
    return null;
  }
}

async function applyFractalState(state) {
  if (!state) return false;

  // Update fractal type first
  if (state.fractalType) {
    const fractalTypeSelect = document.getElementById('fractal-type');
    if (fractalTypeSelect) {
      fractalTypeSelect.value = state.fractalType;
    }

    // Always load the fractal module if type changed or if module is not loaded
    if (state.fractalType !== currentFractalType || !currentFractalModule) {
      currentFractalType = state.fractalType;
      await loadFractal(currentFractalType);
    }
  } else if (!currentFractalModule) {
    // If no fractal type in state but module not loaded, load default
    await loadFractal(currentFractalType);
  }

  // Update Wikipedia link
  updateWikipediaLink();

  // Update parameters
  if (state.zoom !== undefined) params.zoom = state.zoom;
  if (state.iterations !== undefined) params.iterations = state.iterations;
  if (state.colorScheme !== undefined) params.colorScheme = state.colorScheme;
  if (state.offsetX !== undefined) params.offset.x = state.offsetX;
  if (state.offsetY !== undefined) params.offset.y = state.offsetY;
  if (state.xScale !== undefined) params.xScale = state.xScale;
  if (state.yScale !== undefined) params.yScale = state.yScale;

  // Update Julia parameters if provided
  if (state.juliaCX !== undefined) params.juliaC.x = state.juliaCX;
  if (state.juliaCY !== undefined) params.juliaC.y = state.juliaCY;

  // Update UI controls
  const iterationsSlider = document.getElementById('iterations');
  const iterationsValue = document.getElementById('iterations-value');
  const fullscreenIterationsNumber = document.getElementById('fullscreen-iterations-number');
  if (iterationsSlider && state.iterations !== undefined) {
    iterationsSlider.value = state.iterations;
  }
  if (iterationsValue && state.iterations !== undefined) {
    iterationsValue.textContent = state.iterations;
  }
  if (fullscreenIterationsNumber && state.iterations !== undefined) {
    fullscreenIterationsNumber.textContent = state.iterations;
  }

  const colorSchemeSelect = document.getElementById('color-scheme');
  if (colorSchemeSelect && state.colorScheme !== undefined) {
    colorSchemeSelect.value = state.colorScheme;
  }

  const xScaleSlider = document.getElementById('x-scale');
  const xScaleValue = document.getElementById('x-scale-value');
  const xScaleAnnounce = document.getElementById('x-scale-announce');
  if (xScaleSlider && state.xScale !== undefined) {
    xScaleSlider.value = state.xScale;
    // Update accessibility attributes without announcing (programmatic change)
    if (xScaleValue && xScaleAnnounce) {
      const formattedValue = state.xScale.toFixed(1);
      xScaleValue.textContent = formattedValue;
      xScaleSlider.setAttribute('aria-valuenow', formattedValue);
      xScaleSlider.setAttribute('aria-valuetext', formattedValue);
    }
  }

  const yScaleSlider = document.getElementById('y-scale');
  const yScaleValue = document.getElementById('y-scale-value');
  const yScaleAnnounce = document.getElementById('y-scale-announce');
  if (yScaleSlider && state.yScale !== undefined) {
    yScaleSlider.value = state.yScale;
    // Update accessibility attributes without announcing (programmatic change)
    if (yScaleValue && yScaleAnnounce) {
      const formattedValue = state.yScale.toFixed(1);
      yScaleValue.textContent = formattedValue;
      yScaleSlider.setAttribute('aria-valuenow', formattedValue);
      yScaleSlider.setAttribute('aria-valuetext', formattedValue);
    }
  }

  // Update Julia controls if applicable
  if (isJuliaType(currentFractalType)) {
    const juliaCRealSlider = document.getElementById('julia-c-real');
    const juliaCRealValue = document.getElementById('julia-c-real-value');
    if (juliaCRealSlider && state.juliaCX !== undefined) {
      juliaCRealSlider.value = state.juliaCX;
    }
    if (juliaCRealValue && state.juliaCX !== undefined) {
      juliaCRealValue.textContent = state.juliaCX.toFixed(4);
    }

    const juliaCImagSlider = document.getElementById('julia-c-imag');
    const juliaCImagValue = document.getElementById('julia-c-imag-value');
    if (juliaCImagSlider && state.juliaCY !== undefined) {
      juliaCImagSlider.value = state.juliaCY;
    }
    if (juliaCImagValue && state.juliaCY !== undefined) {
      juliaCImagValue.textContent = state.juliaCY.toFixed(4);
    }
  }

  // Update coordinate display
  updateCoordinateDisplay();

  // Render the fractal
  renderFractal();

  return true;
}

function getShareableURL() {
  const seed = encodeFractalState();
  // Use origin and pathname to ensure we get a clean URL without existing query params
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('seed', seed);
  return url.toString();
}

function getShareableSeed() {
  return encodeFractalState();
}

function setupShareFractal() {
  const shareBtn = document.getElementById('share-fractal-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const url = getShareableURL();
      const seed = getShareableSeed();

      // Try to copy URL first, fallback to seed
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(url);
          const originalText = shareBtn.innerHTML;
          shareBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>Copied!';
          shareBtn.style.background = 'var(--accent-blue)';

          setTimeout(() => {
            shareBtn.innerHTML = originalText;
            shareBtn.style.background = '';
          }, 2000);
          return;
        } catch (err) {
          console.error('Failed to copy URL, trying seed:', err);
          // Try copying seed as fallback
          try {
            await navigator.clipboard.writeText(seed);
            const originalText = shareBtn.innerHTML;
            shareBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>Copied Seed!';
            shareBtn.style.background = 'var(--accent-blue)';

            setTimeout(() => {
              shareBtn.innerHTML = originalText;
              shareBtn.style.background = '';
            }, 2000);
            return;
          } catch (err2) {
            console.error('Failed to copy seed:', err2);
          }
        }
      }

      // Final fallback: show alert with manual copy option
      alert(`Failed to copy. Please copy manually:\n\nURL: ${url}\n\nSeed: ${seed}`);
    });
  }
}

async function loadFractalFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  let seed = urlParams.get('seed');

  // Also check URL hash for seed (alternative format)
  if (!seed && window.location.hash) {
    const hash = window.location.hash.substring(1); // Remove #
    // Check if hash looks like a seed (base64-like string)
    if (hash.length > 10 && /^[A-Za-z0-9_-]+$/.test(hash)) {
      seed = hash;
    }
  }

  if (seed) {
    // Decode the seed (it might be URL encoded)
    try {
      seed = decodeURIComponent(seed);
    } catch {
      // If decoding fails, use the seed as-is
    }

    const state = decodeFractalState(seed);
    if (state) {
      await applyFractalState(state);
      return true;
    } else {
      console.warn('Failed to decode fractal state from URL seed:', seed);
    }
  }

  return false;
}

// Initialize on load
// Function to update footer height CSS variable
function updateFooterHeight() {
  const footer = document.querySelector('.app-footer');
  if (footer) {
    const height = footer.offsetHeight;
    document.documentElement.style.setProperty('--footer-height', `${height}px`);
  }
}

// Update footer height on load and resize
window.addEventListener('load', () => {
  init();
  updateFooterHeight();
});

// Update footer height when window resizes or content changes
window.addEventListener('resize', updateFooterHeight);

// Use ResizeObserver for more accurate footer height tracking
const footerObserver = new ResizeObserver(() => {
  updateFooterHeight();
});

// Start observing footer once DOM is ready
function setupFooterHeightTracking() {
  const footer = document.querySelector('.app-footer');
  const shareButton = document.getElementById('share-fractal-btn');
  const shareDescription = document.querySelector('.footer-share-description');

  if (footer) {
    // Observe the footer itself
    footerObserver.observe(footer);

    // Also observe the share description element to catch its size changes
    if (shareDescription) {
      footerObserver.observe(shareDescription);
    }

    updateFooterHeight();

    // Update height when share button is hovered (description appears)
    // Use requestAnimationFrame to catch the transition mid-way
    if (shareButton) {
      const updateOnHover = () => {
        // Update immediately
        requestAnimationFrame(() => {
          updateFooterHeight();
          // Update again after transition completes
          setTimeout(updateFooterHeight, 250);
        });
      };

      shareButton.addEventListener('mouseenter', updateOnHover, { passive: true });
      shareButton.addEventListener('mouseleave', updateOnHover, { passive: true });
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupFooterHeightTracking);
} else {
  setupFooterHeightTracking();
}
