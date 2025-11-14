import createRegl from 'regl';

// Application state
let regl = null;
let canvas = null;
let currentFractalType = 'mandelbrot';
let lastTime = 0;
let frameCount = 0;
let fps = 0;
let drawFractal = null; // Current regl draw command
let currentFractalModule = null; // Currently loaded fractal module
let fractalCache = new Map(); // Cache for loaded fractal modules
let needsRender = false; // Flag to indicate if a render is needed
let isDisplayingCached = false; // Track if we're displaying a cached frame

// Render throttling for smooth interaction
let renderScheduled = false;

// Progressive rendering state
let progressiveRenderTimeout = null;
let currentProgressiveIterations = 0;
let targetIterations = 0;
let isProgressiveRendering = false;

// Frame cache for rendered fractals
let frameCache = new Map();
const MAX_CACHE_SIZE = 10; // Maximum number of cached frames
let cachedDrawCommand = null; // Draw command for displaying cached frames

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

// Generate cache key from view parameters
// Optimized: cache DOM element reference and use template literal
let cachedCanvasElement = null;
function generateCacheKey() {
  if (!canvas) return null;

  // Cache canvas element reference
  if (!cachedCanvasElement) {
    cachedCanvasElement = canvas;
  }

  // Round values to avoid floating point precision issues
  const zoom = Math.round(params.zoom * 1000) / 1000;
  const offsetX = Math.round(params.offset.x * 10000) / 10000;
  const offsetY = Math.round(params.offset.y * 10000) / 10000;
  const iterations = params.iterations;
  const colorScheme = params.colorScheme;
  const xScale = Math.round(params.xScale * 100) / 100;
  const yScale = Math.round(params.yScale * 100) / 100;
  const juliaCX = currentFractalType === 'julia' ? Math.round(params.juliaC.x * 10000) / 10000 : 0;
  const juliaCY = currentFractalType === 'julia' ? Math.round(params.juliaC.y * 10000) / 10000 : 0;
  // Use display dimensions (not render dimensions affected by pixel ratio) for cache key
  // This ensures cache hits even when pixel ratio changes
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  const width = Math.round(rect.width || container.clientWidth || 800);
  const height = Math.round(rect.height || container.clientHeight || 600);

  // Use template literal for better performance
  return `${currentFractalType}_${zoom}_${offsetX}_${offsetY}_${iterations}_${colorScheme}_${xScale}_${yScale}_${juliaCX}_${juliaCY}_${width}_${height}`;
}

// Check if current view is cached
function getCachedFrame() {
  const key = generateCacheKey();
  if (!key) return null;
  const cached = frameCache.get(key);
  // Verify the cached framebuffer exists
  if (cached && cached.framebuffer && regl) {
    return cached;
  }
  return null;
}

// Store rendered frame in cache
function cacheFrame(framebuffer) {
  const key = generateCacheKey();

  // Limit cache size - remove oldest entries if cache is full
  if (frameCache.size >= MAX_CACHE_SIZE) {
    // Remove first (oldest) entry
    const firstKey = frameCache.keys().next().value;
    const oldEntry = frameCache.get(firstKey);
    if (oldEntry && oldEntry.framebuffer) {
      oldEntry.framebuffer.destroy();
    }
    frameCache.delete(firstKey);
  }

  frameCache.set(key, { framebuffer, timestamp: Date.now() });
}

// Clear frame cache
function clearFrameCache() {
  for (const [, entry] of frameCache.entries()) {
    if (entry.framebuffer) entry.framebuffer.destroy();
  }
  frameCache.clear();
}

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
  iterations: 100,
  colorScheme: 'classic',
  juliaC: { x: -0.7269, y: 0.1889 },
  center: { x: 0, y: 0 },
  zoom: 1,
  offset: { x: 0, y: 0 },
  xScale: 1.0,
  yScale: 1.0,
};

// Initialize regl
function init() {
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
  try {
    const gl = regl._gl;
    if (gl instanceof WebGL2RenderingContext) {
      console.log('WebGL2 available - enhanced features enabled');
    } else {
      console.log('WebGL1 in use - still optimized for performance');
    }
  } catch {
    console.log('WebGL context check completed');
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
  window.addEventListener('resize', handleResize);

  // Use ResizeObserver for more accurate container size tracking
  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(container);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    resizeObserver.disconnect();
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    clearFrameCache();
    if (progressiveRenderTimeout) {
      clearTimeout(progressiveRenderTimeout);
    }
  });

  // Setup controls
  setupControls();
  setupUI();
  setupCollapsibleSections();
  setupPanelToggle();

  // Load initial fractal
  loadFractal(currentFractalType).then(() => {
    renderFractal();
    animate();
  });
}

