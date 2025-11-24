import { initCanvasRenderer } from './rendering/canvas-renderer.js';
import { getColorSchemeIndex, computeColorForScheme, isJuliaType } from './fractals/utils.js';
import { BenchmarkUI, addBenchmarkButton } from './performance/ui.js';
import { CONFIG } from './core/config.js';
import { FrameCache } from './core/frameCache.js';
import { initLoadingBar, showLoadingBar, hideLoadingBar } from './ui/loading-bar.js';
import { initFPSTracker, startFPSTracking, incrementFrameCount } from './performance/fps-tracker.js';
import { cacheElement } from './core/dom-cache.js';
import { updateCoordinateDisplay as updateCoordDisplay, setupCoordinateCopy } from './ui/coordinate-display.js';
import { updateDebugDisplay, setupDebugCopy } from './ui/debug-display.js';
import { setupShareFractal, loadFractalFromURL } from './sharing/state-manager.js';
import { getWikipediaUrl, getInitialRenderPosition } from './fractals/fractal-config.js';
import { initUILayout } from './ui/panels.js';
import { fractalLoader } from './fractals/loader.js';
import { RenderingEngine } from './rendering/engine.js';
import { setupInputControls, zoomToSelection } from './input/controls.js';
import { setupUIControls } from './ui/controls.js';
import { appState } from './core/app-state.js';

// Application state is now managed by appState module

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

// Import pixel ratio functions for use in rendering
import { updatePixelRatio } from './rendering/pixel-ratio.js';

// Throttled render function - batches multiple render requests
function scheduleRender() {
  const renderingEngine = appState.getRenderingEngine();
  if (renderingEngine) {
    renderingEngine.scheduleRender();
  }
}

// Fractal parameters are now managed by appState module

// Update Wikipedia link based on current fractal type
function updateWikipediaLink() {
  const wikipediaLink = document.getElementById('wikipedia-link');
  const currentFractalType = appState.getCurrentFractalType();
  if (wikipediaLink && currentFractalType) {
    const url = getWikipediaUrl(currentFractalType);
    wikipediaLink.href = url;
  }
}

