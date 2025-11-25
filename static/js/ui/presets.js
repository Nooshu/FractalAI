/**
 * Presets management for fractal images
 * Handles loading, displaying, and selecting preset fractal configurations
 */

let presetsData = [];

/**
 * Initialize the presets functionality
 * @param {Function} loadFractalFromPreset - Function to load fractal from preset data
 */
export function setupPresets(loadFractalFromPreset) {
    loadPresets();
    setupPresetInteractions(loadFractalFromPreset);
}

/**
 * Load preset images and their metadata
 */
async function loadPresets() {
    try {
        // Try to load presets manifest file
        const response = await fetch('/static/presets/presets.json');
        if (response.ok) {
            presetsData = await response.json();
            renderPresets();
        } else {
            // If no manifest file, scan directory (this would need server support)
            console.log('No presets manifest found. Add presets.json to static/presets/');
            showPlaceholder();
        }
    } catch (error) {
        console.log('Could not load presets:', error.message);
        showPlaceholder();
    }
}

/**
 * Render the presets grid
 */
function renderPresets() {
    const presetsGrid = document.getElementById('presets-grid');
    if (!presetsGrid) return;

    if (presetsData.length === 0) {
        showPlaceholder();
        return;
    }

    // Clear existing content
    presetsGrid.innerHTML = '';

    // Create preset items
    presetsData.forEach((preset, index) => {
        const presetItem = createPresetItem(preset, index);
        presetsGrid.appendChild(presetItem);
    });
}

/**
 * Create a preset item element
 * @param {Object} preset - Preset data
 * @param {number} index - Preset index
 * @returns {HTMLElement} Preset item element
 */
function createPresetItem(preset, index) {
    const item = document.createElement('div');
    item.className = 'preset-item';
    item.dataset.presetIndex = index;
    
    item.innerHTML = `
        <img 
            class="preset-image" 
            src="/static/presets/images/${preset.image}" 
            alt="${preset.title || 'Fractal Preset'}"
            loading="lazy"
        >
        <div class="preset-info">
            <div class="preset-title">${preset.title || 'Untitled'}</div>
            <div class="preset-details">
                ${preset.fractal || 'Unknown'} • ${preset.theme || 'Default'}
                ${preset.zoom ? `<br>Zoom: ${formatZoom(preset.zoom)}` : ''}
            </div>
        </div>
    `;

    return item;
}

/**
 * Format zoom value for display
 * @param {number} zoom - Zoom value
 * @returns {string} Formatted zoom string
 */
function formatZoom(zoom) {
    if (zoom >= 1000000) {
        return `${(zoom / 1000000).toFixed(1)}M`;
    } else if (zoom >= 1000) {
        return `${(zoom / 1000).toFixed(1)}K`;
    } else {
        return zoom.toFixed(1);
    }
}

/**
 * Show placeholder when no presets are available
 */
function showPlaceholder() {
    const presetsGrid = document.getElementById('presets-grid');
    if (!presetsGrid) return;

    presetsGrid.innerHTML = `
        <div class="preset-placeholder">
            <div class="placeholder-content">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21,15 16,10 5,21"/>
                </svg>
                <p>No presets available</p>
                <small>Add preset images to static/presets/images/</small>
            </div>
        </div>
    `;
}

/**
 * Setup preset interaction handlers
 * @param {Function} loadFractalFromPreset - Function to load fractal from preset data
 */
function setupPresetInteractions(loadFractalFromPreset) {
    const presetsGrid = document.getElementById('presets-grid');
    if (!presetsGrid) return;

    presetsGrid.addEventListener('click', (event) => {
        const presetItem = event.target.closest('.preset-item');
        if (!presetItem) return;

        const presetIndex = parseInt(presetItem.dataset.presetIndex);
        const preset = presetsData[presetIndex];
        
        if (preset && loadFractalFromPreset) {
            loadFractalFromPreset(preset);
            
            // Visual feedback
            presetItem.style.transform = 'scale(0.95)';
            setTimeout(() => {
                presetItem.style.transform = '';
            }, 150);
        }
    });
}

/**
 * Add a new preset (for future use)
 * @param {Object} presetData - Preset configuration data
 * @param {string} imagePath - Path to the preset image
 */
export function addPreset(presetData, imagePath) {
    const newPreset = {
        ...presetData,
        image: imagePath,
        id: Date.now().toString()
    };
    
    presetsData.push(newPreset);
    renderPresets();
    
    // Note: In a real implementation, this would also update the presets.json file
    console.log('Preset added:', newPreset);
}

/**
 * Get all presets data
 * @returns {Array} Array of preset objects
 */
export function getPresets() {
    return [...presetsData];
}

/**
 * Refresh presets from server
 */
export function refreshPresets() {
    loadPresets();
}
