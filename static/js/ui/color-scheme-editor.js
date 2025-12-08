/**
 * Color Scheme Editor Module
 * Provides a visual gradient editor for creating custom color schemes
 * Supports saving custom schemes and importing/exporting color palettes
 */

import { computeColorForScheme, setCustomSchemeHandler } from '../fractals/utils.js';

/**
 * Show a custom notification
 * @param {string} message - The message to display
 * @param {string} type - The notification type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in milliseconds (0 = don't auto-dismiss)
 */
function showNotification(message, type = 'info', duration = 3000) {
  // Create notification container if it doesn't exist
  let container = document.querySelector('.notification-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'notification-container';
    document.body.appendChild(container);
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;

  // Icons for different types
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  };

  // Close button icon
  const closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  notification.innerHTML = `
    <div class="notification-icon">${icons[type] || icons.info}</div>
    <div class="notification-content">${message}</div>
    <button class="notification-close" aria-label="Close">${closeIcon}</button>
  `;

  // Add close functionality
  const closeBtn = notification.querySelector('.notification-close');
  const closeNotification = () => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      notification.remove();
      // Remove container if empty
      if (container.children.length === 0) {
        container.remove();
      }
    }, 300);
  };

  closeBtn.addEventListener('click', closeNotification);

  // Add to container
  container.appendChild(notification);

  // Auto-dismiss after duration
  if (duration > 0) {
    setTimeout(closeNotification, duration);
  }

  return notification;
}

// Storage key for custom color schemes
const CUSTOM_SCHEMES_STORAGE_KEY = 'fractalai_custom_color_schemes';

// Custom color schemes storage (loaded from localStorage)
let customColorSchemes = new Map();

/**
 * Load custom color schemes from localStorage
 */
function loadCustomSchemes() {
  try {
    const stored = localStorage.getItem(CUSTOM_SCHEMES_STORAGE_KEY);
    if (stored) {
      const schemes = JSON.parse(stored);
      customColorSchemes = new Map(schemes);
    }
  } catch (error) {
    console.error('Failed to load custom color schemes:', error);
  }
}

/**
 * Save custom color schemes to localStorage
 */
function saveCustomSchemes() {
  try {
    const schemes = Array.from(customColorSchemes.entries());
    localStorage.setItem(CUSTOM_SCHEMES_STORAGE_KEY, JSON.stringify(schemes));
  } catch (error) {
    console.error('Failed to save custom color schemes:', error);
  }
}

/**
 * Compute color from gradient stops
 * @param {number} t - Value from 0 to 1
 * @param {Array} stops - Array of {position: 0-1, color: [r, g, b]}
 * @returns {Float32Array} RGB color [r, g, b] in range [0, 1]
 */
function computeColorFromGradient(t, stops) {
  if (!stops || stops.length === 0) {
    return new Float32Array([0, 0, 0]);
  }

  // Clamp t
  t = Math.max(0, Math.min(1, t));

  // Sort stops by position
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);

  // If t is before first stop, return first color
  if (t <= sortedStops[0].position) {
    return new Float32Array(sortedStops[0].color);
  }

  // If t is after last stop, return last color
  if (t >= sortedStops[sortedStops.length - 1].position) {
    const last = sortedStops[sortedStops.length - 1];
    return new Float32Array(last.color);
  }

  // Find the two stops to interpolate between
  for (let i = 0; i < sortedStops.length - 1; i++) {
    const stop1 = sortedStops[i];
    const stop2 = sortedStops[i + 1];

    if (t >= stop1.position && t <= stop2.position) {
      // Interpolate between stop1 and stop2
      const range = stop2.position - stop1.position;
      const localT = range > 0 ? (t - stop1.position) / range : 0;

      const r = stop1.color[0] + (stop2.color[0] - stop1.color[0]) * localT;
      const g = stop1.color[1] + (stop2.color[1] - stop1.color[1]) * localT;
      const b = stop1.color[2] + (stop2.color[2] - stop1.color[2]) * localT;

      return new Float32Array([r, g, b]);
    }
  }

  // Fallback
  return new Float32Array([0, 0, 0]);
}

