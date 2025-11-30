/**
 * SharedArrayBuffer Utilities
 * Provides zero-copy worker communication using SharedArrayBuffer
 * Requires COOP/COEP headers to be enabled
 */

import { CONFIG } from '../core/config.js';
import { supportsSharedArrayBuffer } from './feature-detection.js';

/**
 * Check if SharedArrayBuffer is available and enabled
 * @returns {boolean} True if SharedArrayBuffer can be used
 */
export function canUseSharedArrayBuffer() {
  if (!CONFIG.features.sharedArrayBuffer) {
    return false;
  }

  if (!supportsSharedArrayBuffer()) {
    return false;
  }

  // Check if COOP/COEP headers are present
  // SharedArrayBuffer requires these headers to be available
  // We can't directly check headers, but we can verify SharedArrayBuffer works
  try {
    // Try to create a small SharedArrayBuffer to verify it's actually available
    const testBuffer = new SharedArrayBuffer(4);
    const testView = new Int32Array(testBuffer);
    testView[0] = 1;
    
    // If we can read it back, SharedArrayBuffer is functional
    if (testView[0] === 1) {
      return true;
    }
  } catch (error) {
    // SharedArrayBuffer exists but may not be functional (missing headers)
    if (import.meta.env?.DEV) {
      console.warn(
        '%c[SharedArrayBuffer]%c Available but may not be functional. Ensure COOP/COEP headers are set.',
        'color: #FF9800; font-weight: bold;',
        'color: inherit;'
      );
    }
    return false;
  }

  return false;
}

/**
 * Create a SharedArrayBuffer for image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Object|null} Object with buffer and view, or null if not available
 */
export function createSharedImageBuffer(width, height) {
  if (!canUseSharedArrayBuffer()) {
    return null;
  }

  try {
    // Create SharedArrayBuffer for RGBA data (4 bytes per pixel)
    const bufferSize = width * height * 4;
    const sharedBuffer = new SharedArrayBuffer(bufferSize);
    const view = new Uint8Array(sharedBuffer);

    return {
      buffer: sharedBuffer,
      view,
      width,
      height,
      size: bufferSize,
    };
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.error('Failed to create SharedArrayBuffer:', error);
    }
    return null;
  }
}

/**
 * Create a SharedArrayBuffer for scalar field data (iteration counts)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Object|null} Object with buffer and view, or null if not available
 */
export function createSharedScalarBuffer(width, height) {
  if (!canUseSharedArrayBuffer()) {
    return null;
  }

  try {
    // Create SharedArrayBuffer for scalar data (4 bytes per pixel for float32)
    const bufferSize = width * height * 4;
    const sharedBuffer = new SharedArrayBuffer(bufferSize);
    const view = new Float32Array(sharedBuffer);

    return {
      buffer: sharedBuffer,
      view,
      width,
      height,
      size: bufferSize,
    };
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.error('Failed to create SharedArrayBuffer for scalar data:', error);
    }
    return null;
  }
}

/**
 * Check if COOP/COEP headers are likely present
 * This is a best-effort check since we can't directly access headers
 * @returns {boolean} True if headers are likely present
 */
export function checkCOOPCOEPHeaders() {
  if (!supportsSharedArrayBuffer()) {
    return false;
  }

  try {
    // If SharedArrayBuffer is available and we can create one,
    // it's likely that COOP/COEP headers are present
    const testBuffer = new SharedArrayBuffer(4);
    const testView = new Int32Array(testBuffer);
    testView[0] = 42;
    
    // If we can read it back, headers are likely present
    return testView[0] === 42;
  } catch (error) {
    return false;
  }
}

/**
 * Log SharedArrayBuffer status and requirements
 */
export function logSharedArrayBufferStatus() {
  if (!CONFIG.features.sharedArrayBuffer) {
    return;
  }

  const available = supportsSharedArrayBuffer();
  const canUse = canUseSharedArrayBuffer();
  const headersPresent = checkCOOPCOEPHeaders();

  if (import.meta.env?.DEV) {
    if (available && canUse && headersPresent) {
      console.log(
        '%c[SharedArrayBuffer]%c Enabled - Zero-copy worker communication active',
        'color: #4CAF50; font-weight: bold;',
        'color: inherit;'
      );
    } else if (available && !canUse) {
      console.warn(
        '%c[SharedArrayBuffer]%c Available but not functional. Ensure these headers are set:\n  Cross-Origin-Opener-Policy: same-origin\n  Cross-Origin-Embedder-Policy: require-corp',
        'color: #FF9800; font-weight: bold;',
        'color: inherit;'
      );
    } else if (!available) {
      console.warn(
        '%c[SharedArrayBuffer]%c Not available in this browser',
        'color: #FF9800; font-weight: bold;',
        'color: inherit;'
      );
    }
  }
}