// Dynamically load a fractal module
async function loadFractal(fractalType) {
  // Check cache first
  if (fractalCache.has(fractalType)) {
    currentFractalModule = fractalCache.get(fractalType);
    return;
  }

  try {
    // All fractals are 2D, load from 2d folder
    const module = await import(`./fractals/2d/${fractalType}.js`);

    // Verify the module has required exports
    if (!module.render) {
      throw new Error(`Fractal module ${fractalType} missing render function`);
    }

    currentFractalModule = module;

    // Cache the module
    fractalCache.set(fractalType, module);
    console.log(`Loaded fractal module: ${fractalType}`);
  } catch (error) {
    console.error(`Failed to load fractal: ${fractalType}`, error);
    // Fallback to mandelbrot if loading fails
    if (fractalType !== 'mandelbrot') {
      console.warn(`Falling back to mandelbrot`);
      return loadFractal('mandelbrot');
    } else {
      throw error; // Re-throw if mandelbrot also fails
    }
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
      const sensitivity = 0.001 * params.zoom;
      params.offset.x -= deltaX * sensitivity;
      params.offset.y += deltaY * sensitivity;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      scheduleRender(); // Use throttled render for smooth panning
    }
  });

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
  });

  // Also handle mouse leave to reset cursor if drag ends
  canvas.addEventListener('mouseleave', () => {
    if (!isDragging && !isSelecting) {
      canvas.style.cursor = 'grab';
    }
  });

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
  });

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

    // Use progressive rendering for faster feedback
    renderFractalProgressive();
  };

  // Attach double-click handler to both canvas and container
  // This ensures it works in both normal and fullscreen modes
  canvas.addEventListener('dblclick', handleDoubleClick);
  canvasContainer.addEventListener('dblclick', handleDoubleClick);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    params.zoom *= zoomFactor;
    scheduleRender(); // Use throttled render for smooth zooming
  });
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

  const triggerAutoRender = () => {
    if (autoRenderEnabled) {
      renderFractalProgressive();
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
  const isJulia = currentFractalType === 'julia' || currentFractalType === 'julia-snakes';
  juliaCReal.disabled = !isJulia;
  juliaCImag.disabled = !isJulia;
  if (isJulia) {
    juliaControls.classList.remove('disabled');
  } else {
    juliaControls.classList.add('disabled');
  }

  // Color scheme cycling (shared between main UI and fullscreen controls)
  const colorSchemes = [
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
  ];
  let currentColorSchemeIndex = colorSchemes.indexOf(params.colorScheme);
  if (currentColorSchemeIndex === -1) currentColorSchemeIndex = 0;

  fractalTypeSelect.addEventListener('change', async (e) => {
    currentFractalType = e.target.value;

    // Clear previous fractal draw command
    drawFractal = null;
    cachedDrawCommand = null;
    isDisplayingCached = false;

    // Clear the cache for this fractal type to force a fresh load
    fractalCache.delete(currentFractalType);

    // Clear frame cache when fractal type changes
    clearFrameCache();

    // Clear the canvas before switching fractals
    if (regl && canvas) {
      regl.clear({
        color: [0, 0, 0, 1],
        depth: 1,
      });
    }

    // Load the new fractal module
    try {
      await loadFractal(currentFractalType);
      console.log(
        `Fractal type changed to: ${currentFractalType}, module loaded:`,
        !!currentFractalModule
      );
    } catch (error) {
      console.error('Failed to load fractal on change:', error);
      return;
    }

    // Enable/disable Julia controls based on fractal type
    const isJulia = currentFractalType === 'julia' || currentFractalType === 'julia-snakes';
    juliaCReal.disabled = !isJulia;
    juliaCImag.disabled = !isJulia;
    if (isJulia) {
      juliaControls.classList.remove('disabled');
    } else {
      juliaControls.classList.add('disabled');
    }

    // Set default view parameters based on fractal type
    if (currentFractalType === 'burning-ship') {
      // Burning Ship - shows the ship upright
      params.zoom = 1.2;
      params.offset.x = -0.5;
      params.offset.y = -0.6;
    } else if (currentFractalType === 'buffalo') {
      // Buffalo - vertical mirror of Burning Ship (same view, flipped y-axis)
      params.zoom = 1.2;
      params.offset.x = -0.5;
      params.offset.y = 0.6;  // Opposite sign from Burning Ship
    } else if (currentFractalType === 'popcorn') {
      // Popcorn fractal - best viewed from the center
      params.zoom = 1;
      params.offset.x = 0;
      params.offset.y = 0;
    } else if (currentFractalType === 'rose') {
      // Rose window fractal - best viewed from center to see full pattern
      params.zoom = 1;
      params.offset.x = 0;
      params.offset.y = 0;
    } else if (currentFractalType === 'julia-snakes') {
      // Julia Snakes - set good default C value for snake-like patterns
      params.zoom = 1;
      params.offset.x = 0;
      params.offset.y = 0;
      params.juliaC.x = -0.4;
      params.juliaC.y = 0.6;
      // Update Julia C sliders
      if (juliaCReal) juliaCReal.value = -0.4;
      if (juliaCImag) juliaCImag.value = 0.6;
      if (juliaCRealValue) juliaCRealValue.textContent = '-0.4000';
      if (juliaCImagValue) juliaCImagValue.textContent = '0.6000';
    } else {
      // Default view for other fractals
      params.zoom = 1;
      params.offset.x = 0;
      params.offset.y = 0;
    }
    triggerAutoRender();
  });

  iterationsSlider.addEventListener('input', (e) => {
    params.iterations = parseInt(e.target.value);
    iterationsValue.textContent = params.iterations;
    triggerAutoRender();
  });

  colorSchemeSelect.addEventListener('change', (e) => {
    params.colorScheme = e.target.value;
    // Update color scheme index for fullscreen cycling
    const newIndex = colorSchemes.indexOf(params.colorScheme);
    if (newIndex !== -1) {
      currentColorSchemeIndex = newIndex;
    }
    triggerAutoRender();
  });

  juliaCReal.addEventListener('input', (e) => {
    params.juliaC.x = parseFloat(e.target.value);
    juliaCRealValue.textContent = params.juliaC.x.toFixed(4);
    triggerAutoRender();
  });

  juliaCImag.addEventListener('input', (e) => {
    params.juliaC.y = parseFloat(e.target.value);
    juliaCImagValue.textContent = params.juliaC.y.toFixed(4);
    triggerAutoRender();
  });

  xScaleSlider.addEventListener('input', (e) => {
    params.xScale = parseFloat(e.target.value);
    xScaleValue.textContent = params.xScale.toFixed(1);
    triggerAutoRender();
  });

  yScaleSlider.addEventListener('input', (e) => {
    params.yScale = parseFloat(e.target.value);
    yScaleValue.textContent = params.yScale.toFixed(1);
    triggerAutoRender();
  });

  updateFractalBtn.addEventListener('click', async () => {
    // Always ensure the correct fractal module is loaded for the current type
    try {
      await loadFractal(currentFractalType);
      console.log(
        `Update button clicked for: ${currentFractalType}, module loaded:`,
        !!currentFractalModule
      );
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
    params.zoom = 1;
    params.offset.x = 0;
    params.offset.y = 0;
    params.xScale = 1.0;
    params.yScale = 1.0;
    xScaleSlider.value = 1.0;
    yScaleSlider.value = 1.0;
    xScaleValue.textContent = '1.0';
    yScaleValue.textContent = '1.0';
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
    if (fractalType === 'sierpinski' || fractalType === 'koch' || fractalType === 'popcorn' || fractalType === 'rose' || fractalType === 'mutant-mandelbrot') {
      return true;
    }

    // For Burning Ship and Buffalo, use similar validation to Mandelbrot
    // (they're escape-time fractals with similar characteristics)
    if (fractalType === 'burning-ship' || fractalType === 'buffalo') {
      fractalType = 'mandelbrot'; // Use same validation logic
    }

    // For Mandelbrot/Julia/Burning Ship/Buffalo, sample points to check for variation
    const samplePoints = 9; // 3x3 grid
    const iterations = params.iterations;
    // Cache canvas dimensions
    const canvasEl = cachedCanvasElement || canvas;
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

  // Function to generate random interesting coordinates and zoom for each fractal type
  function getRandomInterestingView() {
    const fractalType = currentFractalType;

    switch (fractalType) {
      case 'mandelbrot': {
        // Interesting Mandelbrot locations (curated list of known interesting areas)
        const interestingLocations = [
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

      case 'mutant-mandelbrot': {
        // Mutant Mandelbrot - interesting areas with coordinate transformations
        const interestingLocations = [
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
        const interestingJuliaSets = [
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
        const interestingSnakeSets = [
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
        const interestingLocations = [
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
        const interestingLocations = [
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

      case 'koch': {
        // Koch snowflake - zoom into interesting edge details
        const interestingLocations = [
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
        const interestingLocations = [
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
        const interestingLocations = [
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

        const location =
          interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
        const zoom = location.zoom * (0.8 + Math.random() * 0.4);
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

  // Random view button
  fullscreenRandomBtn.addEventListener('click', () => {
    // Get random interesting view
    const randomView = getRandomInterestingView();

    // Update parameters
    params.offset.x = randomView.offset.x;
    params.offset.y = randomView.offset.y;
    params.zoom = randomView.zoom;

    // Clear frame cache since we're changing to a new view
    clearFrameCache();

    // Clear cached display if we're showing one
    if (isDisplayingCached) {
      isDisplayingCached = false;
      cachedDrawCommand = null;
    }

    // Cancel any ongoing progressive rendering
    if (progressiveRenderTimeout) {
      clearTimeout(progressiveRenderTimeout);
      progressiveRenderTimeout = null;
      isProgressiveRendering = false;
    }

    // Render the new random view with progressive rendering for better UX
    renderFractalProgressive();
  });

  // Iterations controls - cache DOM references
  const fullscreenIterationsUpBtn = document.getElementById('fullscreen-iterations-up');
  const fullscreenIterationsDownBtn = document.getElementById('fullscreen-iterations-down');
  const iterationsSliderEl = document.getElementById('iterations');
  const iterationsValueEl = document.getElementById('iterations-value');

  // Shared function to update iterations (avoids code duplication)
  const updateIterations = (delta) => {
    // Update iterations with delta, clamped to valid range
    params.iterations = Math.max(10, Math.min(200, params.iterations + delta));

    // Update UI sliders
    if (iterationsSliderEl) {
      iterationsSliderEl.value = params.iterations;
    }
    if (iterationsValueEl) {
      iterationsValueEl.textContent = params.iterations;
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

function showLoadingBar() {
  const loadingBar = document.getElementById('loading-bar');
  if (loadingBar) {
    loadingBar.classList.remove('active');
    // Force reflow to reset animation
    void loadingBar.offsetWidth;
    loadingBar.classList.add('active');
  }
}

function hideLoadingBar() {
  const loadingBar = document.getElementById('loading-bar');
  if (loadingBar) {
    loadingBar.classList.remove('active');
  }
}

function renderFractalProgressive(startIterations = null) {
  if (!currentFractalModule || !currentFractalModule.render || !regl) {
    hideLoadingBar();
    return;
  }

  // Check cache first - if we have a cached frame, use it immediately
  const cached = getCachedFrame();
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
  if (progressiveRenderTimeout) {
    clearTimeout(progressiveRenderTimeout);
    progressiveRenderTimeout = null;
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

      // Schedule next step
      progressiveRenderTimeout = setTimeout(progressiveStep, 16); // ~60fps
    } else {
      isProgressiveRendering = false;
      // Cache the fully rendered frame
      cacheCurrentFrame();
      hideLoadingBar();
    }
  };

  // Start progressive rendering after a short delay
  progressiveRenderTimeout = setTimeout(progressiveStep, 16);
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

  // Use the larger zoom value to ensure the selection fits
  const zoomByWidth = (4.0 * aspect * params.xScale) / width;
  const zoomByHeight = (4.0 * params.yScale) / height;

  // Validate zoom calculations
  if (!isFinite(zoomByWidth) || !isFinite(zoomByHeight) || zoomByWidth <= 0 || zoomByHeight <= 0) {
    console.warn('Invalid zoom calculation (NaN, Infinity, or <= 0)');
    return;
  }

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

  // Log zoom details for debugging
  console.log('Zoom to selection:', {
    selectionBox: { startX, startY, endX, endY },
    displaySize: { width: displayWidth, height: displayHeight },
    renderBufferSize: { width: rendererWidth, height: rendererHeight },
    aspect: aspect,
    fractalBounds: { x1: fractalX1, y1: fractalY1, x2: fractalX2, y2: fractalY2 },
    selectionSize: { width, height },
    center: { x: centerX, y: centerY },
    oldZoom: params.zoom,
    newZoom: clampedZoom,
    zoomMultiplier: clampedZoom / params.zoom,
  });

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
  cacheFrame(framebuffer);
}

function renderFractal() {
  if (!currentFractalModule) {
    console.warn('No fractal module loaded');
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
  const cached = getCachedFrame();
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
  if (progressiveRenderTimeout) {
    clearTimeout(progressiveRenderTimeout);
    progressiveRenderTimeout = null;
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

  console.log(`Rendering fractal: ${currentFractalType}`);

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

  // Calculate FPS
  frameCount++;
  const currentTime = performance.now();
  if (currentTime >= lastTime + 1000) {
    fps = frameCount;
    frameCount = 0;
    lastTime = currentTime;
    const fpsElement = document.getElementById('fps');
    if (fpsElement) {
      fpsElement.textContent = `FPS: ${fps}`;
    }
  }

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

// Initialize on load
window.addEventListener('load', init);
