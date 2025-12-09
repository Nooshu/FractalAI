/**
 * UI Controls Module
 * Largest and most complex module for managing all UI control interactions
 * Handles fractal type selection, iterations, color schemes, Julia controls,
 * scale sliders, buttons, fullscreen controls, and more
 */

import { getColorSchemeIndex, computeColorForScheme, isJuliaType } from '../fractals/utils.js';
import { CONFIG } from '../core/config.js';
import { getInitialRenderPosition } from '../fractals/fractal-config.js';
import { lifecycleManager } from '../core/lifecycle-manager.js';

/**
 * Setup all UI controls
 * @param {Object} getters - Getter functions for accessing state
 * @param {Function} getters.getParams - Get params object
 * @param {Function} getters.getCurrentFractalType - Get current fractal type
 * @param {Function} getters.getCurrentFractalModule - Get current fractal module
 * @param {Function} getters.getDrawFractal - Get draw fractal function
 * @param {Function} getters.getCachedDrawCommand - Get cached draw command
 * @param {Function} getters.getIsDisplayingCached - Get is displaying cached flag
 * @param {Function} getters.getRegl - Get regl context
 * @param {Function} getters.getCanvas - Get canvas element
 * @param {Object} setters - Setter functions for updating state
 * @param {Function} setters.setCurrentFractalType - Set current fractal type
 * @param {Function} setters.setDrawFractal - Set draw fractal function
 * @param {Function} setters.setCachedDrawCommand - Set cached draw command
 * @param {Function} setters.setIsDisplayingCached - Set is displaying cached flag
 * @param {Object} dependencies - Dependency objects
 * @param {Object} dependencies.frameCache - Frame cache instance
 * @param {Object} dependencies.fractalLoader - Fractal loader instance
 * @param {Object} callbacks - Callback functions for actions
 * @param {Function} callbacks.loadFractal - Load fractal function
 * @param {Function} callbacks.updateWikipediaLink - Update Wikipedia link
 * @param {Function} callbacks.updateCoordinateDisplay - Update coordinate display
 * @param {Function} callbacks.renderFractalProgressive - Render fractal progressively
 * @param {Function} callbacks.renderFractal - Render fractal
 * @param {Function} callbacks.getRandomInterestingView - Deprecated (always returns null)
 * @param {Function} callbacks.cancelWorkerTasks - Cancel pending worker tasks
 * @returns {Object} Object with cleanup function
 */
