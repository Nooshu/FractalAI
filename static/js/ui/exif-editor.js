/**
 * EXIF Editor Module
 * Handles drag-and-drop image upload, EXIF data editing, and image download with embedded metadata
 */

import piexif from 'piexifjs';

/**
 * Format theme name for display
 * @param {string} theme - Theme name to format
 * @returns {string} Formatted theme name
 */
function formatThemeName(theme) {
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
  return nameMap[theme] || theme.charAt(0).toUpperCase() + theme.slice(1);
}

/**
 * Format a number with appropriate precision
 * @param {number} value - Value to format
 * @param {number} precision - Decimal places
 * @returns {number} Formatted value
 */
function formatCoordinate(value, precision = 3) {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Generate EXIF data object from fractal parameters
 * @param {string} fractalType - Current fractal type
 * @param {Object} params - Fractal parameters
 * @returns {Object} EXIF data object
 */
function generateExifData(fractalType, params) {
  return {
    "FractalAI": {
      "version": "1.0",
      "fractal": fractalType || "mandelbrot",
      "zoom": formatCoordinate(params.zoom, 3),
      "offsetX": formatCoordinate(params.offset.x, 4),
      "offsetY": formatCoordinate(params.offset.y, 4),
      "theme": params.colorScheme || "classic",
      "timestamp": new Date().toISOString(),
      "generator": "FractalAI v2.0.0"
    }
  };
}

/**
 * Update current fractal data display
 * @param {Function} getCurrentFractalType - Function to get current fractal type
 * @param {Function} getParams - Function to get current parameters
 */
function updateCurrentFractalData(getCurrentFractalType, getParams) {
  const fractalType = getCurrentFractalType();
  const params = getParams();

  const elements = {
    fractalType: document.getElementById('current-fractal-type'),
    zoom: document.getElementById('current-zoom'),
    offsetX: document.getElementById('current-offset-x'),
    offsetY: document.getElementById('current-offset-y'),
    theme: document.getElementById('current-theme')
  };

  if (elements.fractalType) {
    elements.fractalType.textContent = fractalType || '-';
  }
  if (elements.zoom && params) {
    elements.zoom.textContent = formatCoordinate(params.zoom, 3);
  }
  if (elements.offsetX && params) {
    elements.offsetX.textContent = formatCoordinate(params.offset.x, 4);
  }
  if (elements.offsetY && params) {
    elements.offsetY.textContent = formatCoordinate(params.offset.y, 4);
  }
  if (elements.theme && params) {
    elements.theme.textContent = formatThemeName(params.colorScheme) || '-';
  }
}

/**
 * Convert file to data URL
 * @param {File} file - File to convert
 * @returns {Promise<string>} Data URL
 */
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Write EXIF data to image and trigger download
 * @param {string} imageDataURL - Image data URL
 * @param {Object} exifData - EXIF data to write
 * @param {string} filename - Original filename
 */
function writeExifAndDownload(imageDataURL, exifData, filename) {
  try {
    // Load existing EXIF data
    const exifObj = piexif.load(imageDataURL);
    
    // Add our fractal data to UserComment field
    exifObj.Exif[piexif.ExifIFD.UserComment] = JSON.stringify(exifData);
    
    // Dump EXIF data
    const exifBytes = piexif.dump(exifObj);
    
    // Insert EXIF data into image
    const newDataURL = piexif.insert(exifBytes, imageDataURL);
    
    // Create download link
    const link = document.createElement('a');
    link.href = newDataURL;
    link.download = filename.replace(/\.[^/.]+$/, '_with_exif.jpg');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Error writing EXIF data:', error);
    alert('Error writing EXIF data: ' + error.message);
    return false;
  }
}

/**
 * Setup EXIF editor functionality
 * @param {Function} getCurrentFractalType - Function to get current fractal type
 * @param {Function} getParams - Function to get current parameters
 */
export function setupExifEditor(getCurrentFractalType, getParams) {
  const dropZone = document.getElementById('image-drop-zone');
  const fileInput = document.getElementById('image-file-input');
  const imagePreview = document.getElementById('image-preview');
  const previewImage = document.getElementById('preview-image');
  const imageName = document.getElementById('image-name');
  const imageSize = document.getElementById('image-size');
  const jsonEditor = document.getElementById('exif-json-editor');
  const useCurrentDataBtn = document.getElementById('use-current-data-btn');
  const writeExifBtn = document.getElementById('write-exif-btn');
  const clearImageBtn = document.getElementById('clear-image-btn');

  let currentImageData = null;
  let currentFilename = '';

  // Helper function to reset the form
  const resetForm = () => {
    currentImageData = null;
    currentFilename = '';
    
    if (imagePreview) {
      imagePreview.style.display = 'none';
    }
    if (dropZone) {
      dropZone.style.display = 'block';
    }
    if (jsonEditor) {
      jsonEditor.value = '';
    }
    if (writeExifBtn) {
      writeExifBtn.disabled = true;
      writeExifBtn.style.display = 'flex';
    }
    if (clearImageBtn) {
      clearImageBtn.style.display = 'none';
    }
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Update current fractal data display
  const updateDisplay = () => updateCurrentFractalData(getCurrentFractalType, getParams);
  updateDisplay();

  // Update display when parameters change
  window.addEventListener('fractal-updated', updateDisplay);
  
  // Also listen for parameter changes (for fullscreen controls)
  const handleParamChange = () => {
    setTimeout(updateDisplay, 100); // Small delay to ensure state is updated
  };
  
  // Event handler functions for cleanup
  const handleChangeEvent = (e) => {
    if (e.target.matches('#color-scheme, #iterations, #fractal-type')) {
      handleParamChange();
    }
  };
  
  const handleInputEvent = (e) => {
    if (e.target.matches('#iterations, #julia-c-real, #julia-c-imag, #x-scale, #y-scale')) {
      handleParamChange();
    }
  };
  
  const handleClickEvent = (e) => {
    if (e.target.closest('.fullscreen-control-btn, .fullscreen-color-cycle-btn')) {
      handleParamChange();
    }
  };
  
  // Listen for various parameter change events
  document.addEventListener('change', handleChangeEvent);
  document.addEventListener('input', handleInputEvent);
  document.addEventListener('click', handleClickEvent);

  // Use current data button
  if (useCurrentDataBtn) {
    useCurrentDataBtn.addEventListener('click', () => {
      const fractalType = getCurrentFractalType();
      const params = getParams();
      const exifData = generateExifData(fractalType, params);
      
      if (jsonEditor) {
        jsonEditor.value = JSON.stringify(exifData, null, 2);
      }
    });
  }

  // Clear image button
  if (clearImageBtn) {
    clearImageBtn.addEventListener('click', () => {
      resetForm();
    });
  }

  // Handle file selection
  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG recommended).');
      return;
    }

    try {
      currentImageData = await fileToDataURL(file);
      currentFilename = file.name;

      // Show preview
      if (previewImage && imagePreview) {
        previewImage.src = currentImageData;
        imagePreview.style.display = 'block';
      }

      // Update file info
      if (imageName) {
        imageName.textContent = file.name;
      }
      if (imageSize) {
        imageSize.textContent = formatFileSize(file.size);
      }

      // Generate initial EXIF data
      const fractalType = getCurrentFractalType();
      const params = getParams();
      const exifData = generateExifData(fractalType, params);
      
      if (jsonEditor) {
        jsonEditor.value = JSON.stringify(exifData, null, 2);
      }

      // Enable write button and show clear button
      if (writeExifBtn) {
        writeExifBtn.disabled = false;
        writeExifBtn.style.display = 'flex';
      }
      
      if (clearImageBtn) {
        clearImageBtn.style.display = 'flex';
      }

      // Hide drop zone
      if (dropZone) {
        dropZone.style.display = 'none';
      }

    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file: ' + error.message);
    }
  };

  // File input change
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleFile(file);
      }
    });
  }

  // Drop zone click
  if (dropZone) {
    dropZone.addEventListener('click', () => {
      if (fileInput) {
        fileInput.click();
      }
    });

    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    });
  }

  // Write EXIF button
  if (writeExifBtn) {
    writeExifBtn.addEventListener('click', () => {
      if (!currentImageData) {
        alert('Please select an image first.');
        return;
      }

      if (!jsonEditor || !jsonEditor.value.trim()) {
        alert('Please enter EXIF data.');
        return;
      }

      try {
        const exifData = JSON.parse(jsonEditor.value);
        
        // Validate EXIF data structure
        if (!exifData.FractalAI) {
          throw new Error('Invalid EXIF data structure. Must contain "FractalAI" object.');
        }

        const success = writeExifAndDownload(currentImageData, exifData, currentFilename);
        
        if (success) {
          // Reset the form
          resetForm();
        }

      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Error parsing JSON: ' + error.message);
      }
    });
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('fractal-updated', updateDisplay);
    document.removeEventListener('change', handleChangeEvent);
    document.removeEventListener('input', handleInputEvent);
    document.removeEventListener('click', handleClickEvent);
  };
}