/**
 * Convert RGB [0-1] to hex string
 */
function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.round(Math.max(0, Math.min(255, n * 255))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert hex string to RGB [0-1]
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [0, 0, 0];
}

/**
 * Create a gradient editor component
 * @param {HTMLElement} container - Container element
 * @param {Array} initialStops - Initial gradient stops
 * @param {Function} onStopsChange - Optional callback when stops change (for auto-apply)
 * @param {Function} onUpdateButtonText - Optional callback to update save button text
 */
function createGradientEditor(container, initialStops = null, onStopsChange = null, onUpdateButtonText = null) {
  const editor = document.createElement('div');
  editor.className = 'gradient-editor';

  // Gradient preview canvas
  const previewCanvas = document.createElement('canvas');
  previewCanvas.className = 'gradient-preview';
  previewCanvas.width = 300;
  previewCanvas.height = 40;
  previewCanvas.setAttribute('role', 'img');
  previewCanvas.setAttribute('aria-label', 'Gradient preview');

  // Stops container (positioned relative to preview)
  const stopsWrapper = document.createElement('div');
  stopsWrapper.className = 'gradient-stops-wrapper';
  stopsWrapper.style.position = 'relative';

  const stopsContainer = document.createElement('div');
  stopsContainer.className = 'gradient-stops';

  // Add stop button
  const addStopBtn = document.createElement('button');
  addStopBtn.className = 'btn btn-secondary add-stop-btn';
  addStopBtn.textContent = 'Add Colour Stop';
  addStopBtn.type = 'button';

  stopsWrapper.appendChild(previewCanvas);
  stopsWrapper.appendChild(stopsContainer);
  editor.appendChild(stopsWrapper);
  editor.appendChild(addStopBtn);

  // Store reference to stopsWrapper for handle positioning
  const gradientEditor = {
    element: editor,
    stopsWrapper: stopsWrapper,
    previewCanvas: previewCanvas,
    getStops: () => stops,
    setStops: (newStops) => {
      stops = newStops;
      updateStops();
    },
    renderPreview,
  };

  // Current stops
  let stops = initialStops || [
    { position: 0, color: [0, 0, 0] },
    { position: 1, color: [1, 1, 1] },
  ];

  // Throttle function for auto-apply during dragging
  let applyTimeout = null;
  let isDraggingActive = false;

  function triggerAutoApply(immediate = false) {
    if (!onStopsChange) return;

    // Clear existing timeout
    if (applyTimeout) {
      clearTimeout(applyTimeout);
      applyTimeout = null;
    }

    // If immediate (e.g., drag end, color change), apply right away
    // Otherwise throttle during dragging
    if (immediate || !isDraggingActive) {
      onStopsChange(stops);
    } else {
      // Throttle during dragging - apply after 100ms of no movement
      applyTimeout = setTimeout(() => {
        onStopsChange(stops);
        applyTimeout = null;
      }, 100);
    }
  }

  // Render gradient preview
  function renderPreview() {
    const ctx = previewCanvas.getContext('2d');
    const width = previewCanvas.width;
    const height = previewCanvas.height;

    for (let x = 0; x < width; x++) {
      const t = x / (width - 1);
      const color = computeColorFromGradient(t, stops);
      ctx.fillStyle = `rgb(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)})`;
      ctx.fillRect(x, 0, 1, height);
    }
  }

  // Create stop element
  function createStopElement(stop, index) {
    const stopEl = document.createElement('div');
    stopEl.className = 'gradient-stop';
    stopEl.dataset.index = index;
    stopEl.style.position = 'relative';

    const handle = document.createElement('div');
    handle.className = 'gradient-stop-handle';
    // Position handle absolutely within stopsWrapper, aligned with preview canvas
    // We'll position it as a percentage of the preview canvas width
    const leftPercent = stop.position * 100;
    handle.style.left = `${leftPercent}%`;
    handle.style.width = '16px';
    handle.style.height = '16px';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = rgbToHex(stop.color[0], stop.color[1], stop.color[2]);
    colorInput.className = 'gradient-stop-color';

    const positionInput = document.createElement('input');
    positionInput.type = 'number';
    positionInput.min = '0';
    positionInput.max = '1';
    positionInput.step = '0.01';
    positionInput.value = stop.position.toFixed(2);
    positionInput.className = 'gradient-stop-position';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'gradient-stop-delete';
    deleteBtn.textContent = '×';
    deleteBtn.type = 'button';
    deleteBtn.title = 'Delete stop';

    stopEl.appendChild(handle);
    stopEl.appendChild(colorInput);
    stopEl.appendChild(positionInput);
    stopEl.appendChild(deleteBtn);

    // Update color
    colorInput.addEventListener('input', () => {
      stop.color = hexToRgb(colorInput.value);
      renderPreview();
      updateStops();
      triggerAutoApply(true); // Immediate apply on color change
      // Update button text if name matches existing scheme
      if (onUpdateButtonText) {
        onUpdateButtonText();
      }
    });

    // Update position
    positionInput.addEventListener('input', () => {
      stop.position = Math.max(0, Math.min(1, parseFloat(positionInput.value) || 0));
      handle.style.left = `${stop.position * 100}%`;
      renderPreview();
      triggerAutoApply(true); // Immediate apply on position input
      // Update button text if name matches existing scheme
      if (onUpdateButtonText) {
        onUpdateButtonText();
      }
    });

    // Drag handle
    let isDragging = false;

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const rect = previewCanvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      stop.position = x;
      positionInput.value = x.toFixed(2);
      handle.style.left = `${x * 100}%`;
      renderPreview();
      triggerAutoApply(false); // Throttled apply during drag
      // Update button text during drag (throttled by the callback itself)
      if (onUpdateButtonText) {
        onUpdateButtonText();
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
      isDraggingActive = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Apply immediately when drag ends
      triggerAutoApply(true);
      // Update button text if name matches existing scheme
      if (onUpdateButtonText) {
        onUpdateButtonText();
      }
    };

    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      isDraggingActive = true;
      e.preventDefault();
      e.stopPropagation();
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });

    // Delete stop (only if more than 2 stops)
    deleteBtn.addEventListener('click', () => {
      if (stops.length > 2) {
        stops.splice(index, 1);
        updateStops();
        triggerAutoApply(true); // Apply when deleting stop
        // Update button text if name matches existing scheme
        if (onUpdateButtonText) {
          onUpdateButtonText();
        }
      }
    });

    return stopEl;
  }

  // Update stops display
  function updateStops() {
    stopsContainer.innerHTML = '';
    // Remove all existing handles from stopsWrapper (they're positioned absolutely over preview)
    const existingHandles = stopsWrapper.querySelectorAll('.gradient-stop-handle');
    existingHandles.forEach(h => h.remove());

    stops.forEach((stop, index) => {
      const stopEl = createStopElement(stop, index);
      stopsContainer.appendChild(stopEl);
      // Move handle to stopsWrapper for positioning over preview canvas
      const handle = stopEl.querySelector('.gradient-stop-handle');
      if (handle) {
        stopsWrapper.appendChild(handle);
      }
    });
    renderPreview();
  }

  // Add new stop
  addStopBtn.addEventListener('click', () => {
    // Add stop at middle position
    const newStop = {
      position: 0.5,
      color: [0.5, 0.5, 0.5],
    };
    stops.push(newStop);
    updateStops();
    triggerAutoApply(true); // Apply when adding new stop
    // Update button text if name matches existing scheme
    if (onUpdateButtonText) {
      onUpdateButtonText();
    }
  });

  // Initialize
  updateStops();

  // Public API
  return {
    ...gradientEditor,
    onStopsChange: (callback) => {
      onStopsChange = callback;
    },
  };
}

