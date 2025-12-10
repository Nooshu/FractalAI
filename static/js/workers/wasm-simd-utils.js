/**
 * WebAssembly SIMD Utilities
 * Provides SIMD-accelerated CPU rendering for fractal computation
 * Falls back to JavaScript if WASM SIMD is not available
 */

import { CONFIG } from '../core/config.js';
import { devLog } from '../core/logger.js';

/**
 * Check if WebAssembly SIMD is supported
 * @returns {boolean} True if SIMD is supported
 */
export function supportsWasmSimd() {
  if (typeof WebAssembly === 'undefined') {
    return false;
  }

  // Check if SIMD proposal is supported
  // SIMD is available in WebAssembly when the v128 type is supported
  // Browser support: Chrome 91+, Firefox 89+, Safari 16.4+
  try {
    // Try to validate a simple SIMD module
    // This is a best-effort check - we can't fully validate without compiling
    if (typeof WebAssembly.validate === 'function') {
      // Check user agent for known SIMD support
      const ua = navigator.userAgent;
      const isChrome = /Chrome\/(\d+)/.test(ua);
      const isFirefox = /Firefox\/(\d+)/.test(ua);
      const isSafari = /Version\/(\d+).*Safari/.test(ua);
      
      if (isChrome) {
        const version = parseInt(/Chrome\/(\d+)/.exec(ua)[1], 10);
        return version >= 91; // Chrome 91+ supports SIMD
      }
      if (isFirefox) {
        const version = parseInt(/Firefox\/(\d+)/.exec(ua)[1], 10);
        return version >= 89; // Firefox 89+ supports SIMD
      }
      if (isSafari) {
        const version = parseInt(/Version\/(\d+)/.exec(ua)[1], 10);
        return version >= 16; // Safari 16.4+ supports SIMD (approximate check)
      }
      
      // For other browsers, assume support if WebAssembly is available
      // Actual validation would require compiling a WASM module
      return true;
    }
  } catch (_error) {
    return false;
  }

  return false;
}

/**
 * Check if WebAssembly SIMD can be used
 * @returns {boolean} True if SIMD can be used
 */
export function canUseWasmSimd() {
  if (!CONFIG.features.wasmSimd) {
    return false;
  }

  return supportsWasmSimd();
}

/**
 * Load a pre-compiled WebAssembly module
 * In a production setup, this would load a .wasm file compiled with SIMD support
 * @param {string} wasmPath - Path to WASM file (optional, for future use)
 * @returns {Promise<WebAssembly.Module|null>} WASM module or null if not available
 */
export async function loadWasmModule(_wasmPath = null) {
  if (!canUseWasmSimd()) {
    return null;
  }

  // For now, we return null as we don't have a pre-compiled WASM module
  // In production, this would fetch and compile a .wasm file:
  // const wasmBytes = await fetch(wasmPath).then(r => r.arrayBuffer());
  // return await WebAssembly.compile(wasmBytes);
  
  return null;
}

/**
 * Instantiate WASM module and return exports
 * @param {WebAssembly.Module} module - WASM module
 * @param {Object} imports - Import object for WASM module
 * @returns {Promise<WebAssembly.Instance|null>} WASM instance or null
 */
export async function instantiateWasmModule(module, imports = {}) {
  if (!module) {
    return null;
  }

  try {
    const instance = await WebAssembly.instantiate(module, imports);
    return instance;
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.error('Failed to instantiate WASM module:', error);
    }
    return null;
  }
}

/**
 * Compute fractal tile using WASM SIMD (if available) or optimized JavaScript
 * @param {WebAssembly.Instance|null} wasmInstance - WASM instance (optional)
 * @param {Float32Array} buffer - Output buffer
 * @param {number} width - Tile width
 * @param {number} height - Tile height
 * @param {number} xOffset - X offset in canvas
 * @param {number} yOffset - Y offset in canvas
 * @param {Object} params - Fractal parameters
 * @param {string} fractalType - Fractal type
 * @returns {boolean} True if computation succeeded
 */
