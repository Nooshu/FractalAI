/**
 * UI Layout Module
 * UI-specific, minimal coupling module for managing layout components
 * Handles collapsible sections, panel toggling, and layout-related functionality
 */

/**
 * Check if EXIF editor should be visible based on URL parameters
 * @returns {boolean} True if ?exif=true is in the URL
 */
function shouldShowExifEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('exif') === 'true';
}

/**
 * Check if debug panel should be visible based on URL parameters
 * @returns {boolean} True if ?debug=true is in the URL
 */
function shouldShowDebugPanel() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('debug') === 'true';
}

/**
 * Setup EXIF editor visibility based on URL parameters
 * Hides the EXIF editor section if ?exif=true is not present in the URL
 */
export function setupExifEditorVisibility() {
  const exifSection = document.querySelector('[data-section="exif-editor"]')?.parentElement;

  if (!exifSection) return;

  if (shouldShowExifEditor()) {
    exifSection.classList.remove('exif-hidden');
    exifSection.style.display = '';
  } else {
    exifSection.classList.add('exif-hidden');
    exifSection.style.display = 'none';
  }
}

/**
 * Setup debug panel visibility based on URL parameters
 * Hides the debug panel section if ?debug=true is not present in the URL
 */
export function setupDebugPanelVisibility() {
  const debugSection = document.querySelector('[data-section="debug"]')?.parentElement;

  if (!debugSection) return;

  if (shouldShowDebugPanel()) {
    debugSection.classList.remove('debug-hidden');
    debugSection.style.display = '';
  } else {
    debugSection.classList.add('debug-hidden');
    debugSection.style.display = 'none';
  }
}

/**
 * Setup collapsible sections
 * Allows sections to be expanded/collapsed by clicking their headers
 */
export function setupCollapsibleSections() {
  const sectionHeaders = document.querySelectorAll('.section-header');

  sectionHeaders.forEach((header) => {
    header.addEventListener('click', () => {
      const section = header.parentElement;
      const content = section.querySelector('.section-content');

      // Skip if content element doesn't exist
      if (!content) return;

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
 * Setup right panel toggle functionality
 * Handles showing/hiding the right panel and updating renderer size
 * @param {Function} updateRendererSize - Optional callback to update renderer size after panel animation
 */
export function setupRightPanelToggle(updateRendererSize) {
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
  showRightPanelBtn.addEventListener('click', () => {
    rightPanel.classList.remove('hidden');
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
 */
export function initUILayout(updateRendererSize) {
  setupCollapsibleSections();
  setupLeftPanelToggle(updateRendererSize);
  setupRightPanelToggle(updateRendererSize);
  setupExifEditorVisibility();
  setupDebugPanelVisibility();
}

// Backward compatibility alias
export const setupPanelToggle = setupLeftPanelToggle;

