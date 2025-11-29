/**
 * Fractal computation worker
 * Computes fractal tiles on CPU, returning scalar fields (GPU-ready format)
 */

import { computeColorForScheme } from '../fractals/utils.js';

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
  const centeredX = (px / canvasWidth) - 0.5;
  const centeredY = (py / canvasHeight) - 0.5;

  return {
    x: centeredX * scale * aspect * (params.xScale || 1.0) + params.offset.x,
    y: centeredY * scale * (params.yScale || 1.0) + params.offset.y,
  };
}

/**
 * Compute a fractal tile
 * @param {Object} request - Tile request
 * @returns {Object} Tile response with scalar field data
 */
function computeTile(request) {
  const startTime = performance.now();
  const { x, y, width, height, params, fractalType } = request;

  // Create Float32Array for scalar field (GPU-ready format)
  const data = new Float32Array(width * height);

  // Compute fractal for each pixel in the tile
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

  const computationTime = performance.now() - startTime;

  return {
    type: 'tile-response',
    tileId: request.tileId,
    data,
    metadata: {
      computationTime,
      width,
      height,
    },
  };
}

// Worker message handler
self.addEventListener('message', (event) => {
  const message = event.data;

  if (message.type === 'tile-request') {
    const response = computeTile(message);
    // Transfer the Float32Array to avoid copying
    self.postMessage(response, [response.data.buffer]);
  } else if (message.type === 'cancel') {
    // Cancel is handled by the pool, but we acknowledge it
    // In a more complex implementation, we could track in-flight work
  }
});