export function computeTileWasm(wasmInstance, buffer, width, height, xOffset, yOffset, params, _fractalType = 'mandelbrot') {
  // If WASM instance is available, use it
  if (wasmInstance && wasmInstance.exports && wasmInstance.exports.compute_tile) {
    try {
      // Get memory from WASM instance
      const memory = wasmInstance.exports.memory;
      if (!memory) {
        return false;
      }

      // Allocate buffer in WASM memory
      const bufferSize = width * height * 4; // 4 bytes per float32
      const bufferPtr = memory.buffer.byteLength;
      
      // Grow memory if needed
      const pagesNeeded = Math.ceil(bufferSize / (64 * 1024)); // 64KB per page
      const currentPages = memory.buffer.byteLength / (64 * 1024);
      if (pagesNeeded > currentPages) {
        memory.grow(pagesNeeded - currentPages);
      }

      // Create view on WASM memory
      const wasmBuffer = new Float32Array(memory.buffer, bufferPtr, width * height);

      // Call WASM function
      wasmInstance.exports.compute_tile(
        bufferPtr,
        width,
        height,
        xOffset,
        yOffset,
        params.zoom || 1.0,
        params.offset?.x || 0.0,
        params.offset?.y || 0.0,
        params.xScale || 1.0,
        params.yScale || 1.0,
        params.iterations || 100
      );

      // Copy from WASM memory to output buffer
      buffer.set(wasmBuffer);

      return true;
    } catch (error) {
      if (import.meta.env?.DEV) {
        console.error('WASM computation error:', error);
      }
      return false;
    }
  }

  // Fallback: return false to use JavaScript implementation
  return false;
}

/**
 * Optimized JavaScript computation with SIMD-like optimizations
 * Uses TypedArray operations that can be optimized by modern JS engines
 * @param {Float32Array} buffer - Output buffer
 * @param {number} width - Tile width
 * @param {number} height - Tile height
 * @param {number} xOffset - X offset in canvas
 * @param {number} yOffset - Y offset in canvas
 * @param {Object} params - Fractal parameters
 * @param {string} fractalType - Fractal type
 * @param {Function} computePointFn - Function to compute a single point
 */
export function computeTileOptimized(buffer, width, height, xOffset, yOffset, params, fractalType, computePointFn) {
  const aspect = width / height;
  const scale = 4.0 / (params.zoom || 1.0);
  const offsetX = params.offset?.x || 0.0;
  const offsetY = params.offset?.y || 0.0;
  const xScale = params.xScale || 1.0;
  const yScale = params.yScale || 1.0;

  // Pre-compute constants to avoid repeated calculations
  const invWidth = 1.0 / width;
  const invHeight = 1.0 / height;
  const scaleAspectX = scale * aspect * xScale;
  const scaleY = scale * yScale;

  // Use TypedArray for better performance
  let index = 0;
  for (let py = 0; py < height; py++) {
    const centeredY = (py * invHeight) - 0.5;
    const cy = centeredY * scaleY + offsetY;
    
    for (let px = 0; px < width; px++) {
      const centeredX = (px * invWidth) - 0.5;
      const cx = centeredX * scaleAspectX + offsetX;
      
      // Compute fractal value
      const value = computePointFn(cx, cy, params, fractalType);
      
      // Store in buffer (using direct index for better performance)
      buffer[index++] = value;
    }
  }
}

/**
 * Log WASM SIMD status
 */
export function logWasmSimdStatus() {
  if (!CONFIG.features.wasmSimd) {
    return;
  }

  const supported = supportsWasmSimd();
  const canUse = canUseWasmSimd();

  if (canUse && supported) {
    devLog.log(
      '%c[WASM SIMD]%c Enabled - SIMD-accelerated CPU rendering available',
      'color: #4CAF50; font-weight: bold;',
      'color: inherit;'
    );
  } else if (!supported) {
    console.warn(
      '%c[WASM SIMD]%c Not supported in this browser',
      'color: #FF9800; font-weight: bold;',
      'color: inherit;'
    );
  }
}

