/**
 * UI Layout Module
 * UI-specific, minimal coupling module for managing layout components
 * Handles collapsible sections, panel toggling, and layout-related functionality
 */

/**
 * Check if EXIF editor should be visible based on URL parameters
 * @returns {boolean} True if ?exif=true or ?full=true is in the URL
 */
function shouldShowExifEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('exif') === 'true' || urlParams.get('full') === 'true';
}

/**
 * Check if debug panel should be visible based on URL parameters
 * @returns {boolean} True if ?debug=true or ?full=true is in the URL
 */
function shouldShowDebugPanel() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('debug') === 'true' || urlParams.get('full') === 'true';
}

/**
 * Setup EXIF editor visibility based on URL parameters
 * Shows the EXIF editor section if ?exif=true or ?full=true is in the URL
 * @param {Object} lazyLoadCallbacks - Optional callbacks for lazy loading
 * @param {Function} lazyLoadCallbacks.getCurrentFractalType - Function to get current fractal type
 * @param {Function} lazyLoadCallbacks.getParams - Function to get current parameters
 */
export function setupExifEditorVisibility(lazyLoadCallbacks = null) {
  const exifSection = document.querySelector('[data-section="exif-editor"]')?.parentElement;

  if (!exifSection) return;

  if (shouldShowExifEditor()) {
    exifSection.classList.remove('exif-hidden');
    exifSection.style.display = '';
    // If visible via URL param, load immediately if callbacks provided
    if (
      lazyLoadCallbacks &&
      lazyLoadCallbacks.getCurrentFractalType &&
      lazyLoadCallbacks.getParams
    ) {
      lazyLoadExifModule(lazyLoadCallbacks.getCurrentFractalType, lazyLoadCallbacks.getParams);
    }
  } else {
    exifSection.classList.add('exif-hidden');
    exifSection.style.display = 'none';
  }
}

/**
 * Setup debug panel visibility based on URL parameters
 * Shows the debug panel section if ?debug=true or ?full=true is in the URL
 * @param {Object} lazyLoadCallbacks - Optional callbacks for lazy loading
 * @param {Function} lazyLoadCallbacks.getCurrentFractalType - Function to get current fractal type
 * @param {Function} lazyLoadCallbacks.getParams - Function to get current parameters
 */
export function setupDebugPanelVisibility(lazyLoadCallbacks = null) {
  const debugSection = document.querySelector('[data-section="debug"]')?.parentElement;

  if (!debugSection) return;

  if (shouldShowDebugPanel()) {
    debugSection.classList.remove('debug-hidden');
    debugSection.style.display = '';
    // If visible via URL param, load immediately if callbacks provided
    if (
      lazyLoadCallbacks &&
      lazyLoadCallbacks.getCurrentFractalType &&
      lazyLoadCallbacks.getParams
    ) {
      lazyLoadDebugModule(lazyLoadCallbacks.getCurrentFractalType, lazyLoadCallbacks.getParams);
    }
  } else {
    debugSection.classList.add('debug-hidden');
    debugSection.style.display = 'none';
  }
}

/**
 * Lazy load modules for rarely used panels
 * Tracks which modules have been loaded to avoid duplicate loads
 */
const lazyLoadedModules = {
  debug: false,
  exif: false,
  presets: false,
  katex: false,
  colorSchemeEditor: false,
};

/**
 * Setup debug display module
 * Note: debug-display.js is already statically imported by coordinate-display.js,
 * so we import it statically here too to avoid mixed static/dynamic import warnings
 * @param {Function} getCurrentFractalType - Function to get current fractal type
 * @param {Function} getParams - Function to get current parameters
 * @returns {Promise<void>}
 */
async function lazyLoadDebugModule(getCurrentFractalType, getParams) {
  if (lazyLoadedModules.debug) return;

  try {
    // Import statically since coordinate-display.js already imports it statically
    const { setupDebugCopy } = await import('./debug-display.js');
    setupDebugCopy(getCurrentFractalType, getParams);
    lazyLoadedModules.debug = true;
  } catch (error) {
    console.error('Failed to load debug module:', error);
  }
}

/**
 * Lazy load EXIF editor module
 * @param {Function} getCurrentFractalType - Function to get current fractal type
 * @param {Function} getParams - Function to get current parameters
 * @returns {Promise<void>}
 */
async function lazyLoadExifModule(getCurrentFractalType, getParams) {
  if (lazyLoadedModules.exif) return;

  try {
    const { setupExifEditor } = await import('./exif-editor.js');
    setupExifEditor(getCurrentFractalType, getParams);
    lazyLoadedModules.exif = true;

    // Trigger an immediate update to ensure the display shows current values
    // Use setTimeout to ensure the module is fully initialized
    setTimeout(() => {
      const params = getParams();
      const fractalType = getCurrentFractalType();
      if (params && fractalType) {
        window.dispatchEvent(
          new CustomEvent('fractal-updated', {
            detail: { fractalType, params },
          })
        );
      }
    }, 0);
  } catch (error) {
    console.error('Failed to lazy load EXIF editor module:', error);
  }
}

