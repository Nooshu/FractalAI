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
 * Setup panel toggle functionality
 * Handles showing/hiding the side panel and updating renderer size
 * @param {Function} updateRendererSize - Optional callback to update renderer size after panel animation
 */
export function setupPanelToggle(updateRendererSize) {
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
 * Initialize all UI layout components
 * Convenience function to set up all layout-related functionality at once
 * @param {Function} updateRendererSize - Optional callback to update renderer size
 */
export function initUILayout(updateRendererSize) {
  setupCollapsibleSections();
  setupPanelToggle(updateRendererSize);
}