/**
 * Setup color scheme editor
 * @param {Function} getParams - Function to get current parameters
 * @param {Function} updateParams - Function to update parameters
 * @param {Function} renderFractal - Function to trigger fractal render
 */
export function setupColorSchemeEditor(getParams, updateParams, renderFractal) {
  // Load custom schemes
  loadCustomSchemes();

  const section = document.querySelector('[data-section="color-scheme-editor"]')?.parentElement;
  if (!section) {
    console.warn('Color scheme editor: Section not found');
    return;
  }

  const content = section.querySelector('.section-content');
  if (!content) {
    console.warn('Color scheme editor: Section content not found');
    return;
  }

  // Check if content is already initialized
  if (content.querySelector('.color-scheme-editor-container')) {
    console.log('Color scheme editor: Already initialized');
    return;
  }

  // Create editor container
  const editorContainer = document.createElement('div');
  editorContainer.className = 'color-scheme-editor-container';

  // Scheme name input
  const nameContainer = document.createElement('div');
  nameContainer.className = 'control';
  const nameLabel = document.createElement('label');
  nameLabel.className = 'control-label';
  nameLabel.textContent = 'Scheme Name';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'scheme-name-input';
  nameInput.placeholder = 'My Custom Scheme';
  nameContainer.appendChild(nameLabel);
  nameContainer.appendChild(nameInput);

  // Gradient editor
  const gradientContainer = document.createElement('div');
  gradientContainer.className = 'control';
  const gradientLabel = document.createElement('label');
  gradientLabel.className = 'control-label';
  gradientLabel.textContent = 'Gradient Editor';
  gradientContainer.appendChild(gradientLabel);

  // Auto-apply function for gradient editor
  const autoApplyGradient = (stops) => {
    const tempName = `_temp_${Date.now()}`;
    customColorSchemes.set(tempName, { stops: JSON.parse(JSON.stringify(stops)) });
    saveCustomSchemes();

    const params = getParams();
    params.colorScheme = `custom:${tempName}`;
    updateParams({ colorScheme: `custom:${tempName}` });
    renderFractal();
  };

  const gradientEditor = createGradientEditor(gradientContainer, null, autoApplyGradient, updateSaveButtonText);
  gradientContainer.appendChild(gradientEditor.element);

  // Action buttons
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'color-scheme-actions';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'Save Scheme';
  saveBtn.type = 'button';

  // Track original stops when a scheme is loaded
  let originalStops = null;
  // Flag to prevent input event from interfering when applying a scheme
  let isApplyingScheme = false;

  // Sort stops by position for consistent comparison
  function sortStopsByPosition(stops) {
    return [...stops].sort((a, b) => a.position - b.position);
  }

  // Compare two stops arrays to see if they're different
  function stopsAreDifferent(stops1, stops2) {
    if (!stops1 || !stops2) return true;
    if (stops1.length !== stops2.length) return true;

    // Sort both arrays by position for consistent comparison
    const sorted1 = sortStopsByPosition(stops1);
    const sorted2 = sortStopsByPosition(stops2);

    for (let i = 0; i < sorted1.length; i++) {
      const s1 = sorted1[i];
      const s2 = sorted2[i];
      if (Math.abs(s1.position - s2.position) > 0.001) return true;
      if (Math.abs(s1.color[0] - s2.color[0]) > 0.001) return true;
      if (Math.abs(s1.color[1] - s2.color[1]) > 0.001) return true;
      if (Math.abs(s1.color[2] - s2.color[2]) > 0.001) return true;
    }
    return false;
  }

  // Function to update save button text based on whether scheme exists and has been modified
  function updateSaveButtonText() {
    const name = nameInput.value.trim();
    const exists = name && customColorSchemes.has(name);

    if (!exists) {
      saveBtn.textContent = 'Save Scheme';
      originalStops = null; // Clear when name doesn't match
      return;
    }

    // Ensure originalStops is set if name matches an existing scheme
    // Only set it if it's not already set (to preserve the original when applying a scheme)
    if (!originalStops) {
      const savedScheme = customColorSchemes.get(name);
      if (savedScheme) {
        const stopsCopy = JSON.parse(JSON.stringify(savedScheme.stops));
        originalStops = sortStopsByPosition(stopsCopy);
      }
    }

    if (!originalStops) {
      saveBtn.textContent = 'Save Scheme';
      return;
    }

    const currentStops = gradientEditor.getStops();
    if (!currentStops || currentStops.length === 0) {
      saveBtn.textContent = 'Save Scheme';
      return;
    }

    const hasChanged = stopsAreDifferent(currentStops, originalStops);
    saveBtn.textContent = hasChanged ? 'Update Scheme' : 'Save Scheme';
  }

  const applyBtn = document.createElement('button');
  applyBtn.className = 'btn btn-primary';
  applyBtn.textContent = 'Apply to Fractal';
  applyBtn.type = 'button';

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn btn-secondary';
  exportBtn.textContent = 'Export Palette';
  exportBtn.type = 'button';

  const importBtn = document.createElement('button');
  importBtn.className = 'btn btn-secondary';
  importBtn.textContent = 'Import Palette';
  importBtn.type = 'button';

  const importFileInput = document.createElement('input');
  importFileInput.type = 'file';
  importFileInput.accept = '.json';
  importFileInput.style.display = 'none';

  actionsContainer.appendChild(saveBtn);
  actionsContainer.appendChild(applyBtn);
  actionsContainer.appendChild(exportBtn);
  actionsContainer.appendChild(importBtn);
  actionsContainer.appendChild(importFileInput);

  // Saved schemes list
  const savedSchemesContainer = document.createElement('div');
  savedSchemesContainer.className = 'control';
  const savedLabel = document.createElement('label');
  savedLabel.className = 'control-label';
  savedLabel.textContent = 'Saved Custom Schemes';
  savedSchemesContainer.appendChild(savedLabel);

  const savedSchemesList = document.createElement('div');
  savedSchemesList.className = 'saved-schemes-list';
  savedSchemesContainer.appendChild(savedSchemesList);

  // Assemble editor
  editorContainer.appendChild(nameContainer);
  editorContainer.appendChild(gradientContainer);
  editorContainer.appendChild(actionsContainer);
  editorContainer.appendChild(savedSchemesContainer);

  content.appendChild(editorContainer);

  console.log('Color scheme editor: Content initialized and added to DOM');

  // Clean up temporary schemes (created when applying without saving)
  function cleanupTempSchemes() {
    const tempSchemeNames = Array.from(customColorSchemes.keys()).filter(name => name.startsWith('_temp_'));
    if (tempSchemeNames.length > 0) {
      tempSchemeNames.forEach(name => customColorSchemes.delete(name));
      saveCustomSchemes();
    }
  }

  // Render saved schemes list
  function renderSavedSchemes() {
    savedSchemesList.innerHTML = '';

    // Filter out temporary schemes from display
    const savedSchemes = Array.from(customColorSchemes.entries()).filter(([name]) => !name.startsWith('_temp_'));

    if (savedSchemes.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'empty-schemes-message';
      emptyMsg.textContent = 'No custom schemes saved yet';
      savedSchemesList.appendChild(emptyMsg);
      return;
    }

    savedSchemes.forEach(([name, scheme]) => {
      const schemeItem = document.createElement('div');
      schemeItem.className = 'saved-scheme-item';

      const schemePreview = document.createElement('canvas');
      schemePreview.width = 200;
      schemePreview.height = 20;
      schemePreview.className = 'saved-scheme-preview';

      // Render preview
      const ctx = schemePreview.getContext('2d');
      for (let x = 0; x < schemePreview.width; x++) {
        const t = x / (schemePreview.width - 1);
        const color = computeColorFromGradient(t, scheme.stops);
        ctx.fillStyle = `rgb(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)})`;
        ctx.fillRect(x, 0, 1, schemePreview.height);
      }

      const schemeName = document.createElement('span');
      schemeName.className = 'saved-scheme-name';
      schemeName.textContent = name;

      const applySchemeBtn = document.createElement('button');
      applySchemeBtn.className = 'btn btn-small btn-icon';
      applySchemeBtn.type = 'button';
      applySchemeBtn.title = 'Apply';
      applySchemeBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16,14.5 L16,19 C16,19.5523 15.5523,20 15,20 L11.75,20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M16,6 L16,1 C16,0.447715 15.5523,0 15,0 L1,0 C0.447715,0 0,0.447715 0,1 L0,19 C0,19.5523 0.447715,20 1,20 L4,20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="4" x2="11" y1="6" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="7.5" x2="16" y1="20" y2="9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="4" x2="8" y1="10" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      `;

      const deleteSchemeBtn = document.createElement('button');
      deleteSchemeBtn.className = 'btn btn-small btn-danger btn-icon';
      deleteSchemeBtn.type = 'button';
      deleteSchemeBtn.title = 'Delete';
      deleteSchemeBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7.69231 8.70833H5V8.16667H9.84615M7.69231 8.70833V19H16.3077V8.70833M7.69231 8.70833H16.3077M16.3077 8.70833H19V8.16667H14.1538M9.84615 8.16667V6H14.1538V8.16667M9.84615 8.16667H14.1538" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 11V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 11V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14 11V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;

      schemeItem.appendChild(schemePreview);
      schemeItem.appendChild(schemeName);
      schemeItem.appendChild(applySchemeBtn);
      schemeItem.appendChild(deleteSchemeBtn);

      // Apply saved scheme
      applySchemeBtn.addEventListener('click', () => {
        // Set flag to prevent input event from interfering
        isApplyingScheme = true;

        // Store original stops for comparison (sorted by position)
        const stopsCopy = JSON.parse(JSON.stringify(scheme.stops));
        originalStops = sortStopsByPosition(stopsCopy);

        // Update scheme name input
        nameInput.value = name;

        // Update gradient editor to show the scheme's stops
        gradientEditor.setStops(stopsCopy);

        // Clear flag and update button text after everything is set
        setTimeout(() => {
          isApplyingScheme = false;
          updateSaveButtonText();
        }, 0);

        // Apply to fractal
        const params = getParams();
        params.colorScheme = `custom:${name}`;
        updateParams({ colorScheme: `custom:${name}` });
        renderFractal();
      });

      // Delete saved scheme
      deleteSchemeBtn.addEventListener('click', () => {
        if (confirm(`Delete scheme "${name}"?`)) {
          customColorSchemes.delete(name);
          saveCustomSchemes();
          renderSavedSchemes();
        }
      });

      savedSchemesList.appendChild(schemeItem);
    });
  }

  // Update button text when name input changes
  nameInput.addEventListener('input', () => {
    // Don't interfere if we're currently applying a scheme
    if (isApplyingScheme) {
      return;
    }

    const name = nameInput.value.trim();
    // If name matches an existing scheme and originalStops isn't set, set it
    if (customColorSchemes.has(name) && !originalStops) {
      const scheme = customColorSchemes.get(name);
      const stopsCopy = JSON.parse(JSON.stringify(scheme.stops));
      originalStops = sortStopsByPosition(stopsCopy);
    } else if (!customColorSchemes.has(name)) {
      // Clear original stops when name changes to a new scheme
      originalStops = null;
    }
    updateSaveButtonText();
  });
  nameInput.addEventListener('change', updateSaveButtonText);

  // Save scheme
  saveBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
      showNotification('Please enter a scheme name', 'warning', 3000);
      return;
    }

    const stops = gradientEditor.getStops();
    const isUpdate = customColorSchemes.has(name);
    customColorSchemes.set(name, { stops: JSON.parse(JSON.stringify(stops)) });
    saveCustomSchemes();
    renderSavedSchemes();

    if (isUpdate) {
      showNotification(`Scheme "${name}" updated!`, 'success', 3000);
      // Update original stops to match the newly saved version (sorted)
      const stopsCopy = JSON.parse(JSON.stringify(stops));
      originalStops = sortStopsByPosition(stopsCopy);
    } else {
      showNotification(`Scheme "${name}" saved!`, 'success', 3000);
      nameInput.value = '';
      originalStops = null;
    }
    updateSaveButtonText();
  });

  // Apply current gradient to fractal
  applyBtn.addEventListener('click', () => {
    const stops = gradientEditor.getStops();
    const tempName = `_temp_${Date.now()}`;
    customColorSchemes.set(tempName, { stops: JSON.parse(JSON.stringify(stops)) });
    saveCustomSchemes();

    const params = getParams();
    params.colorScheme = `custom:${tempName}`;
    updateParams({ colorScheme: `custom:${tempName}` });
    renderFractal();
  });

  // Export all palettes
  exportBtn.addEventListener('click', () => {
    // Filter out temporary schemes and create export data
    const palettes = [];
    customColorSchemes.forEach((scheme, name) => {
      if (!name.startsWith('_temp_')) {
        palettes.push({
          name: name,
          stops: scheme.stops,
        });
      }
    });

    if (palettes.length === 0) {
      showNotification('No custom palettes to export. Save at least one palette first.', 'warning', 4000);
      return;
    }

    const exportData = {
      version: '1.0',
      palettes: palettes,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fractalai_color_palettes.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Import palette
  importBtn.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        // Handle new format with multiple palettes
        if (data.palettes && Array.isArray(data.palettes)) {
          let importedCount = 0;
          let skippedCount = 0;

          data.palettes.forEach((palette) => {
            if (palette.name && palette.stops && Array.isArray(palette.stops)) {
              // Check if palette with this name already exists
              if (customColorSchemes.has(palette.name)) {
                skippedCount++;
              } else {
                customColorSchemes.set(palette.name, { stops: palette.stops });
                importedCount++;
              }
            }
          });

          if (importedCount > 0) {
            saveCustomSchemes();
            renderSavedSchemes();
            showNotification(`Imported ${importedCount} palette${importedCount > 1 ? 's' : ''}${skippedCount > 0 ? ` (${skippedCount} skipped - already exist)` : ''}!`, 'success', 4000);
          } else if (skippedCount > 0) {
            showNotification('All palettes already exist. No new palettes imported.', 'info', 4000);
          } else {
            showNotification('No valid palettes found in file.', 'warning', 4000);
          }
        }
        // Handle old single palette format for backward compatibility
        else if (data.stops && Array.isArray(data.stops)) {
          gradientEditor.setStops(data.stops);
          if (data.name) {
            nameInput.value = data.name;
          }
          showNotification('Palette imported successfully!', 'success', 3000);
        } else {
          showNotification('Invalid palette file format', 'error', 4000);
        }
      } catch (error) {
        showNotification('Failed to import palette: ' + error.message, 'error', 5000);
      }
    };
    reader.readAsText(file);
    importFileInput.value = '';
  });

  // Clean up temporary schemes on initialization
  cleanupTempSchemes();

  // Initialize
  renderSavedSchemes();
}

