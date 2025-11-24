/**
 * UI Controls Module
 * Largest and most complex module for managing all UI control interactions
 * Handles fractal type selection, iterations, color schemes, Julia controls,
 * scale sliders, buttons, fullscreen controls, and more
 */

import { getColorSchemeIndex, computeColorForScheme, isJuliaType } from '../fractals/utils.js';
import { CONFIG } from '../core/config.js';
import { getInitialRenderPosition } from '../fractals/fractal-config.js';

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
 * @param {Function} callbacks.getRandomInterestingView - Get random interesting view
 * @returns {Object} Object with cleanup function
 */
export function setupUIControls(getters, setters, dependencies, callbacks) {
  const {
    getParams,
    getCurrentFractalType,
    getCurrentFractalModule,
    getDrawFractal,
    getCachedDrawCommand,
    getIsDisplayingCached,
    getRegl,
    getCanvas,
  } = getters;

  const {
    setCurrentFractalType,
    setDrawFractal,
    setCachedDrawCommand,
    setIsDisplayingCached,
  } = setters;

  const { frameCache, fractalLoader } = dependencies;

  const {
    loadFractal,
    updateWikipediaLink,
    updateCoordinateDisplay,
    renderFractalProgressive,
    renderFractal,
    getRandomInterestingView,
    cancelProgressiveRender,
    onFullscreenChange,
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
    const newFractalType = e.target.value;
    setCurrentFractalType(newFractalType);
    updateWikipediaLink();
    updateCoordinateDisplay();

    // Clear previous fractal draw command
    setDrawFractal(null);
    setCachedDrawCommand(null);
    setIsDisplayingCached(false);

    // Clear the cache for this fractal type to force a fresh load
    fractalLoader.removeFromCache(newFractalType);

    // Clear frame cache when fractal type changes
    frameCache.clear();

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
    const drawFractal = getDrawFractal();
    const canvas = getCanvas();
    const currentFractalType = getCurrentFractalType();
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

    // A view is interesting if it has a mix of escaped and non-escaped points
    // or if it has points that escaped in the mid-range (boundary region)
    return (escapeCount > 0 && stayCount > 0) || midRangeCount >= 2;
  }

  // Function to generate random interesting coordinates and zoom for each fractal type
  function getRandomInterestingViewLocal() {
    const currentFractalType = getCurrentFractalType();
    const currentFractalModule = getCurrentFractalModule();
    const params = getParams();
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

      // For other fractals with interesting points, randomly select one
      const location = interestingLocations[Math.floor(Math.random() * interestingLocations.length)];
      const zoom = location.zoom * (0.8 + Math.random() * 0.4);

      return {
        offset: { x: location.x, y: location.y },
        zoom: zoom,
      };
    }

    // Fallback: generate random coordinates and validate
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      const randomOffset = {
        x: -2 + Math.random() * 4,
        y: -2 + Math.random() * 4,
      };
      const randomZoom = 0.5 + Math.random() * 20;

      if (isValidInterestingView(randomOffset, randomZoom, fractalType)) {
        return {
          offset: randomOffset,
          zoom: randomZoom,
        };
      }

      attempts++;
    }

    // If validation fails after max attempts, return a safe default
    return {
      x: -0.5 + Math.random() * 1,
      y: -0.5 + Math.random() * 1,
      zoom: 1 + Math.random() * 10,
    };
  }

  // Random view button
  let currentInterestingPointIndex = 1;
  const fullscreenRandomNumberEl = document.getElementById('fullscreen-random-number');

  fullscreenRandomBtn.addEventListener('click', () => {
    // Get random interesting view
    const randomView = getRandomInterestingView ? getRandomInterestingView() : getRandomInterestingViewLocal();
    const params = getParams();

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
    if (getIsDisplayingCached()) {
      setIsDisplayingCached(false);
      setCachedDrawCommand(null);
    }

    // Cancel any ongoing progressive rendering
    if (cancelProgressiveRender) {
      cancelProgressiveRender();
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

  // Color scheme cycling for fullscreen controls
  fullscreenColorCycleBtn.addEventListener('click', async () => {
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

    // Clear draw command to force regeneration with new palette
    setDrawFractal(null);
    setCachedDrawCommand(null);

    // Render with new color scheme
    renderFractalProgressive();
  });

  fullscreenScreenshotBtn.addEventListener('click', captureScreenshot);

  // Fullscreen change handlers
  const fullscreenChangeHandlers = [];

  // Helper to add fullscreen change listeners
  const addFullscreenChangeListener = (event, handler) => {
    document.addEventListener(event, handler);
    fullscreenChangeHandlers.push({ event, handler });
  };

  // Listen for fullscreen changes
  addFullscreenChangeListener('fullscreenchange', () => {
    const isFullscreenMode = isFullscreen();
    document.body.classList.toggle('is-fullscreen', isFullscreenMode);
    callbacks.onFullscreenChange?.(isFullscreenMode);
  });

  addFullscreenChangeListener('webkitfullscreenchange', () => {
    const isFullscreenMode = isFullscreen();
    document.body.classList.toggle('is-fullscreen', isFullscreenMode);
    callbacks.onFullscreenChange?.(isFullscreenMode);
  });

  addFullscreenChangeListener('mozfullscreenchange', () => {
    const isFullscreenMode = isFullscreen();
    document.body.classList.toggle('is-fullscreen', isFullscreenMode);
    callbacks.onFullscreenChange?.(isFullscreenMode);
  });

  addFullscreenChangeListener('MSFullscreenChange', () => {
    const isFullscreenMode = isFullscreen();
    document.body.classList.toggle('is-fullscreen', isFullscreenMode);
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
      // Most event listeners are on DOM elements that will be cleaned up when page unloads
      // But we can add cleanup logic here if needed
    },
  };
}

