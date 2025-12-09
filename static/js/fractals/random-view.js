/**
 * View Validation Module
 * Validates if fractal coordinates will produce an interesting view
 * Used by the discovery algorithm for heuristic screening
 */

/**
 * Validate if coordinates will produce an interesting view
 * Samples points and checks for variation in iteration counts
 * @param {Object} offset - View offset {x, y}
 * @param {number} zoom - View zoom level
 * @param {string} fractalType - Type of fractal
 * @param {Function} getParams - Getter for params
 * @param {Function} getCanvas - Getter for canvas
 * @returns {boolean} True if view is interesting
 */
export function isValidInterestingView(offset, zoom, fractalType, getParams, getCanvas) {
  const params = getParams();
  const canvas = getCanvas();
  // For geometric fractals and chaotic maps, they're generally always interesting
  if (
    fractalType === 'sierpinski' ||
    fractalType === 'sierpinski-arrowhead' ||
    fractalType === 'sierpinski-carpet' ||
    fractalType === 'sierpinski-pentagon' ||
    fractalType === 'sierpinski-hexagon' ||
    fractalType === 'sierpinski-gasket' ||
    fractalType === 'koch' ||
    fractalType === 'quadratic-koch' ||
    fractalType === 'minkowski-sausage' ||
    fractalType === 'cesaro' ||
    fractalType === 'vicsek' ||
    fractalType === 'cross' ||
    fractalType === 'box-variants' ||
    fractalType === 'h-tree' ||
    fractalType === 'h-tree-generalized' ||
    fractalType === 'heighway-dragon' ||
    fractalType === 'hilbert-curve' ||
    fractalType === 'sierpinski-curve' ||
    fractalType === 'twindragon' ||
    fractalType === 'terdragon' ||
    fractalType === 'binary-dragon' ||
    fractalType === 'folded-paper-dragon' ||
    fractalType === 'peano-curve' ||
    fractalType === 'popcorn' ||
    fractalType === 'rose' ||
    fractalType === 'mutant-mandelbrot' ||
    fractalType === 'cantor' ||
    fractalType === 'fat-cantor' ||
    fractalType === 'smith-volterra-cantor' ||
    fractalType === 'random-cantor'
  ) {
    return true;
  }

  // For Burning Ship, Buffalo, and Multibrot, use similar validation to Mandelbrot
  // (they're escape-time fractals with similar characteristics)
  if (fractalType === 'burning-ship' || fractalType === 'buffalo' || fractalType === 'multibrot') {
    fractalType = 'mandelbrot'; // Use same validation logic
  }

  // For Mandelbrot/Julia/Burning Ship/Buffalo, sample points to check for variation
  const samplePoints = 9; // 3x3 grid
  const iterations = params.iterations;
  // Cache canvas dimensions
  const canvasEl = canvas;
  const aspect = canvasEl.width / canvasEl.height;
  const scale = 4.0 / zoom;
  const scaleXAspect = scale * aspect * params.xScale;
  const scaleY = scale * params.yScale;

  let escapeCount = 0;
  let stayCount = 0;
  let midRangeCount = 0;

  // Pre-calculate constants
  const isMandelbrot = fractalType === 'mandelbrot';
  const maxCheckIter = Math.min(50, iterations);

  // Sample points across the view
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      // Sample at different positions in the view
      const u = (i + 0.5) / 3;
      const v = (j + 0.5) / 3;

      // Convert to fractal coordinates (optimized calculation)
      const cX = (u - 0.5) * scaleXAspect + offset.x;
      const cY = (v - 0.5) * scaleY + offset.y;

      // Quick iteration check (simplified Mandelbrot/Julia calculation)
      let zx = isMandelbrot ? 0 : cX;
      let zy = isMandelbrot ? 0 : cY;
      const cx = isMandelbrot ? cX : params.juliaC.x;
      const cy = isMandelbrot ? cY : params.juliaC.y;

      let iter = 0;
      let escaped = false;

      // Quick iteration (max 50 iterations for validation)
      for (let k = 0; k < maxCheckIter; k++) {
        const zx2 = zx * zx;
        const zy2 = zy * zy;
        if (zx2 + zy2 > 4.0) {
          escaped = true;
          iter = k;
          break;
        }
        const newZx = zx2 - zy2 + cx;
        zy = 2.0 * zx * zy + cy;
        zx = newZx;
      }

      if (escaped) {
        if (iter < 5) {
          escapeCount++; // Escaped very quickly (likely blank area)
        } else {
          midRangeCount++; // Escaped after some iterations (interesting boundary)
        }
      } else {
        stayCount++; // Never escaped (inside set)
      }
    }
  }

  // A view is interesting if:
  // 1. Not all points escape immediately (not all blank)
  // 2. Not all points stay in set (not all black)
  // 3. Has some variation (mix of escape times)
  const hasVariation = escapeCount > 0 && stayCount > 0;
  const hasMidRange = midRangeCount > 0;
  const notAllBlank = escapeCount < samplePoints;
  const notAllBlack = stayCount < samplePoints;

  // Also check if we're in a reasonable range for Mandelbrot
  if (isMandelbrot) {
    // Use squared distance to avoid sqrt calculation
    const distSquared = offset.x * offset.x + offset.y * offset.y;
    // If too far from origin at low zoom, likely blank (compare squared: 2.5^2 = 6.25)
    if (zoom < 10 && distSquared > 6.25) {
      return false;
    }
  }

  return (hasVariation || hasMidRange) && notAllBlank && notAllBlack;
}