export function setupUIControls(getters, setters, dependencies, callbacks) {
  const {
    getParams,
    getCurrentFractalType,
    getCurrentFractalModule,
    getDrawFractal,
    getIsDisplayingCached,
    getRegl,
    getCanvas,
    getWebGLCapabilities,
    getFractalParamsUBO,
  } = getters;

  const { setCurrentFractalType, setDrawFractal, setCachedDrawCommand, setIsDisplayingCached } =
    setters;

  const { frameCache, fractalLoader } = dependencies;

  const {
    loadFractal,
    updateWikipediaLink,
    updateCoordinateDisplay,
    renderFractalProgressive,
    renderFractal,
    getRandomInterestingView = () => null, // Deprecated - using ML discovery instead
    cancelProgressiveRender,
    cancelWorkerTasks = () => {}, // Optional callback to cancel worker tasks
    resetPredictiveRendering = () => {}, // Optional callback to reset predictive rendering
  } = callbacks;

  // Get DOM elements
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
  const exportResolutionRadios = document.querySelectorAll('input[name="export-resolution"]');

  // Check URL parameter for auto-render setting
  const urlParams = new URLSearchParams(window.location.search);
  const autoFromURL = urlParams.get('auto') === 'true';
  if (autoFromURL && autoRenderCheckbox) {
    autoRenderCheckbox.checked = true;
  }

  // Random view functionality removed - using ML discovery instead

  // Auto-render functionality
  // Initialize from checkbox state (which may have been set from URL parameter)
  let autoRenderEnabled = autoRenderCheckbox ? autoRenderCheckbox.checked : false;

  // Throttled render function for slider updates with batching
  // Updates UI immediately but batches render calls to reduce unnecessary renders
  // Multiple control changes within the same frame are batched into a single render
  let renderTimeoutId = null;
  let pendingRender = false;

  const triggerAutoRender = () => {
    if (autoRenderEnabled) {
      // Mark that we have pending changes
      pendingRender = true;

      // Cancel any pending render
      if (renderTimeoutId !== null) {
        cancelAnimationFrame(renderTimeoutId);
      }

      // Schedule render for next animation frame (~16ms at 60fps)
      // This batches multiple rapid control changes into a single render
      renderTimeoutId = requestAnimationFrame(() => {
        if (pendingRender) {
          renderFractalProgressive();
          pendingRender = false;
        }
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

  // If auto-render was enabled from URL parameter, update button state and trigger initial render
  if (autoFromURL && autoRenderEnabled) {
    updateFractalBtn.disabled = true;
    // Don't trigger render here - it will be triggered when the fractal loads
  }

  // Initialize Julia controls state based on current fractal type
  const params = getParams();
  const currentFractalType = getCurrentFractalType();
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
        classic: 'Classic',
        fire: 'Fire',
        ocean: 'Ocean',
        rainbow: 'Rainbow',
        'rainbow-pastel': 'Rainbow Pastel',
        'rainbow-dark': 'Rainbow Dark',
        'rainbow-vibrant': 'Rainbow Vibrant',
        'rainbow-double': 'Rainbow Double',
        'rainbow-shifted': 'Rainbow Shifted',
        monochrome: 'Monochrome',
        forest: 'Forest',
        sunset: 'Sunset',
        purple: 'Purple',
        cyan: 'Cyan',
        gold: 'Gold',
        ice: 'Ice',
        neon: 'Neon',
        cosmic: 'Cosmic',
        aurora: 'Aurora',
        coral: 'Coral',
        autumn: 'Autumn',
        midnight: 'Midnight',
        emerald: 'Emerald',
        rosegold: 'Rose Gold',
        electric: 'Electric',
        vintage: 'Vintage',
        tropical: 'Tropical',
        galaxy: 'Galaxy',
        lava: 'Lava',
        arctic: 'Arctic',
        sakura: 'Sakura',
        volcanic: 'Volcanic',
        mint: 'Mint',
        sunrise: 'Sunrise',
        steel: 'Steel',
        prism: 'Prism',
        mystic: 'Mystic',
        amber: 'Amber',
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
    // Pre-allocate reusable color array to avoid allocations
    const colorOut = new Float32Array(3);
    for (let i = 0; i < numColors; i++) {
      const t = i / (numColors - 1);

      // Use the same color computation function as utils.js
      const color = computeColorForScheme(t, schemeIndex, colorOut);

      // Draw the color swatch
      ctx.fillStyle = `rgb(${Math.floor(color[0] * 255)}, ${Math.floor(color[1] * 255)}, ${Math.floor(color[2] * 255)})`;
      ctx.fillRect(i * swatchWidth, 0, swatchWidth, height);
    }
  };

  fractalTypeSelect.addEventListener('change', async (e) => {
    const newFractalType = e.target.value;

    // Start new lifecycle session
    lifecycleManager.startSession('fractal-change', newFractalType);

    setCurrentFractalType(newFractalType);
    updateWikipediaLink();
    updateCoordinateDisplay();

    // Reset random view counter when fractal type changes
    // Random view counter removed

    // Cancel any pending worker tasks when fractal type changes
    cancelWorkerTasks();

    // Clear previous fractal draw command
    setDrawFractal(null);
    setCachedDrawCommand(null);
    setIsDisplayingCached(false);

    // Clear the cache for this fractal type to force a fresh load
    fractalLoader.removeFromCache(newFractalType);

    // Clear frame cache when fractal type changes (lifecycle manager handles this, but explicit for clarity)
    frameCache.clear();

    // Reset predictive rendering when fractal type changes
    resetPredictiveRendering();

    // Load the new fractal module
    try {
      await loadFractal(newFractalType);
    } catch (error) {
      console.error('Failed to load fractal on change:', error);
      return;
    }

    const currentFractalModule = getCurrentFractalModule();
    const params = getParams();

    // Enable/disable Julia controls based on fractal type
    const isJulia = isJuliaType(newFractalType);
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
      initialPosition = getInitialRenderPosition(newFractalType);
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
        const fullscreenIterationsNumberEl = document.getElementById(
          'fullscreen-iterations-number'
        );
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
        setDrawFractal(null);
        setCachedDrawCommand(null);
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
          updateSliderAccessibility(
            xScaleSlider,
            xScaleValue,
            xScaleAnnounce,
            settings.xScale,
            'X Axis',
            false
          );
        }
        if (xScaleValue) xScaleValue.textContent = settings.xScale.toString();
      }

      // Apply yScale if specified
      if (settings.yScale !== undefined) {
        params.yScale = settings.yScale;
        if (yScaleSlider) {
          yScaleSlider.value = settings.yScale;
          updateSliderAccessibility(
            yScaleSlider,
            yScaleValue,
            yScaleAnnounce,
            settings.yScale,
            'Y Axis',
            false
          );
        }
        if (yScaleValue) yScaleValue.textContent = settings.yScale.toString();
      }
    }

    // Handle fractal-specific settings (all the if/else blocks)
    // These are mostly comments now as settings come from config
    // Keeping structure for potential future overrides
    const fractalType = newFractalType;
    if (fractalType === 'burning-ship') {
      // Burning Ship - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'tricorn') {
      // Tricorn - similar view to Mandelbrot but inverted (position set by getInitialRenderPosition)
    } else if (fractalType === 'celtic-mandelbrot') {
      // Celtic Mandelbrot - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'mutant-mandelbrot') {
      // Mutant Mandelbrot - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'phoenix-mandelbrot') {
      // Phoenix Mandelbrot - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'buffalo') {
      // Buffalo - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'popcorn') {
      // Popcorn fractal - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'rose') {
      // Rose window fractal - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'julia-snakes') {
      // Julia Snakes - settings come from config
    } else if (fractalType === 'binary-dragon') {
      // Binary Dragon - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'dragon-lsystem') {
      // Dragon L-System - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'folded-paper-dragon') {
      // Folded Paper Dragon - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'heighway-dragon') {
      // Heighway Dragon - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'terdragon') {
      // Terdragon - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'twindragon') {
      // Twindragon - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'gosper-curve') {
      // Gosper Curve - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'hilbert-curve') {
      // Hilbert Curve - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'sierpinski-curve') {
      // Sierpiński Curve - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'levy-c-curve') {
      // Levy C-Curve - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'moore-curve') {
      // Moore Curve - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'peano-curve') {
      // Peano Curve - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'newton') {
      // Newton Fractal - settings come from config
    } else if (fractalType === 'nova') {
      // Nova Fractal - settings come from config
    } else if (fractalType === 'halley') {
      // Halley Fractal - settings come from config
    } else if (fractalType === 'plant') {
      // Plant - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'barnsley-fern') {
      // Barnsley Fern - settings come from config
    } else if (fractalType === 'multibrot') {
      // Multibrot Set - settings come from config
    } else if (fractalType === 'multibrot-julia') {
      // Multibrot Julia Set - settings come from config
    } else if (fractalType === 'burning-ship-julia') {
      // Burning Ship Julia Set - settings come from config
    } else if (fractalType === 'tricorn-julia') {
      // Tricorn Julia Set - settings come from config
    } else if (fractalType === 'phoenix-julia') {
      // Phoenix Julia Set - settings come from config
    } else if (fractalType === 'lambda-julia') {
      // Lambda Julia Set - settings come from config
    } else if (fractalType === 'hybrid-julia') {
      // Hybrid Julia Set - settings come from config
    } else if (fractalType === 'magnet') {
      // Magnet Fractal - settings come from config
    } else if (fractalType === 'amman-tiling') {
      // Amman Tiling - settings come from config
    } else if (fractalType === 'chair-tiling') {
      // Chair Tiling - settings come from config
    } else if (fractalType === 'snowflake-tiling') {
      // Snowflake Tiling - settings come from config
    } else if (fractalType === 'domino-substitution') {
      // Domino Substitution - settings come from config
    } else if (fractalType === 'pinwheel-tiling') {
      // Pinwheel Tiling - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'carpenter-square') {
      // Carpenter Square - settings come from config
    } else if (fractalType === 'diffusion-limited-aggregation') {
      // Diffusion Limited Aggregation - settings come from config
    } else if (fractalType === 'levy-flights') {
      // Lévy Flights - settings come from config
    } else if (fractalType === 'sierpinski') {
      // Sierpinski Triangle - settings come from config
    } else if (fractalType === 'sierpinski-arrowhead') {
      // Sierpinski Arrowhead - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'sierpinski-carpet') {
      // Sierpinski Carpet - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'sierpinski-gasket') {
      // Sierpinski Gasket - settings come from config
    } else if (fractalType === 'sierpinski-hexagon') {
      // Sierpinski Hexagon - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'sierpinski-lsystem') {
      // Sierpinski L-System - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'sierpinski-pentagon') {
      // Sierpinski Pentagon - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'quadrilateral-subdivision') {
      // Quadrilateral Subdivision - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'recursive-polygon-splitting') {
      // Recursive Polygon Splitting - settings come from config
    } else if (fractalType === 'triangular-subdivision') {
      // Triangular Subdivision - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'fractal-islands') {
      // Fractal Islands - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'koch') {
      // Koch Curve - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'quadratic-koch') {
      // Quadratic Koch Curve - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'cantor') {
      // Cantor Set - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'cantor-dust-base-expansion') {
      // Cantor Dust Base Expansion - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'cantor-dust-circular') {
      // Cantor Dust Circular - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'fat-cantor') {
      // Fat Cantor Set - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'smith-volterra-cantor') {
      // Smith-Volterra-Cantor Set - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'random-cantor') {
      // Random Cantor Set - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'apollonian-gasket') {
      // Apollonian Gasket - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'h-tree') {
      // H-Tree - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'h-tree-generalized') {
      // H-Tree Generalized - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'vicsek') {
      // Vicsek - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'cross') {
      // Cross - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'fractal-flame') {
      // Fractal Flame - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'recursive-circle-removal') {
      // Recursive Circle Removal - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'box-variants') {
      // Box Variants - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'minkowski-sausage') {
      // Minkowski Sausage - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'penrose-substitution') {
      // Penrose Substitution - settings come from config
    } else if (fractalType === 'rauzy') {
      // Rauzy - settings come from config
    } else if (fractalType === 'spider-set') {
      // Spider Set - additional settings (position set by getInitialRenderPosition)
    } else if (fractalType === 'cesaro') {
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
      const regl = getRegl();
      const canvas = getCanvas();
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
    const params = getParams();
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
    const params = getParams();
    params.colorScheme = e.target.value;
    // Update color scheme index for fullscreen cycling
    const newIndex = colorSchemes.indexOf(params.colorScheme);
    if (newIndex !== -1) {
      currentColorSchemeIndex = newIndex;
    }
    // Update palette preview when color scheme changes from main UI
    updateColorPalettePreview();
    // Update coordinate and debug displays to reflect new color scheme
    updateCoordinateDisplay();
    triggerAutoRender();
  });

  juliaCReal.addEventListener('input', (e) => {
    const params = getParams();
    params.juliaC.x = parseFloat(e.target.value);
    // Update UI immediately for responsiveness
    juliaCRealValue.textContent = params.juliaC.x.toFixed(4);
    // Throttled render
    triggerAutoRender();
  });

  juliaCImag.addEventListener('input', (e) => {
    const params = getParams();
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
  function updateSliderAccessibility(
    slider,
    valueElement,
    announceElement,
    value,
    label,
    announce = true
  ) {
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
    const params = getParams();
    const value = parseFloat(e.target.value);
    params.xScale = value;
    // Update UI immediately for responsiveness
    updateSliderAccessibility(xScaleSlider, xScaleValue, xScaleAnnounce, value, 'X Axis');
    // Throttled render
    triggerAutoRender();
  });

  yScaleSlider.addEventListener('input', (e) => {
    const params = getParams();
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
    const currentFractalType = getCurrentFractalType();
    // Always ensure the correct fractal module is loaded for the current type
    try {
      await loadFractal(currentFractalType);
    } catch (error) {
      console.error('Failed to load fractal on update:', error);
      return;
    }

    const currentFractalModule = getCurrentFractalModule();
    // Verify the loaded module matches the current fractal type
    if (!currentFractalModule || !currentFractalModule.render) {
      console.error('Fractal module not properly loaded:', currentFractalType);
      return;
    }

    // Reset draw command to force recreation with new settings
    setDrawFractal(null);
    setCachedDrawCommand(null);
    setIsDisplayingCached(false);

    // Clear the canvas before rendering new fractal
    const regl = getRegl();
    const canvas = getCanvas();
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
    const currentFractalModule = getCurrentFractalModule();
    const params = getParams();
    const currentFractalType = getCurrentFractalType();
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
          updateSliderAccessibility(
            xScaleSlider,
            xScaleValue,
            xScaleAnnounce,
            settings.xScale,
            'X Axis',
            false
          );
        }
      } else {
        params.xScale = 1.0;
        if (xScaleSlider) {
          xScaleSlider.value = 1.0;
          updateSliderAccessibility(
            xScaleSlider,
            xScaleValue,
            xScaleAnnounce,
            1.0,
            'X Axis',
            false
          );
        }
      }

      // Reset yScale from config or default to 1.0
      if (settings.yScale !== undefined) {
        params.yScale = settings.yScale;
        if (yScaleSlider) {
          yScaleSlider.value = settings.yScale;
          updateSliderAccessibility(
            yScaleSlider,
            yScaleValue,
            yScaleAnnounce,
            settings.yScale,
            'Y Axis',
            false
          );
        }
      } else {
        params.yScale = 1.0;
        if (yScaleSlider) {
          yScaleSlider.value = 1.0;
          updateSliderAccessibility(
            yScaleSlider,
            yScaleValue,
            yScaleAnnounce,
            1.0,
            'Y Axis',
            false
          );
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
        const fullscreenIterationsNumberEl = document.getElementById(
          'fullscreen-iterations-number'
        );
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
  const captureScreenshot = async (event) => {
    const canvas = getCanvas();
    
    // IMPORTANT: Save original canvas dimensions FIRST, before any other operations
    // This ensures we capture the actual viewing dimensions, not fullscreen dimensions
    const originalWidth = canvas.width;
    const originalHeight = canvas.height;
    const originalStyleWidth = canvas.style.width;
    const originalStyleHeight = canvas.style.height;
    
    console.log('[Screenshot] Original canvas dimensions:', originalWidth, 'x', originalHeight);
    
    const drawFractal = getDrawFractal();
    const currentFractalType = getCurrentFractalType();
    const regl = getRegl();
    const currentFractalModule = getCurrentFractalModule();
    const params = getParams();

    // Determine which button was clicked (regular or fullscreen)
    const button = event?.target?.closest('button') || screenshotBtn;
    const originalHTML = button.innerHTML;

    // Show visual feedback that screenshot is being captured
    button.innerHTML = '<span>Capturing...</span>';
    button.disabled = true;

    try {
      let exportCanvas = canvas;
      let needsCleanup = false;

      // If high-resolution export is selected, temporarily resize main canvas
      if (exportResolution === '4k') {
        // Calculate aspect ratio from current canvas to maintain fractal proportions
        const currentAspectRatio = originalWidth / originalHeight;
        
        // 4K: aim for ~8 megapixels (3840×2160 = 8.3MP)
        // Use 3840 as base width and calculate height to maintain aspect ratio
        const targetWidth = 3840;
        const targetHeight = Math.round(targetWidth / currentAspectRatio);

        // Check WebGL max viewport dimensions
        const maxViewportDims = regl._gl.getParameter(regl._gl.MAX_VIEWPORT_DIMS);
        console.log('[High-Res Export] WebGL max viewport:', maxViewportDims[0], 'x', maxViewportDims[1]);
        
        // Clamp dimensions to WebGL limits
        let finalTargetWidth = targetWidth;
        let finalTargetHeight = targetHeight;
        if (finalTargetWidth > maxViewportDims[0] || finalTargetHeight > maxViewportDims[1]) {
          const scale = Math.min(maxViewportDims[0] / finalTargetWidth, maxViewportDims[1] / finalTargetHeight);
          finalTargetWidth = Math.floor(finalTargetWidth * scale);
          finalTargetHeight = Math.floor(finalTargetHeight * scale);
          console.warn(`[High-Res Export] Dimensions clamped to WebGL limits: ${finalTargetWidth}x${finalTargetHeight}`);
        }
        
        console.log(`[High-Res Export] Rendering ${exportResolution.toUpperCase()} at ${finalTargetWidth}x${finalTargetHeight} (aspect ratio: ${currentAspectRatio.toFixed(3)})`);
        
        try {
          console.log('[High-Res Export] Forcing fractal reload at high resolution');
          
          // Temporarily resize the canvas internal dimensions
          // Don't change CSS style to avoid triggering device pixel ratio calculations
          canvas.width = finalTargetWidth;
          canvas.height = finalTargetHeight;
          
          console.log('[High-Res Export] Canvas resized to:', canvas.width, 'x', canvas.height);
          console.log('[High-Res Export] Canvas style (unchanged):', canvas.style.width, 'x', canvas.style.height);
          
          // Manually set the WebGL viewport to match canvas internal dimensions
          // (Don't use regl.poll() as it applies device pixel ratio to CSS dimensions)
          regl._gl.viewport(0, 0, finalTargetWidth, finalTargetHeight);
          
          const viewportCheck = regl._gl.getParameter(regl._gl.VIEWPORT);
          console.log('[High-Res Export] WebGL viewport manually set to:', viewportCheck[0], viewportCheck[1], viewportCheck[2], viewportCheck[3]);
          
          // DON'T reload the fractal - instead, create a NEW draw command directly
          const fractalModule = getCurrentFractalModule();
          const webglCapabilities = getWebGLCapabilities?.() || null;
          const ubo = getFractalParamsUBO?.() || null;
          
          console.log('[High-Res Export] Creating fresh draw command with resized canvas...');
          
          let highResDrawFractal;
          if (fractalModule.render.length >= 4 || (webglCapabilities?.isWebGL2 && ubo)) {
            highResDrawFractal = fractalModule.render(regl, params, canvas, {
              webglCapabilities,
              ubo,
            });
          } else {
            highResDrawFractal = fractalModule.render(regl, params, canvas);
          }
          
          console.log('[High-Res Export] Draw command created, canvas is:', canvas.width, 'x', canvas.height);
          
          const viewportBefore = regl._gl.getParameter(regl._gl.VIEWPORT);
          console.log('[High-Res Export] Canvas before render:', canvas.width, 'x', canvas.height);
          console.log('[High-Res Export] Viewport before render:', viewportBefore[0], viewportBefore[1], viewportBefore[2], viewportBefore[3]);
          console.log('[High-Res Export] Draw function available:', !!highResDrawFractal);
          
          if (highResDrawFractal) {
            // Render directly without using the rendering engine
            regl.clear({
              color: [0, 0, 0, 1],
              depth: 1,
            });
            
            // Force viewport one more time and wrap draw in explicit viewport context
            const gl = regl._gl;
            gl.viewport(0, 0, finalTargetWidth, finalTargetHeight);
            
            // Execute draw with explicit viewport override
            regl({
              viewport: { x: 0, y: 0, width: finalTargetWidth, height: finalTargetHeight }
            })(() => {
              highResDrawFractal();
            });
            
            // Verify viewport is still correct after draw
            const viewportAfterDraw = gl.getParameter(gl.VIEWPORT);
            console.log('[High-Res Export] Viewport immediately after draw:', viewportAfterDraw[0], viewportAfterDraw[1], viewportAfterDraw[2], viewportAfterDraw[3]);
            
            // Sample edge pixels to verify rendering at full resolution
            const bottomRightPixel = new Uint8Array(4);
            const centerPixel = new Uint8Array(4);
            const topLeftPixel = new Uint8Array(4);
            gl.readPixels(finalTargetWidth - 10, finalTargetHeight - 10, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bottomRightPixel);
            gl.readPixels(Math.floor(finalTargetWidth / 2), Math.floor(finalTargetHeight / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, centerPixel);
            gl.readPixels(10, 10, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, topLeftPixel);
            
            const viewportAfter = gl.getParameter(gl.VIEWPORT);
            console.log('[High-Res Export] Direct render complete');
            console.log('[High-Res Export] Canvas after render:', canvas.width, 'x', canvas.height);
            console.log('[High-Res Export] Viewport after render:', viewportAfter[0], viewportAfter[1], viewportAfter[2], viewportAfter[3]);
            console.log('[High-Res Export] Top-left pixel (10,10):', topLeftPixel[0], topLeftPixel[1], topLeftPixel[2], topLeftPixel[3]);
            console.log('[High-Res Export] Center pixel:', centerPixel[0], centerPixel[1], centerPixel[2], centerPixel[3]);
            console.log('[High-Res Export] Bottom-right pixel (near edge):', bottomRightPixel[0], bottomRightPixel[1], bottomRightPixel[2], bottomRightPixel[3]);
          }
          
          console.log('[High-Res Export] High-res render complete');

          // Wait for rendering to complete
          await new Promise((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (regl._gl) {
                  regl._gl.finish();
                }
                console.log('[High-Res Export] Rendering complete');
                resolve();
              });
            });
          });

          // Copy WebGL canvas to a 2D canvas using drawImage
          // This is more reliable than readPixels or toBlob on WebGL canvas
          const exportCanvas2D = document.createElement('canvas');
          exportCanvas2D.width = canvas.width; // Use actual canvas dimensions
          exportCanvas2D.height = canvas.height;
          const ctx = exportCanvas2D.getContext('2d');
          
          if (ctx) {
            // Draw the WebGL canvas onto the 2D canvas at exact dimensions
            ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
            
            console.log('[High-Res Export] Canvas dimensions match:', canvas.width === exportCanvas2D.width && canvas.height === exportCanvas2D.height);
            
            exportCanvas = exportCanvas2D;
            console.log('[High-Res Export] Canvas copied via drawImage');
          } else {
            exportCanvas = canvas;
            console.log('[High-Res Export] Using WebGL canvas directly');
          }
          
          console.log('[High-Res Export] Canvas ready for export at', exportCanvas.width, 'x', exportCanvas.height);
        } catch (error) {
          console.error('[High-Res Export] Error:', error);
          alert('Failed to render high-resolution image. Please try again.');
          button.innerHTML = originalHTML;
          button.disabled = false;
          
          // Restore canvas dimensions (both internal and style if it changed)
          canvas.width = originalWidth;
          canvas.height = originalHeight;
          // Style dimensions shouldn't have changed, but restore them anyway for safety
          if (canvas.style.width !== originalStyleWidth) {
            canvas.style.width = originalStyleWidth;
          }
          if (canvas.style.height !== originalStyleHeight) {
            canvas.style.height = originalStyleHeight;
          }
          
          // Reload fractal and re-render
          await callbacks.loadFractal(currentFractalType);
          const renderingEngine = callbacks.getRenderingEngine?.();
          if (renderingEngine) {
            await renderingEngine.renderFractal();
          }
          return;
        }

        needsCleanup = false; // No temp canvas to clean up
        
        // DON'T restore canvas size yet - we need to export first!
      } else {
        // Default resolution - ensure we render before capturing
        if (drawFractal) {
          drawFractal();
        }

        // Wait a frame to ensure rendering is complete
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }

      // Check if canvas has content
      if (exportCanvas.width === 0 || exportCanvas.height === 0) {
        console.error('Canvas has no dimensions, cannot capture screenshot');
        button.innerHTML = originalHTML;
        button.disabled = false;
        return;
      }

      // Use toBlob() instead of toDataURL() - non-blocking and more efficient
      // This runs asynchronously without blocking the main thread
      exportCanvas.toBlob(
        async (blob) => {
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
          const resolutionSuffix = exportResolution !== 'default' ? `-${exportResolution.toUpperCase()}` : '';
          link.download = `fractal-${currentFractalType}${resolutionSuffix}-${Date.now()}.png`;
          link.href = url;

          // Trigger download
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Clean up object URL after a short delay
          setTimeout(() => URL.revokeObjectURL(url), 1000);

          // AFTER export is complete, restore canvas size for high-res exports
          if (exportResolution === '4k') {
            // Restore canvas dimensions
            canvas.width = originalWidth;
            canvas.height = originalHeight;
            canvas.style.width = originalStyleWidth;
            canvas.style.height = originalStyleHeight;
            
            console.log('[High-Res Export] Canvas restored to original size after export');
            
            // Reload fractal at original size to recreate draw command with correct dimensions
            await callbacks.loadFractal(currentFractalType);
            
            // Re-render at original size to restore display
            const renderingEngine = callbacks.getRenderingEngine?.();
            if (renderingEngine) {
              await renderingEngine.renderFractal();
            }
            
            console.log('[High-Res Export] Display restored');
          }
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
  };

  screenshotBtn.addEventListener('click', captureScreenshot);

  // Video export functionality (only if feature flag is enabled)
  const videoExportBtn = document.getElementById('video-export');
  if (videoExportBtn) {
    // Hide button by default, show only if feature flag is enabled
    if (CONFIG.features.webCodecs) {
      videoExportBtn.style.display = '';
      
      const exportVideo = async () => {

      // Check if video recording is available (WebCodecs or MediaRecorder)
      const { isMediaRecorderAvailable, isWebCodecsAvailable } = await import('../export/video-encoder.js');
      if (!isMediaRecorderAvailable() && !isWebCodecsAvailable()) {
        alert('Video export is not available in this browser.\n\nRequires MediaRecorder API (Chrome 47+, Firefox 25+, Safari 14.1+, Edge 79+) or WebCodecs API (Chrome 94+, Edge 94+, Firefox 130+).');
        return;
      }

      // Prompt for video duration
      const durationInput = prompt('Enter video duration in seconds (1-30):', '5');
      if (!durationInput) {
        return; // User cancelled
      }

      const duration = parseFloat(durationInput);
      if (isNaN(duration) || duration < 1 || duration > 30) {
        alert('Please enter a valid duration between 1 and 30 seconds.');
        return;
      }

      const canvas = getCanvas();
      const currentFractalType = getCurrentFractalType();
      const renderingEngine = callbacks.getRenderingEngine?.();

      if (!canvas || !renderingEngine) {
        alert('Canvas or rendering engine not available.');
        return;
      }

      // Disable button and show progress
      const originalHTML = videoExportBtn.innerHTML;
      videoExportBtn.innerHTML = '<span>Recording...</span>';
      videoExportBtn.disabled = true;

      try {
        const { recordFractalVideo, downloadVideo } = await import('../export/video-encoder.js');

        // Record video
        const blob = await recordFractalVideo(canvas, {
          duration: duration,
          fps: 60,
          onFrame: async (_canvas, _frameNumber) => {
            // Re-render fractal for each frame
            // In a real animation, you might want to change parameters over time
            renderingEngine.renderFractal();
            
            // Wait for render to complete
            await new Promise((resolve) => {
              requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
              });
            });
          },
          onProgress: (frameCount, totalFrames) => {
            const progress = Math.round((frameCount / totalFrames) * 100);
            videoExportBtn.innerHTML = `<span>Recording... ${progress}%</span>`;
          },
        });

        // Download video
        const filename = `fractal-${currentFractalType}-${Date.now()}.webm`;
        downloadVideo(blob, filename);

        // Re-enable button
        videoExportBtn.innerHTML = originalHTML;
        videoExportBtn.disabled = false;
      } catch (error) {
        console.error('Error exporting video:', error);
        alert(`Failed to export video: ${error.message}`);
        videoExportBtn.innerHTML = originalHTML;
        videoExportBtn.disabled = false;
      }
    };

      videoExportBtn.addEventListener('click', exportVideo);
    } else {
      // Feature flag is disabled - hide button
      videoExportBtn.style.display = 'none';
    }
  }

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
  const fullscreenScreenshotBtn = document.getElementById('fullscreen-screenshot');
  const fullscreenColorCycleBtn = document.getElementById('fullscreen-color-cycle');
  // Random view button removed - using Surprise Me instead

  // Resolution export state
  let exportResolution = 'default'; // 'default' or '4k'

  // Function to update the badge on fullscreen screenshot button
  function updateResolutionBadge() {
    // Remove existing badge if any
    const existingBadge = fullscreenScreenshotBtn.querySelector('.fullscreen-resolution-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    // Add badge if 4K is selected
    if (exportResolution === '4k') {
      const badge = document.createElement('span');
      badge.className = 'fullscreen-resolution-badge';
      badge.textContent = exportResolution.toUpperCase();
      fullscreenScreenshotBtn.appendChild(badge);
    }
  }

  // Handle resolution radio button changes
  if (exportResolutionRadios.length > 0) {
    // Load saved preference from localStorage
    const savedResolution = localStorage.getItem('export-resolution');
    if (savedResolution) {
      const radio = document.getElementById(`export-resolution-${savedResolution}`);
      if (radio) {
        radio.checked = true;
        exportResolution = savedResolution;
      }
    }

    // Update badge on initial load
    updateResolutionBadge();

    // Listen for changes
    exportResolutionRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          exportResolution = e.target.value;
          localStorage.setItem('export-resolution', exportResolution);
          updateResolutionBadge();
        }
      });
    });
  }

  // Random view functionality removed - using ML discovery instead

  // Iterations controls - cache DOM references
  const fullscreenIterationsUpBtn = document.getElementById('fullscreen-iterations-up');
  const fullscreenIterationsDownBtn = document.getElementById('fullscreen-iterations-down');
  const fullscreenIterationsNumberEl = document.getElementById('fullscreen-iterations-number');
  const iterationsSliderEl = document.getElementById('iterations');
  const iterationsValueEl = document.getElementById('iterations-value');

  // Shared function to update iterations (avoids code duplication)
  const updateIterations = (delta) => {
    const params = getParams();
    // Update iterations with delta, clamped to valid range
    params.iterations = Math.max(10, Math.min(400, params.iterations + delta));

    // Update UI sliders
    if (iterationsSliderEl) {
      iterationsSliderEl.value = params.iterations;
    }
    if (iterationsValueEl) {
      iterationsValueEl.textContent = params.iterations;
    }
    if (fullscreenIterationsNumberEl) {
      fullscreenIterationsNumberEl.textContent = params.iterations;
    }

    // Trigger render
    triggerAutoRender();
  };

  fullscreenIterationsUpBtn.addEventListener('click', () => updateIterations(5));
  fullscreenIterationsDownBtn.addEventListener('click', () => updateIterations(-5));

  // Shared function to cycle to next color scheme (sequential)
  const cycleToNextColorScheme = async () => {
    const params = getParams();
    // Cycle to next color scheme
    currentColorSchemeIndex = (currentColorSchemeIndex + 1) % colorSchemes.length;
    params.colorScheme = colorSchemes[currentColorSchemeIndex];

    // Update dropdown to match
    if (colorSchemeSelect) {
      colorSchemeSelect.value = params.colorScheme;
    }

    // Update palette preview
    updateColorPalettePreview();

    // Update coordinate and debug display
    updateCoordinateDisplay();

    // Clear draw command to force regeneration with new palette
    setDrawFractal(null);
    setCachedDrawCommand(null);

    // Render with new color scheme
    renderFractalProgressive();
  };

  // Function to randomly select a color scheme (ensuring no consecutive duplicates)
  const selectRandomColorScheme = async () => {
    const params = getParams();
    const currentScheme = params.colorScheme;
    
    // Get available schemes (exclude current one to avoid duplicates)
    const availableSchemes = colorSchemes.filter(scheme => scheme !== currentScheme);
    
    // Randomly select from available schemes
    const randomIndex = Math.floor(Math.random() * availableSchemes.length);
    const newScheme = availableSchemes[randomIndex];
    
    // Update the scheme
    params.colorScheme = newScheme;
    currentColorSchemeIndex = colorSchemes.indexOf(newScheme);

    // Update dropdown to match
    if (colorSchemeSelect) {
      colorSchemeSelect.value = params.colorScheme;
    }

    // Update palette preview
    updateColorPalettePreview();

    // Update coordinate and debug display
    updateCoordinateDisplay();

    // Clear draw command to force regeneration with new palette
    setDrawFractal(null);
    setCachedDrawCommand(null);

    // Render with new color scheme
    renderFractalProgressive();
  };

  // Color scheme cycling for fullscreen controls (sequential)
  fullscreenColorCycleBtn.addEventListener('click', cycleToNextColorScheme);

  // Auto-cycle color schemes functionality
  const fullscreenAutoCycleBtn = document.getElementById('fullscreen-auto-cycle');
  const autoCyclePlayIcon = document.getElementById('fullscreen-auto-cycle-play');
  const autoCyclePauseIcon = document.getElementById('fullscreen-auto-cycle-pause');
  let autoCycleInterval = null;
  const AUTO_CYCLE_INTERVAL = 2000; // 2 seconds between cycles

  const startAutoCycle = () => {
    if (autoCycleInterval) return; // Already running
    
    autoCycleInterval = setInterval(() => {
      if (isFullscreen()) {
        selectRandomColorScheme();
      } else {
        stopAutoCycle();
      }
    }, AUTO_CYCLE_INTERVAL);

    // Update button appearance
    if (autoCyclePlayIcon) autoCyclePlayIcon.style.display = 'none';
    if (autoCyclePauseIcon) autoCyclePauseIcon.style.display = 'block';
    if (fullscreenAutoCycleBtn) {
      fullscreenAutoCycleBtn.title = 'Pause Auto Cycle';
    }
  };

  const stopAutoCycle = () => {
    if (autoCycleInterval) {
      clearInterval(autoCycleInterval);
      autoCycleInterval = null;
    }

    // Update button appearance
    if (autoCyclePlayIcon) autoCyclePlayIcon.style.display = 'block';
    if (autoCyclePauseIcon) autoCyclePauseIcon.style.display = 'none';
    if (fullscreenAutoCycleBtn) {
      fullscreenAutoCycleBtn.title = 'Auto Cycle Color Schemes';
    }
  };

  // Toggle auto-cycle on button click
  if (fullscreenAutoCycleBtn) {
    fullscreenAutoCycleBtn.addEventListener('click', () => {
      if (autoCycleInterval) {
        stopAutoCycle();
      } else {
        startAutoCycle();
      }
    });
  }

  fullscreenScreenshotBtn.addEventListener('click', captureScreenshot);

  // Fullscreen change handlers
  const fullscreenChangeHandlers = [];

  // Helper to add fullscreen change listeners
  const addFullscreenChangeListener = (event, handler) => {
    document.addEventListener(event, handler);
    fullscreenChangeHandlers.push({ event, handler });
  };

  // Fullscreen UI auto-hide functionality
  const fullscreenControls = document.getElementById('fullscreen-controls');
  let fadeTimeout = null;
  const FADE_DELAY = 3000; // 3 seconds

  const handleFullscreenUI = (isFullscreenMode) => {
    if (isFullscreenMode) {
      // Reset UI to visible when entering fullscreen
      if (fullscreenControls) {
        fullscreenControls.classList.remove('faded');
      }
      // Start fade timer
      startFadeTimer();
    } else {
      // Clear timer when exiting fullscreen
      clearFadeTimer();
      // Stop auto-cycle when exiting fullscreen
      stopAutoCycle();
      // Make sure UI is visible when not in fullscreen
      if (fullscreenControls) {
        fullscreenControls.classList.remove('faded');
      }
    }
  };

  const startFadeTimer = () => {
    clearFadeTimer();
    if (!isFullscreen() || !fullscreenControls) return;
    
    fadeTimeout = setTimeout(() => {
      if (isFullscreen() && fullscreenControls) {
        fullscreenControls.classList.add('faded');
      }
    }, FADE_DELAY);
  };

  const clearFadeTimer = () => {
    if (fadeTimeout) {
      clearTimeout(fadeTimeout);
      fadeTimeout = null;
    }
  };

  const handleMouseMove = () => {
    if (!isFullscreen() || !fullscreenControls) return;
    
    // Fade in UI on mouse movement
    fullscreenControls.classList.remove('faded');
    
    // Restart fade timer
    startFadeTimer();
  };

  // Prevent fading when mouse is over controls
  const handleMouseEnterControls = () => {
    if (!isFullscreen() || !fullscreenControls) return;
    fullscreenControls.classList.remove('faded');
    clearFadeTimer();
  };

  const handleMouseLeaveControls = () => {
    if (!isFullscreen() || !fullscreenControls) return;
    startFadeTimer();
  };

  // Add mouse movement listener
  document.addEventListener('mousemove', handleMouseMove);

  // Add hover listeners to controls
  if (fullscreenControls) {
    fullscreenControls.addEventListener('mouseenter', handleMouseEnterControls);
    fullscreenControls.addEventListener('mouseleave', handleMouseLeaveControls);
  }

  // Listen for fullscreen changes
  addFullscreenChangeListener('fullscreenchange', () => {
    const isFullscreenMode = isFullscreen();
    document.body.classList.toggle('is-fullscreen', isFullscreenMode);
    handleFullscreenUI(isFullscreenMode);
    callbacks.onFullscreenChange?.(isFullscreenMode);
  });

  addFullscreenChangeListener('webkitfullscreenchange', () => {
    const isFullscreenMode = isFullscreen();
    document.body.classList.toggle('is-fullscreen', isFullscreenMode);
    handleFullscreenUI(isFullscreenMode);
    callbacks.onFullscreenChange?.(isFullscreenMode);
  });

  addFullscreenChangeListener('mozfullscreenchange', () => {
    const isFullscreenMode = isFullscreen();
    document.body.classList.toggle('is-fullscreen', isFullscreenMode);
    handleFullscreenUI(isFullscreenMode);
    callbacks.onFullscreenChange?.(isFullscreenMode);
  });

  addFullscreenChangeListener('MSFullscreenChange', () => {
    const isFullscreenMode = isFullscreen();
    document.body.classList.toggle('is-fullscreen', isFullscreenMode);
    handleFullscreenUI(isFullscreenMode);
    callbacks.onFullscreenChange?.(isFullscreenMode);
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

  // Return cleanup function (though most event listeners don't need cleanup in this case)
  return {
    cleanup: () => {
      // Cleanup mouse movement listener
      document.removeEventListener('mousemove', handleMouseMove);
      // Cleanup control hover listeners
      if (fullscreenControls) {
        fullscreenControls.removeEventListener('mouseenter', handleMouseEnterControls);
        fullscreenControls.removeEventListener('mouseleave', handleMouseLeaveControls);
      }
      // Clear fade timer
      clearFadeTimer();
      // Stop auto-cycle
      stopAutoCycle();
    },
  };
}