// Initialize regl
async function init() {
  // Initialize DOM cache first
  initDOMCache();

  // Initialize canvas and regl renderer
  const params = appState.getParams();
  const { canvas: canvasElement, regl: reglContext, updateRendererSize: updateSize } = initCanvasRenderer('fractal-canvas', {
    getZoom: () => appState.getParams().zoom,
    onResize: () => {
      const renderingEngine = appState.getRenderingEngine();
      if (renderingEngine) {
        renderingEngine.renderFractal();
      }
    },
  });

  appState.setCanvas(canvasElement);
  appState.setRegl(reglContext);
  appState.setUpdateRendererSize(updateSize);

  // Initialize rendering engine
  const renderingEngine = new RenderingEngine(
    {
      ...appState.getGetters(),
      getIsLoading: () => fractalLoader.getIsLoading(),
    },
    appState.getSetters(),
    appState.getFrameCache()
  );
  appState.setRenderingEngine(renderingEngine);

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    appState.cleanup();
  });

  // Setup UI controls (after rendering engine is initialized)
  const getters = appState.getGetters();
  const setters = appState.getSetters();
  setupUIControls(
    {
      getParams: getters.getParams,
      getCurrentFractalType: getters.getCurrentFractalType,
      getCurrentFractalModule: getters.getCurrentFractalModule,
      getDrawFractal: getters.getDrawFractal,
      getCachedDrawCommand: getters.getCachedDrawCommand,
      getIsDisplayingCached: getters.getIsDisplayingCached,
      getRegl: getters.getRegl,
      getCanvas: getters.getCanvas,
    },
    {
      setCurrentFractalType: setters.setCurrentFractalType,
      setDrawFractal: setters.setDrawFractal,
      setCachedDrawCommand: setters.setCachedDrawCommand,
      setIsDisplayingCached: setters.setIsDisplayingCached,
    },
    {
      frameCache: appState.getFrameCache(),
      fractalLoader: fractalLoader,
    },
    {
      loadFractal: loadFractal,
      updateWikipediaLink: updateWikipediaLink,
      updateCoordinateDisplay: updateCoordinateDisplay,
      renderFractalProgressive: () => renderingEngine.renderFractalProgressive(),
      renderFractal: () => renderingEngine.renderFractal(),
      getRandomInterestingView: getRandomInterestingView,
      cancelProgressiveRender: () => renderingEngine.cancelProgressiveRender(),
      onFullscreenChange: (isFullscreen) => {
        const updateRendererSize = appState.getUpdateRendererSize();
        if (updateRendererSize) {
          updateRendererSize();
        }
      },
    }
  );
  
  // Setup input controls (after rendering engine is initialized)
  setupInputControls(
    {
      getCanvas: getters.getCanvas,
      getParams: getters.getParams,
      getUpdateRendererSize: getters.getUpdateRendererSize,
    },
    {
      scheduleRender: () => renderingEngine.scheduleRender(),
      updateCoordinateDisplay: updateCoordinateDisplay,
      renderFractalProgressive: () => renderingEngine.renderFractalProgressive(),
      zoomToSelection: (startX, startY, endX, endY, canvasRect) => {
        zoomToSelection(startX, startY, endX, endY, canvasRect,
          { getCanvas: getters.getCanvas, getParams: getters.getParams },
          { renderFractalProgressive: () => renderingEngine.renderFractalProgressive() }
        );
      },
    }
  );
  // Setup UI layout (collapsible sections and panel toggle)
  initUILayout(getters.getUpdateRendererSize);
  // Setup coordinate display with getter functions
  setupCoordinateCopy(getters.getCurrentFractalType, getters.getParams);
  setupDebugCopy(getters.getCurrentFractalType, getters.getParams);
  setupShareFractal(getters.getCurrentFractalType, getters.getParams);
  updateCoordinateDisplay();

  // Initialize benchmark UI
  const benchmarkUI = new BenchmarkUI(
    appState.getRegl(),
    appState.getCanvas(),
    async (fractalType) => {
      await loadFractal(fractalType);
      // Ensure render happens after load
      await new Promise((resolve) => setTimeout(resolve, 50));
    },
    (newParams) => {
      // Update params
      const params = appState.getParams();
      Object.assign(params, newParams);
      // Trigger render
      renderingEngine.renderFractal();
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
    appState.setCurrentFractalType(fractalTypeSelect.value);
  }

  // Initialize Wikipedia link
  updateWikipediaLink();

  // Try to load fractal state from URL first
  const loadedFromURL = await loadFractalFromURL(
    {
      getCurrentFractalType: getters.getCurrentFractalType,
      getCurrentFractalModule: getters.getCurrentFractalModule,
      getParams: getters.getParams,
    },
    {
      setFractalType: setters.setCurrentFractalType,
      loadFractal: loadFractal,
      updateWikipediaLink: updateWikipediaLink,
      updateCoordinateDisplay: updateCoordinateDisplay,
      renderFractal: () => renderingEngine.renderFractal(),
    }
  );

  if (!loadedFromURL) {
    // Load initial fractal if not loaded from URL
    const currentFractalType = appState.getCurrentFractalType();
    loadFractal(currentFractalType).then(() => {
      renderingEngine.renderFractal();
      updateCoordinateDisplay();
      startFPSTracking();
      renderingEngine.startAnimation();
    });
  } else {
    // If loaded from URL, just start animation
    startFPSTracking();
    renderingEngine.startAnimation();
  }
}

// Dynamically load a fractal module
async function loadFractal(fractalType) {
  await fractalLoader.loadFractalWithState(fractalType, {
    setCurrentFractalModule: (module) => { appState.setCurrentFractalModule(module); },
    setCurrentFractalType: (type) => { appState.setCurrentFractalType(type); },
  });
}



// Helper functions for getRandomInterestingView (moved outside setupUI for module access)
function isValidInterestingView(offset, zoom, fractalType) {
  const params = getParams();
  const canvas = getCanvas();
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
  const fractalType = appState.getCurrentFractalType();
  const fractalConfig = appState.getCurrentFractalModule()?.config;
  const params = getParams();

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
      const xScaleAnnounce = document.getElementById('x-scale-announce');
      if (xScaleSlider) {
        xScaleSlider.value = xScale;
        // Note: updateSliderAccessibility is in the UI controls module, so we'll update params directly
        if (xScaleValue) xScaleValue.textContent = xScale.toFixed(1);
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

// Helper functions for getParams and getCanvas (needed by helper functions)
function getParams() {
  return appState.getParams();
}

function getCanvas() {
  return appState.getCanvas();
}

// setupUI function has been moved to ui/controls.js module




// Wrapper function to update both coordinate and debug displays (for backward compatibility)
function updateCoordinateDisplay() {
  const params = appState.getParams();
  const currentFractalType = appState.getCurrentFractalType();
  updateCoordDisplay(params);
  updateDebugDisplay(currentFractalType, params);
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