/**
 * Lazy load color scheme editor module
 * @param {Function} getParams - Function to get current parameters
 * @param {Function} updateParams - Function to update parameters
 * @param {Function} renderFractal - Function to trigger fractal render
 * @returns {Promise<void>}
 */
async function lazyLoadColorSchemeEditor(getParams, updateParams, renderFractal) {
  if (lazyLoadedModules.colorSchemeEditor) return;

  try {
    const { setupColorSchemeEditor } = await import('./color-scheme-editor.js');
    if (getParams && updateParams && renderFractal) {
      setupColorSchemeEditor(getParams, updateParams, renderFractal);
      lazyLoadedModules.colorSchemeEditor = true;
    } else {
      console.warn('Color scheme editor: Missing required callbacks', { getParams: !!getParams, updateParams: !!updateParams, renderFractal: !!renderFractal });
    }
  } catch (error) {
    console.error('Failed to lazy load color scheme editor module:', error);
  }
}

/**
 * Lazy load KaTeX for LaTeX rendering
 * Loads CSS and JS files only when needed
 * @returns {Promise<void>}
 */
async function lazyLoadKaTeX() {
  if (lazyLoadedModules.katex) return;

  try {
    // Load CSS first
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = '/static/katex/katex.min.css';
    document.head.appendChild(cssLink);

    // Load JS files sequentially
    await new Promise((resolve, reject) => {
      // Load main KaTeX library
      const script1 = document.createElement('script');
      script1.src = '/static/katex/katex.min.js';
      script1.async = false; // Load synchronously to ensure order
      script1.onload = () => {
        // Load auto-render after main KaTeX is loaded
        const script2 = document.createElement('script');
        script2.src = '/static/katex/auto-render.min.js';
        script2.async = false; // Load synchronously
        script2.onload = () => {
          lazyLoadedModules.katex = true;
          // Dispatch event to notify that KaTeX is loaded
          window.dispatchEvent(new CustomEvent('katex-loaded'));
          resolve();
        };
        script2.onerror = () => {
          console.warn('Failed to load KaTeX auto-render, but main library loaded');
          lazyLoadedModules.katex = true; // Main library is enough
          window.dispatchEvent(new CustomEvent('katex-loaded'));
          resolve(); // Resolve anyway - main library is sufficient
        };
        document.head.appendChild(script2);
      };
      script1.onerror = reject;
      document.head.appendChild(script1);
    });
  } catch (error) {
    console.error('Failed to lazy load KaTeX:', error);
    lazyLoadedModules.katex = false; // Allow retry
    throw error;
  }
}

/**
 * Setup collapsible sections with lazy loading support
 * Allows sections to be expanded/collapsed by clicking their headers
 * Lazy loads rarely used modules (debug, exif, colorSchemeEditor) when first opened
 * @param {Object} lazyLoadCallbacks - Callbacks for lazy loading modules
 * @param {Function} lazyLoadCallbacks.getCurrentFractalType - Function to get current fractal type
 * @param {Function} lazyLoadCallbacks.getParams - Function to get current parameters
 * @param {Function} lazyLoadCallbacks.updateParams - Function to update parameters
 * @param {Function} lazyLoadCallbacks.renderFractal - Function to trigger fractal render
 */
export function setupCollapsibleSections(lazyLoadCallbacks = null) {
  const sectionHeaders = document.querySelectorAll('.section-header');

  sectionHeaders.forEach((header) => {
    const section = header.parentElement;
    const content = section.querySelector('.section-content');
    const sectionType = header.getAttribute('data-section');

    // Check if section is already open on page load and lazy load if needed
    if (content && content.classList.contains('active')) {
      if (
        lazyLoadCallbacks &&
        lazyLoadCallbacks.getCurrentFractalType &&
        lazyLoadCallbacks.getParams
      ) {
        if (sectionType === 'debug') {
          lazyLoadDebugModule(lazyLoadCallbacks.getCurrentFractalType, lazyLoadCallbacks.getParams);
        } else if (sectionType === 'exif-editor') {
          lazyLoadExifModule(lazyLoadCallbacks.getCurrentFractalType, lazyLoadCallbacks.getParams);
        }
      }
      if (sectionType === 'math-info') {
        lazyLoadKaTeX();
      }
      // Lazy load color scheme editor if section is already open
      if (sectionType === 'color-scheme-editor') {
        lazyLoadColorSchemeEditor(
          lazyLoadCallbacks?.getParams,
          lazyLoadCallbacks?.updateParams,
          lazyLoadCallbacks?.renderFractal
        );
      }
    }

    header.addEventListener('click', async () => {
      // Skip if content element doesn't exist
      if (!content) return;

      const isActive = content.classList.contains('active');

      if (isActive) {
        content.classList.remove('active');
        header.classList.add('collapsed');
      } else {
        content.classList.add('active');
        header.classList.remove('collapsed');

        // Lazy load modules when section is first opened
        if (
          lazyLoadCallbacks &&
          lazyLoadCallbacks.getCurrentFractalType &&
          lazyLoadCallbacks.getParams
        ) {
          if (sectionType === 'debug') {
            await lazyLoadDebugModule(
              lazyLoadCallbacks.getCurrentFractalType,
              lazyLoadCallbacks.getParams
            );
          } else if (sectionType === 'exif-editor') {
            await lazyLoadExifModule(
              lazyLoadCallbacks.getCurrentFractalType,
              lazyLoadCallbacks.getParams
            );
          }
        }

        // Lazy load KaTeX for math-info section
        if (sectionType === 'math-info') {
          await lazyLoadKaTeX();
        }

        // Lazy load color scheme editor (doesn't require getCurrentFractalType)
        if (sectionType === 'color-scheme-editor') {
          await lazyLoadColorSchemeEditor(
            lazyLoadCallbacks?.getParams,
            lazyLoadCallbacks?.updateParams,
            lazyLoadCallbacks?.renderFractal
          );
        }
      }
    });
  });
}