/**
 * Get custom color scheme by name
 * @param {string} name - Scheme name (without "custom:" prefix)
 * @returns {Object|null} Scheme data with stops array, or null if not found
 */
export function getCustomColorScheme(name) {
  return customColorSchemes.get(name) || null;
}

/**
 * Compute color for custom scheme
 * @param {number} t - Value from 0 to 1
 * @param {string} schemeName - Custom scheme name (with or without "custom:" prefix)
 * @returns {Float32Array} RGB color [r, g, b] in range [0, 1]
 */
export function computeColorForCustomScheme(t, schemeName) {
  // Remove "custom:" prefix if present
  const name = schemeName.startsWith('custom:') ? schemeName.slice(7) : schemeName;
  const scheme = getCustomColorScheme(name);
  if (!scheme) {
    // Fallback to classic
    return computeColorForScheme(t, 0);
  }
  return computeColorFromGradient(t, scheme.stops);
}

/**
 * Check if a color scheme name is a custom scheme
 * @param {string} schemeName - Scheme name
 * @returns {boolean} True if custom scheme
 */
export function isCustomScheme(schemeName) {
  return schemeName && schemeName.startsWith('custom:');
}

// Register custom scheme handler with utils
setCustomSchemeHandler((t, schemeName, out = null) => {
  return computeColorForCustomScheme(t, schemeName, out);
});

// Load custom schemes on module load
loadCustomSchemes();

