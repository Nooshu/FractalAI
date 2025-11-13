import * as THREE from 'three';

// Application state
let scene, camera, renderer;
let currentFractalType = 'mandelbrot';
let lastTime = 0;
let frameCount = 0;
let fps = 0;
let fractalPlane = null;
let currentFractalModule = null; // Currently loaded fractal module
let fractalCache = new Map(); // Cache for loaded fractal modules

// Render throttling for smooth interaction
let renderScheduled = false;
let pendingRender = false;

// Progressive rendering state
let progressiveRenderTimeout = null;
let currentProgressiveIterations = 0;
let targetIterations = 0;
let isProgressiveRendering = false;

// Frame cache for rendered fractals
let frameCache = new Map();
const MAX_CACHE_SIZE = 10; // Maximum number of cached frames
let cachedDisplayPlane = null; // Plane for displaying cached frames

// Function to calculate pixel ratio based on zoom level
// Higher zoom = higher pixel ratio for better quality
function calculatePixelRatio() {
  // Scale pixel ratio with zoom, but cap it to avoid performance issues
  // Base pixel ratio * sqrt(zoom) gives a good balance
  const basePixelRatio = window.devicePixelRatio || 1;
  const zoomMultiplier = Math.min(Math.sqrt(params.zoom), 4); // Cap at 4x
  return basePixelRatio * zoomMultiplier;
}

// Update renderer pixel ratio based on current zoom
function updatePixelRatio() {
  if (renderer) {
    const pixelRatio = calculatePixelRatio();
    renderer.setPixelRatio(pixelRatio);
  }
}

// Global function to update renderer size (needed for fullscreen and double-click)
let updateRendererSize = null;

// Generate cache key from view parameters
function generateCacheKey() {
  if (!renderer) return null;
  
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
  const width = renderer.domElement.width;
  const height = renderer.domElement.height;
  
  return `${currentFractalType}_${zoom}_${offsetX}_${offsetY}_${iterations}_${colorScheme}_${xScale}_${yScale}_${juliaCX}_${juliaCY}_${width}_${height}`;
}

// Check if current view is cached
function getCachedFrame() {
  const key = generateCacheKey();
  if (!key) return null;
  const cached = frameCache.get(key);
  // Verify the cached texture dimensions match current renderer size
  if (cached && cached.texture && renderer) {
    const cachedWidth = cached.texture.image?.width || cached.renderTarget?.width;
    const cachedHeight = cached.texture.image?.height || cached.renderTarget?.height;
    if (cachedWidth === renderer.domElement.width && 
        cachedHeight === renderer.domElement.height) {
      return cached;
    }
  }
  return null;
}

// Store rendered frame in cache
function cacheFrame(texture, renderTarget) {
  const key = generateCacheKey();
  
  // Limit cache size - remove oldest entries if cache is full
  if (frameCache.size >= MAX_CACHE_SIZE) {
    // Remove first (oldest) entry
    const firstKey = frameCache.keys().next().value;
    const oldEntry = frameCache.get(firstKey);
    if (oldEntry) {
      oldEntry.texture.dispose();
      oldEntry.renderTarget.dispose();
    }
    frameCache.delete(firstKey);
  }
  
  frameCache.set(key, { texture, renderTarget, timestamp: Date.now() });
}

// Clear frame cache
function clearFrameCache() {
  for (const [key, entry] of frameCache.entries()) {
    if (entry.texture) entry.texture.dispose();
    if (entry.renderTarget) entry.renderTarget.dispose();
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
      if (pendingRender) {
        pendingRender = false;
        // Use progressive rendering for faster feedback
        renderFractalProgressive();
      } else {
        // Use progressive rendering for faster feedback
        renderFractalProgressive();
      }
    });
  } else {
    pendingRender = true;
  }
}


