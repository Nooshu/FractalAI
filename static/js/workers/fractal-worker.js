/**
 * Fractal computation worker
 * Computes fractal tiles on CPU, returning scalar fields (GPU-ready format)
 * Supports WebAssembly SIMD acceleration when available
 */

// Note: computeColorForScheme is not used in worker - color mapping happens on main thread

// Lazy-load WASM SIMD utilities
let wasmSimdUtils = null;
let wasmInstance = null;
let wasmModule = null;

async function initWasmSimd() {
  if (wasmSimdUtils) {
    return; // Already initialized
  }

  try {
    wasmSimdUtils = await import('./wasm-simd-utils.js');
    const { canUseWasmSimd, loadWasmModule, instantiateWasmModule } = wasmSimdUtils;

    if (canUseWasmSimd()) {
      // Try to load WASM module (would load from file in production)
      wasmModule = await loadWasmModule();
      if (wasmModule) {
        wasmInstance = await instantiateWasmModule(wasmModule);
      }
    }
  } catch (error) {
    // WASM not available, continue with JavaScript
    if (import.meta.env?.DEV) {
      console.warn('WASM SIMD initialization failed:', error);
    }
  }
}

/**
 * Compute Mandelbrot set iteration count for a point
 * @param {number} cx - Real component
 * @param {number} cy - Imaginary component
 * @param {number} maxIterations - Maximum iterations
 * @returns {number} Iteration count (0 to maxIterations)
 */
function mandelbrotIterations(cx, cy, maxIterations) {
  let x = 0;
  let y = 0;
  let x2 = 0;
  let y2 = 0;
  let iterations = 0;

  while (x2 + y2 <= 4 && iterations < maxIterations) {
    y = 2 * x * y + cy;
    x = x2 - y2 + cx;
    x2 = x * x;
    y2 = y * y;
    iterations++;
  }

  return iterations;
}

/**
 * Compute Julia set iteration count for a point
 * @param {number} zx - Real component of z
 * @param {number} zy - Imaginary component of z
 * @param {number} cx - Real component of c
 * @param {number} cy - Imaginary component of c
 * @param {number} maxIterations - Maximum iterations
 * @returns {number} Iteration count (0 to maxIterations)
 */
function juliaIterations(zx, zy, cx, cy, maxIterations) {
  let x = zx;
  let y = zy;
  let x2 = x * x;
  let y2 = y * y;
  let iterations = 0;

  while (x2 + y2 <= 4 && iterations < maxIterations) {
    y = 2 * x * y + cy;
    x = x2 - y2 + cx;
    x2 = x * x;
    y2 = y * y;
    iterations++;
  }

  return iterations;
}

/**
 * Compute fractal for a single point
 * @param {number} cx - Real component
 * @param {number} cy - Imaginary component
 * @param {Object} params - Fractal parameters
 * @param {string} fractalType - Type of fractal
 * @returns {number} Normalized iteration value (0-1)
 */
function computeFractalPoint(cx, cy, params, fractalType) {
  const maxIterations = params.iterations;
  let iterations = 0;

  switch (fractalType) {
    case 'mandelbrot':
      iterations = mandelbrotIterations(cx, cy, maxIterations);
      break;
    case 'julia':
      if (params.juliaC) {
        iterations = juliaIterations(cx, cy, params.juliaC.x, params.juliaC.y, maxIterations);
      } else {
        iterations = mandelbrotIterations(cx, cy, maxIterations);
      }
      break;
    default:
      // Fallback to Mandelbrot for unknown types
      iterations = mandelbrotIterations(cx, cy, maxIterations);
  }

  // Normalize to 0-1 range
  return iterations / maxIterations;
}

/**
 * Convert pixel coordinates to complex plane coordinates
 * @param {number} px - Pixel X
 * @param {number} py - Pixel Y
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {Object} params - Fractal parameters
 * @returns {Object} Complex coordinates { x, y }
 */
function pixelToComplex(px, py, canvasWidth, canvasHeight, params) {
  const aspect = canvasWidth / canvasHeight;
  const scale = 4.0 / params.zoom;

  // Center the coordinates
  const centeredX = px / canvasWidth - 0.5;
  const centeredY = py / canvasHeight - 0.5;

  return {
    x: centeredX * scale * aspect * (params.xScale || 1.0) + params.offset.x,
    y: centeredY * scale * (params.yScale || 1.0) + params.offset.y,
  };
}

/**
 * Compute a fractal tile
 * @param {Object} request - Tile request
 * @returns {Promise<Object>} Promise resolving to tile response with scalar field data
 */
async function computeTile(request) {
  const startTime = performance.now();
  const { x, y, width, height, params, fractalType, sharedBuffer, useSharedBuffer } = request;

  // Initialize WASM SIMD if not already done
  await initWasmSimd();

  // Use SharedArrayBuffer if provided, otherwise create new array
  let data;
  if (useSharedBuffer && sharedBuffer) {
    // Create view on shared memory (zero-copy)
    data = new Float32Array(sharedBuffer);
  } else {
    // Create new Float32Array (will be transferred)
    data = new Float32Array(width * height);
  }

  // Try WASM SIMD first if available
  let useWasm = false;
  if (wasmSimdUtils && wasmInstance) {
    const { computeTileWasm, computeTileOptimized } = wasmSimdUtils;
    
    // Try WASM computation
    useWasm = computeTileWasm(wasmInstance, data, width, height, x, y, params, fractalType);
    
    // If WASM failed, use optimized JavaScript
    if (!useWasm) {
      computeTileOptimized(data, width, height, x, y, params, fractalType, computeFractalPoint);
    }
  } else {
    // Use optimized JavaScript computation
    if (wasmSimdUtils) {
      const { computeTileOptimized } = wasmSimdUtils;
      computeTileOptimized(data, width, height, x, y, params, fractalType, computeFractalPoint);
    } else {
      // Fallback to original implementation
      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          // Convert pixel coordinates to complex plane
          const complex = pixelToComplex(
            x + px,
            y + py,
            width, // Use tile dimensions for aspect ratio
            height,
            params
          );

          // Compute fractal value
          const value = computeFractalPoint(complex.x, complex.y, params, fractalType);

          // Store in scalar field (row-major order)
          data[py * width + px] = value;
        }
      }
    }
  }

  const computationTime = performance.now() - startTime;

  return {
    type: 'tile-response',
    tileId: request.tileId,
    data: useSharedBuffer ? null : data, // Don't send data if using shared buffer
    useSharedBuffer, // Indicate that data is in shared memory
    useWasm, // Indicate if WASM was used
    metadata: {
      computationTime,
      width,
      height,
    },
  };
}

// Worker message handler
self.addEventListener('message', async (event) => {
  const message = event.data;

  if (message.type === 'tile-request') {
    const response = await computeTile(message);
    
    if (response.useSharedBuffer) {
      // Data is already in shared memory, just send metadata
      // The main thread can read directly from the shared buffer
      self.postMessage(response);
    } else {
      // Transfer the Float32Array to avoid copying
      self.postMessage(response, [response.data.buffer]);
    }
  } else if (message.type === 'cancel') {
    // Cancel is handled by the pool, but we acknowledge it
    // In a more complex implementation, we could track in-flight work
  }
});
