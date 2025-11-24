/**
 * Footer Height Tracking Module
 * Manages footer height tracking and CSS variable updates
 */

/**
 * Update footer height CSS variable
 */
export function updateFooterHeight() {
  const footer = document.querySelector('.app-footer');
  if (footer) {
    const height = footer.offsetHeight;
    document.documentElement.style.setProperty('--footer-height', `${height}px`);
  }
}

/**
 * Setup footer height tracking with ResizeObserver and event listeners
 */
function setupFooterHeightTracking() {
  const footer = document.querySelector('.app-footer');
  const shareButton = document.getElementById('share-fractal-btn');
  const shareDescription = document.querySelector('.footer-share-description');

  if (footer) {
    // Use ResizeObserver for more accurate footer height tracking
    const footerObserver = new ResizeObserver(() => {
      updateFooterHeight();
    });

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

/**
 * Initialize footer height tracking
 * Sets up ResizeObserver, DOMContentLoaded listener, and resize listener
 */
export function initFooterHeightTracking() {
  // Update footer height when window resizes or content changes
  window.addEventListener('resize', updateFooterHeight);

  // Start observing footer once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFooterHeightTracking);
  } else {
    setupFooterHeightTracking();
  }
}