// Fractal parameters
let params = {
  iterations: 100,
  colorScheme: 'classic',
  juliaC: new THREE.Vector2(-0.7269, 0.1889),
  center: new THREE.Vector2(0, 0),
  zoom: 1,
  offset: new THREE.Vector2(0, 0),
  xScale: 1.0,
  yScale: 1.0,
};

// Initialize Three.js
function init() {
  const canvas = document.getElementById('fractal-canvas');
  const container = canvas.parentElement;

  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Get container dimensions - ensure we have valid dimensions
  const getContainerSize = () => {
    const rect = container.getBoundingClientRect();
    return {
      width: rect.width || container.clientWidth || 800,
      height: rect.height || container.clientHeight || 600,
    };
  };

  const containerSize = getContainerSize();

  // Camera setup - OrthographicCamera for 2D fractals
  const aspect = containerSize.width / containerSize.height;
  const viewSize = 2; // Size of the view in world units
  camera = new THREE.OrthographicCamera(
    -viewSize * aspect, // left
    viewSize * aspect, // right
    viewSize, // top
    -viewSize, // bottom
    0.1,
    10
  );
  camera.position.z = 1;

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  
  // Function to update renderer size and pixel ratio
  updateRendererSize = () => {
    // Get container from canvas parent (use renderer.domElement which is the canvas)
    const canvasElement = renderer.domElement;
    const container = canvasElement.parentElement;
    const rect = container.getBoundingClientRect();
    const size = {
      width: rect.width || container.clientWidth || 800,
      height: rect.height || container.clientHeight || 600,
    };
    
    updatePixelRatio();
    renderer.setSize(size.width, size.height);

    // Override any inline styles Three.js might set
    canvasElement.style.width = '100%';
    canvasElement.style.height = '100%';
    canvasElement.style.display = 'block';

    const aspect = size.width / size.height;
    const viewSize = 2;

    // Update camera (orthographic)
    camera.left = -viewSize * aspect;
    camera.right = viewSize * aspect;
    camera.top = viewSize;
    camera.bottom = -viewSize;
    camera.updateProjectionMatrix();
  };

  // Initial size setup
  updateRendererSize();

  // Handle window resize
  window.addEventListener('resize', () => {
    updateRendererSize();
    renderFractal();
  });

  // Use ResizeObserver for more accurate container size tracking
  const resizeObserver = new ResizeObserver(() => {
    updateRendererSize();
    renderFractal();
  });
  resizeObserver.observe(container);

  // Setup controls
  setupControls();
  setupUI();

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
  const selectionBox = document.getElementById('selection-box');
  let isDragging = false;
  let isSelecting = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let selectionStartX = 0;
  let selectionStartY = 0;

  canvas.addEventListener('mousedown', (e) => {
    // Only start dragging on left mouse button
    if (e.button === 0) {
      const rect = canvas.getBoundingClientRect();
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
    if (isSelecting) {
      // Update selection box
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const left = Math.min(selectionStartX, mouseX);
      const top = Math.min(selectionStartY, mouseY);
      const width = Math.abs(mouseX - selectionStartX);
      const height = Math.abs(mouseY - selectionStartY);
      
      selectionBox.style.left = left + 'px';
      selectionBox.style.top = top + 'px';
      selectionBox.style.width = width + 'px';
      selectionBox.style.height = height + 'px';
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
        // Zoom into selection box
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const width = Math.abs(mouseX - selectionStartX);
        const height = Math.abs(mouseY - selectionStartY);
        
        // Only zoom if selection box is large enough (at least 10x10 pixels)
        if (width > 10 && height > 10) {
          zoomToSelection(selectionStartX, selectionStartY, mouseX, mouseY, rect);
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
  
  // Update cursor based on modifier keys
  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging && !isSelecting) {
      canvas.style.cursor = e.shiftKey ? 'crosshair' : 'grab';
    }
  });
  
  // Handle keydown/keyup to update cursor
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Shift' && !isDragging && !isSelecting) {
      canvas.style.cursor = 'crosshair';
    }
  });
  
  window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift' && !isDragging && !isSelecting) {
      canvas.style.cursor = 'grab';
    }
  });

  // Double-click to zoom into a point
  canvas.addEventListener('dblclick', (e) => {
    e.preventDefault();
    
    // Ensure renderer size is up-to-date (important for fullscreen mode)
    if (updateRendererSize) {
      updateRendererSize();
    }
    
    // Get canvas bounding rect for mouse position
    const rect = canvas.getBoundingClientRect();
    
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
    
    // Get the renderer's actual pixel dimensions (which the shader uses for uResolution)
    // The shader calculates aspect as uResolution.x / uResolution.y
    // Note: pixel ratio affects both dimensions equally, so aspect should match display aspect
    // But we use renderer dimensions to match exactly what the shader sees
    const rendererWidth = renderer.domElement.width;
    const rendererHeight = renderer.domElement.height;
    
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
  });

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

  fractalTypeSelect.addEventListener('change', async (e) => {
    currentFractalType = e.target.value;

    // Clear the scene completely
    scene.clear();

    // Clear previous fractal plane
    if (fractalPlane) {
      fractalPlane.geometry.dispose();
      fractalPlane.material.dispose();
      fractalPlane = null;
    }

    // Clear the cache for this fractal type to force a fresh load
    fractalCache.delete(currentFractalType);
    
    // Clear frame cache when fractal type changes
    clearFrameCache();

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

    juliaControls.style.display = currentFractalType === 'julia' ? 'block' : 'none';

    params.zoom = 1;
    params.offset.set(0, 0);
    // Don't auto-render, wait for update button
  });

  iterationsSlider.addEventListener('input', (e) => {
    params.iterations = parseInt(e.target.value);
    iterationsValue.textContent = params.iterations;
    // Don't auto-render, wait for update button
  });

  colorSchemeSelect.addEventListener('change', (e) => {
    params.colorScheme = e.target.value;
    // Don't auto-render, wait for update button
  });

  juliaCReal.addEventListener('input', (e) => {
    params.juliaC.x = parseFloat(e.target.value);
    juliaCRealValue.textContent = params.juliaC.x.toFixed(4);
    // Don't auto-render, wait for update button
  });

  juliaCImag.addEventListener('input', (e) => {
    params.juliaC.y = parseFloat(e.target.value);
    juliaCImagValue.textContent = params.juliaC.y.toFixed(4);
    // Don't auto-render, wait for update button
  });

  xScaleSlider.addEventListener('input', (e) => {
    params.xScale = parseFloat(e.target.value);
    xScaleValue.textContent = params.xScale.toFixed(1);
    // Don't auto-render, wait for update button
  });

  yScaleSlider.addEventListener('input', (e) => {
    params.yScale = parseFloat(e.target.value);
    yScaleValue.textContent = params.yScale.toFixed(1);
    // Don't auto-render, wait for update button
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

    // Reset plane to force recreation with new settings
    if (fractalPlane) {
      fractalPlane.geometry.dispose();
      fractalPlane.material.dispose();
      fractalPlane = null;
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
    params.offset.set(0, 0);
    params.xScale = 1.0;
    params.yScale = 1.0;
    xScaleSlider.value = 1.0;
    yScaleSlider.value = 1.0;
    xScaleValue.textContent = '1.0';
    yScaleValue.textContent = '1.0';
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    renderFractal();
  });

  screenshotBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `fractal-${currentFractalType}-${Date.now()}.png`;
    link.href = renderer.domElement.toDataURL();
    link.click();
  });

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

  // Update button text and renderer size based on fullscreen state
  const updateFullscreenButton = () => {
    if (isFullscreen()) {
      fullscreenBtn.textContent = 'Exit Fullscreen';
    } else {
      fullscreenBtn.textContent = 'View in Fullscreen';
    }
    // Force renderer size update when fullscreen changes
    // Use a small delay to ensure the DOM has updated
    setTimeout(() => {
      updateRendererSize();
      renderFractal();
    }, 100);
  };

  // Listen for fullscreen changes
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
  document.addEventListener('mozfullscreenchange', updateFullscreenButton);
  document.addEventListener('MSFullscreenChange', updateFullscreenButton);

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
  if (!currentFractalModule || !currentFractalModule.render) {
    hideLoadingBar();
    return;
  }

  // Check cache first - if we have a cached frame, use it immediately
  const cached = getCachedFrame();
  if (cached && cached.texture) {
    // Display cached frame
    displayCachedFrame(cached.texture);
    hideLoadingBar();
    return;
  }

  // Cancel any existing progressive render
  if (progressiveRenderTimeout) {
    clearTimeout(progressiveRenderTimeout);
    progressiveRenderTimeout = null;
  }

  targetIterations = params.iterations;
  
  // If we have an existing plane, update it progressively
  if (fractalPlane && fractalPlane.material && fractalPlane.material.uniforms) {
    isProgressiveRendering = true;
    
    // Update pixel ratio based on zoom level
    updatePixelRatio();
    
    // Start with low quality for immediate feedback
    const initialIterations = startIterations || Math.max(20, Math.floor(targetIterations * 0.2));
    currentProgressiveIterations = initialIterations;
    
    // Update all uniforms and render immediately
    fractalPlane.material.uniforms.uIterations.value = currentProgressiveIterations;
    fractalPlane.material.uniforms.uZoom.value = params.zoom;
    fractalPlane.material.uniforms.uOffset.value.set(params.offset.x, params.offset.y);
    fractalPlane.material.uniforms.uXScale.value = params.xScale;
    fractalPlane.material.uniforms.uYScale.value = params.yScale;
    
    // Update resolution in case renderer size changed
    if (fractalPlane.material.uniforms.uResolution) {
      fractalPlane.material.uniforms.uResolution.value.set(
        renderer.domElement.width,
        renderer.domElement.height
      );
    }
    
    if (fractalPlane.material.uniforms.uJuliaC) {
      fractalPlane.material.uniforms.uJuliaC.value.set(params.juliaC.x, params.juliaC.y);
    }
    
    renderer.render(scene, camera);
    
    // Progressively increase quality
    const stepSize = Math.max(10, Math.floor(targetIterations * 0.15));
    const progressiveStep = () => {
      if (currentProgressiveIterations < targetIterations) {
        currentProgressiveIterations = Math.min(
          currentProgressiveIterations + stepSize,
          targetIterations
        );
        fractalPlane.material.uniforms.uIterations.value = currentProgressiveIterations;
        renderer.render(scene, camera);
        
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
    return;
  }
  
  // No existing plane, do full render
  renderFractal();
}

// Zoom into a selection box area
function zoomToSelection(startX, startY, endX, endY, canvasRect) {
  const canvasWidth = canvasRect.width;
  const canvasHeight = canvasRect.height;
  
  // Normalize coordinates to 0-1
  const x1 = Math.min(startX, endX) / canvasWidth;
  const y1 = Math.min(startY, endY) / canvasHeight;
  const x2 = Math.max(startX, endX) / canvasWidth;
  const y2 = Math.max(startY, endY) / canvasHeight;
  
  // Get renderer dimensions for aspect calculation
  const rendererWidth = renderer.domElement.width;
  const rendererHeight = renderer.domElement.height;
  const aspect = rendererWidth / rendererHeight;
  
  // Calculate fractal coordinates for the selection corners
  const scale = 4.0 / params.zoom;
  
  // Top-left corner
  const fractalX1 = (x1 - 0.5) * scale * aspect * params.xScale + params.offset.x;
  const fractalY1 = (y1 - 0.5) * scale * params.yScale + params.offset.y;
  
  // Bottom-right corner
  const fractalX2 = (x2 - 0.5) * scale * aspect * params.xScale + params.offset.x;
  const fractalY2 = (y2 - 0.5) * scale * params.yScale + params.offset.y;
  
  // Calculate center and size of selection in fractal space
  const centerX = (fractalX1 + fractalX2) / 2;
  const centerY = (fractalY1 + fractalY2) / 2;
  const width = Math.abs(fractalX2 - fractalX1);
  const height = Math.abs(fractalY2 - fractalY1);
  
  // Calculate new zoom to fit the selection
  // The selection should fill the viewport
  const selectionAspect = width / height;
  const viewAspect = aspect;
  
  // Calculate zoom factor needed to fit selection
  // We want: 4.0 / newZoom = width (or height adjusted for aspect)
  let newZoom;
  if (selectionAspect > viewAspect) {
    // Selection is wider - fit to width
    newZoom = (4.0 * aspect * params.xScale) / width;
  } else {
    // Selection is taller - fit to height
    newZoom = (4.0 * params.yScale) / height;
  }
  
  // Update parameters
  params.zoom = newZoom;
  params.offset.x = centerX;
  params.offset.y = centerY;
  
  // Render the new view
  renderFractalProgressive();
}

// Display a cached frame
function displayCachedFrame(texture) {
  // Get current container dimensions
  const container = renderer.domElement.parentElement;
  const containerRect = container.getBoundingClientRect();
  const aspect = (containerRect.width || renderer.domElement.width) / 
                 (containerRect.height || renderer.domElement.height);
  const viewSize = 2;
  
  if (!cachedDisplayPlane) {
    // Create a plane for displaying cached textures
    const geometry = new THREE.PlaneGeometry(viewSize * 2 * aspect, viewSize * 2);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    cachedDisplayPlane = new THREE.Mesh(geometry, material);
    cachedDisplayPlane.position.set(0, 0, 0);
  } else {
    // Update existing plane's texture and geometry if aspect changed
    cachedDisplayPlane.material.map = texture;
    cachedDisplayPlane.material.needsUpdate = true;
    
    // Update geometry if aspect ratio changed
    const currentAspect = cachedDisplayPlane.geometry.parameters.width / 
                          cachedDisplayPlane.geometry.parameters.height;
    if (Math.abs(currentAspect - aspect) > 0.01) {
      cachedDisplayPlane.geometry.dispose();
      cachedDisplayPlane.geometry = new THREE.PlaneGeometry(viewSize * 2 * aspect, viewSize * 2);
    }
  }
  
  scene.clear();
  scene.add(cachedDisplayPlane);
  renderer.render(scene, camera);
}

// Cache the current rendered frame
function cacheCurrentFrame() {
  if (!fractalPlane || !renderer) return;
  
  // Create render target to capture the current frame
  const width = renderer.domElement.width;
  const height = renderer.domElement.height;
  
  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });
  
  // Render to texture
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  
  // Store in cache
  cacheFrame(renderTarget.texture, renderTarget);
}

function renderFractal() {
  if (!currentFractalModule) {
    console.warn('No fractal module loaded');
    hideLoadingBar();
    return;
  }

  if (!currentFractalModule.render) {
    console.error('Fractal module missing render function:', currentFractalType);
    hideLoadingBar();
    return;
  }

  // Check cache first
  const cached = getCachedFrame();
  if (cached && cached.texture) {
    displayCachedFrame(cached.texture);
    hideLoadingBar();
    return;
  }

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

  // Clear the scene before rendering
  scene.clear();

  console.log(`Rendering fractal: ${currentFractalType}`);

  // Call the fractal's render function
  fractalPlane = currentFractalModule.render(scene, camera, renderer, params, fractalPlane);

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
    document.getElementById('fps').textContent = `FPS: ${fps}`;
  }

  // Update time for shaders if needed
  if (fractalPlane && fractalPlane.material && fractalPlane.material.uniforms) {
    fractalPlane.material.uniforms.uTime.value = currentTime / 1000;
    renderer.render(scene, camera);
  }
}

// Initialize on load
window.addEventListener('load', init);