/**
 * Setup left panel toggle functionality
 * Handles showing/hiding the left side panel and updating renderer size
 * @param {Function} updateRendererSize - Optional callback to update renderer size after panel animation
 */
export function setupLeftPanelToggle(updateRendererSize) {
  const sidePanel = document.querySelector('.side-panel');
  const backBtn = document.querySelector('.back-btn');
  const showPanelBtn = document.getElementById('show-panel-btn');

  if (!sidePanel || !backBtn || !showPanelBtn) return;

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

/**
 * Lazy load presets module
 * @param {Function} loadFractalFromPreset - Function to load fractal from preset data
 * @returns {Promise<void>}
 */
async function lazyLoadPresetsModule(loadFractalFromPreset) {
  if (lazyLoadedModules.presets) return;

  try {
    const { setupPresets } = await import('./presets.js');
    // setupPresets is now async, so await it to ensure presets are loaded
    await setupPresets(loadFractalFromPreset);
    lazyLoadedModules.presets = true;
  } catch (error) {
    console.error('Failed to lazy load presets module:', error);
  }
}

/**
 * Setup right panel toggle functionality
 * Handles showing/hiding the right panel and updating renderer size
 * Lazy loads presets module when panel is first opened
 * @param {Function} updateRendererSize - Optional callback to update renderer size after panel animation
 * @param {Function} loadFractalFromPreset - Optional callback to load fractal from preset (for lazy loading presets)
 */
export function setupRightPanelToggle(updateRendererSize, loadFractalFromPreset = null) {
  const rightPanel = document.querySelector('.right-panel');
  const rightBackBtn = document.querySelector('.right-back-btn');
  const showRightPanelBtn = document.getElementById('show-right-panel-btn');

  if (!rightPanel || !rightBackBtn || !showRightPanelBtn) return;

  // Hide right panel when back button is clicked
  rightBackBtn.addEventListener('click', () => {
    rightPanel.classList.add('hidden');
    // Resize canvas after panel animation
    setTimeout(() => {
      if (updateRendererSize) {
        updateRendererSize();
      }
    }, 300);
  });

  // Show right panel when show button is clicked
  showRightPanelBtn.addEventListener('click', async () => {
    rightPanel.classList.remove('hidden');

    // Lazy load presets module when panel is first opened
    if (loadFractalFromPreset && !lazyLoadedModules.presets) {
      await lazyLoadPresetsModule(loadFractalFromPreset);
    }

    // Resize canvas after panel animation
    setTimeout(() => {
      if (updateRendererSize) {
        updateRendererSize();
      }
    }, 300);
  });
}

/**
 * Initialize all UI layout components
 * Convenience function to set up all layout-related functionality at once
 * @param {Function} updateRendererSize - Optional callback to update renderer size
 * @param {Object} lazyLoadCallbacks - Optional callbacks for lazy loading modules
 * @param {Function} lazyLoadCallbacks.getCurrentFractalType - Function to get current fractal type
 * @param {Function} lazyLoadCallbacks.getParams - Function to get current parameters
 * @param {Function} lazyLoadCallbacks.loadFractalFromPreset - Function to load fractal from preset (for lazy loading presets)
 */
export function initUILayout(updateRendererSize, lazyLoadCallbacks = null) {
  setupCollapsibleSections(lazyLoadCallbacks);
  setupLeftPanelToggle(updateRendererSize);
  setupRightPanelToggle(updateRendererSize, lazyLoadCallbacks?.loadFractalFromPreset || null);
  setupExifEditorVisibility(lazyLoadCallbacks);
  setupDebugPanelVisibility(lazyLoadCallbacks);

  // Check if right panel is already visible (e.g., from URL parameter or initial state)
  // If so, load presets module immediately to ensure preset clicks work
  const rightPanel = document.querySelector('.right-panel');
  if (
    rightPanel &&
    !rightPanel.classList.contains('hidden') &&
    lazyLoadCallbacks?.loadFractalFromPreset
  ) {
    // Panel is visible, load presets module immediately
    lazyLoadPresetsModule(lazyLoadCallbacks.loadFractalFromPreset).catch((error) => {
      console.error('Failed to load presets module for visible panel:', error);
    });
  }
}

// Backward compatibility alias
export const setupPanelToggle = setupLeftPanelToggle;
