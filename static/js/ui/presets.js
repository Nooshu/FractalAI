/**
 * Presets management for fractal images
 * Handles loading, displaying, and selecting preset fractal configurations
 */

import piexif from 'piexifjs';

let presetsData = [];

/**
 * Read EXIF data from an image URL
 * @param {string} imageUrl - URL of the image to read EXIF from
 * @returns {Promise<Object|null>} EXIF fractal data or null if not found
 */
async function readExifFromImage(imageUrl) {
  try {
    // Fetch the image as a blob
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();

    // Only try to read EXIF from JPEG images
    if (!blob.type.includes('jpeg') && !blob.type.includes('jpg')) {
      return null;
    }

    // Convert blob to array buffer for piexif
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Convert to binary string for piexif
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }

    // Load EXIF data using piexif
    const exifObj = piexif.load(binaryString);

    // Check for fractal data in UserComment field
    if (exifObj.Exif && exifObj.Exif[piexif.ExifIFD.UserComment]) {
      const userComment = exifObj.Exif[piexif.ExifIFD.UserComment];

      // Parse the JSON data from UserComment
      const fractalData = JSON.parse(userComment);

      // Return the FractalAI data if it exists
      if (fractalData.FractalAI) {
        return fractalData.FractalAI;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Initialize the presets functionality
 * @param {Function} loadFractalFromPreset - Function to load fractal from preset data
 */
export async function setupPresets(loadFractalFromPreset) {
    // Set up interactions first (they use event delegation, so they'll work even if items are added later)
    setupPresetInteractions(loadFractalFromPreset);
    // Then load and render presets (await to ensure presets are loaded)
    await loadPresets();
}


/**
 * Load preset images from directory only (no JSON file)
 */
async function loadPresets() {
    // Start with empty presets - only use images from directory
    presetsData = [];

    // Scan for images and create presets from them
    await autoScanAndUpdatePresets();
}

/**
 * Automatically scan for EXIF data and update presets on load
 */
async function autoScanAndUpdatePresets() {
    try {
        // Show loading indicator
        showLoadingIndicator();

        const scannedPresets = await scanPresetsFromImages();

        if (scannedPresets.length > 0) {
            // Update presets data in memory
            updatePresetsDataFromScan(scannedPresets);
        }

        // Render the presets (whether from EXIF or empty)
        renderPresets();

    } catch {
        // Still render whatever presets we have
        renderPresets();
    }
}

/**
 * Update presets data in memory from scanned images (replaces any existing data)
 * @param {Array} scannedPresets - Array of preset objects from image scanning
 */
function updatePresetsDataFromScan(scannedPresets) {
    // Replace all presets data with scanned data (no merging with JSON)
    presetsData = [...scannedPresets];

    // Sort presets by order number
    presetsData.sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : 999;
        const orderB = b.order !== undefined ? b.order : 999;
        return orderA - orderB;
    });
}

/**
 * Show loading indicator while scanning
 */
function showLoadingIndicator() {
    const presetsGrid = document.getElementById('presets-grid');
    if (!presetsGrid) return;

    presetsGrid.innerHTML = `
        <div class="preset-loading">
            <div class="loading-content">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="loading-spinner">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                <p>Scanning images for EXIF data...</p>
                <small>This may take a moment</small>
            </div>
        </div>
    `;
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
            onerror="this.style.display='none'"
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

    presetsGrid.addEventListener('click', async (event) => {
        const presetItem = event.target.closest('.preset-item');
        if (!presetItem) return;

        const presetIndex = parseInt(presetItem.dataset.presetIndex);
        const preset = presetsData[presetIndex];

        if (preset && loadFractalFromPreset) {
            // Visual feedback - start loading state
            presetItem.style.transform = 'scale(0.95)';
            presetItem.style.opacity = '0.7';

            try {
                // Try to read EXIF data from the image
                const imageUrl = `/static/presets/images/${preset.image}`;
                const exifData = await readExifFromImage(imageUrl);

                let finalPreset = preset;

                if (exifData) {
                    // Use EXIF data if available, with fallback to JSON preset data
                    finalPreset = {
                        ...preset, // Keep original data as fallback
                        fractal: exifData.fractal || preset.fractal,
                        zoom: exifData.zoom !== undefined ? exifData.zoom : preset.zoom,
                        offsetX: exifData.offsetX !== undefined ? exifData.offsetX : preset.offsetX,
                        offsetY: exifData.offsetY !== undefined ? exifData.offsetY : preset.offsetY,
                        theme: exifData.theme || preset.theme
                    };
                } else {
                    console.log('No EXIF data found, using JSON preset data');
                }

                // Load the fractal with the final preset data
                loadFractalFromPreset(finalPreset);

            } catch (error) {
                console.error('Error loading preset:', error);
                // Fallback to original preset data
                loadFractalFromPreset(preset);
            } finally {
                // Reset visual feedback
                setTimeout(() => {
                    presetItem.style.transform = '';
                    presetItem.style.opacity = '';
                }, 150);
            }
        }
    });
}

/**
 * Scan all preset images and extract EXIF data
 * @returns {Promise<Array>} Array of preset objects with EXIF data
 */
async function scanPresetsFromImages() {
  try {
    // First, get list of image files from the presets/images directory
    const imageFiles = await getPresetImageFiles();
    const scannedPresets = [];

    for (const imageFile of imageFiles) {
      try {
        const imageUrl = `/static/presets/images/${imageFile}`;

        const exifData = await readExifFromImage(imageUrl);

        // Parse filename for order and title
        const parsed = parseFilename(imageFile);

        if (exifData) {
          // Create preset object from EXIF data with filename-based order and title
          const preset = {
            id: generatePresetId(imageFile),
            title: generatePresetTitle(imageFile, exifData),
            image: imageFile,
            fractal: exifData.fractal || 'mandelbrot',
            zoom: exifData.zoom || 1,
            offsetX: exifData.offsetX || 0,
            offsetY: exifData.offsetY || 0,
            theme: exifData.theme || 'Classic',
            iterations: exifData.iterations,
            description: exifData.description || `Generated from ${imageFile}`,
            order: parsed.order, // Add order from filename
            lastUpdated: new Date().toISOString(),
            hasExifData: true
          };

          scannedPresets.push(preset);
        } else {
          // Even without EXIF data, create preset from filename
          const preset = {
            id: generatePresetId(imageFile),
            title: parsed.title,
            image: imageFile,
            fractal: 'mandelbrot', // Default fractal type
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
            theme: 'Classic',
            description: `Generated from ${imageFile}`,
            order: parsed.order,
            lastUpdated: new Date().toISOString(),
            hasExifData: false
          };

          scannedPresets.push(preset);
        }
      } catch {
        // Skip files that can't be processed
      }
    }

    return scannedPresets;
  } catch (error) {
    console.error('Error scanning preset images:', error);
    return [];
  }
}

/**
 * Get list of JPG files from presets directory in the format: [number]-[title]-[title].jpg
 * @returns {Promise<Array>} Array of image filenames
 */
async function getPresetImageFiles() {
  const imageFiles = [];

  // First, try to load manifest.json (generated by build script)
  try {
    const manifestResponse = await fetch('/static/presets/images/manifest.json');
    if (manifestResponse.ok) {
      const manifest = await manifestResponse.json();
      if (manifest.images && Array.isArray(manifest.images)) {
        return manifest.images;
      }
    }
  } catch {
    // Manifest not available, try directory listing
  }

  // Fallback: Try to get directory listing and parse for JPG files
  try {
    const response = await fetch('/static/presets/images/', {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (response.ok) {
      const html = await response.text();

      // Parse HTML directory listing for JPG files matching pattern: [number]-[title]-[title].jpg
      const linkMatches = html.match(/<a[^>]+href="([^"]+)"[^>]*>/gi) || [];

      for (const linkMatch of linkMatches) {
        const hrefMatch = linkMatch.match(/href="([^"]+)"/i);
        if (hrefMatch) {
          const filename = hrefMatch[1];

          // Check if it's a JPG file matching our pattern: digits-word-word.jpg
          if (filename.match(/^\d{2}-[\w-]+-[\w-]+\.jpg$/i)) {
            imageFiles.push(filename);
          }
        }
      }

      if (imageFiles.length > 0) {
        return imageFiles;
      }
    }
  } catch {
    // Directory listing not available
  }

  return imageFiles;
}

/**
 * Generate a preset ID from filename
 * @param {string} filename - Image filename
 * @returns {string} Generated preset ID
 */
function generatePresetId(filename) {
  const parsed = parseFilename(filename);

  // Use clean filename part for ID generation
  return parsed.cleanFilename
    .replace(/[^a-zA-Z0-9]/g, '_') // Replace non-alphanumeric with underscore
    .toLowerCase();
}

/**
 * Parse filename to extract order and title
 * @param {string} filename - Image filename (e.g., "01-rainbow-mandelbrot.jpg")
 * @returns {Object} Object with order, title, and cleanFilename
 */
function parseFilename(filename) {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  // Check if filename starts with number pattern (e.g., "01-", "02-", etc.)
  const orderMatch = nameWithoutExt.match(/^(\d+)-(.+)$/);

  if (orderMatch) {
    const orderNumber = parseInt(orderMatch[1], 10);
    const titlePart = orderMatch[2];

    // Convert title part: replace hyphens/underscores with spaces and capitalize
    const title = titlePart
      .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
      .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize each word

    return {
      order: orderNumber,
      title: title,
      cleanFilename: titlePart
    };
  }

  // Fallback for files without order prefix
  const title = nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  return {
    order: 999, // Put unordered files at the end
    title: title,
    cleanFilename: nameWithoutExt
  };
}

/**
 * Generate a preset title from filename and EXIF data
 * @param {string} filename - Image filename
 * @param {Object} exifData - EXIF data
 * @returns {string} Generated title
 */
function generatePresetTitle(filename, exifData) {
  // If EXIF has a title, use it
  if (exifData && exifData.title) return exifData.title;

  // Otherwise, parse the filename for title
  const parsed = parseFilename(filename);
  return parsed.title;
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
