/**
 * UI Layout Module
 * UI-specific, minimal coupling module for managing layout components
 * Handles collapsible sections, panel toggling, and layout-related functionality
 */

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
}

// Backward compatibility alias
export const setupPanelToggle = setupLeftPanelToggle;

