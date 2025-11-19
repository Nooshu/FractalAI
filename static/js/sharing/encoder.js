/**
 * Fractal state encoding for sharing
 * Encodes fractal parameters into a URL-safe base64 string
 */

/**
 * Encode fractal state to a shareable string
 * @param {string} fractalType - Current fractal type
 * @param {Object} params - Fractal parameters
 * @returns {string} Encoded state string
 */
export function encodeFractalState(fractalType, params) {
  const state = {
    t: fractalType, // type
    c: params.colorScheme, // color scheme
    z: Math.round(params.zoom * 10000) / 10000, // zoom
    i: params.iterations, // iterations
    ox: Math.round(params.offset.x * 100000) / 100000, // offset x
    oy: Math.round(params.offset.y * 100000) / 100000, // offset y
    xs: Math.round(params.xScale * 100) / 100, // x scale
    ys: Math.round(params.yScale * 100) / 100, // y scale
  };

  // Add Julia parameters if it's a Julia type fractal
  const isJulia = fractalType.includes('julia') || fractalType === 'julia';
  if (isJulia && params.juliaC) {
    state.jx = Math.round(params.juliaC.x * 100000) / 100000; // julia c real
    state.jy = Math.round(params.juliaC.y * 100000) / 100000; // julia c imag
  }

  // Convert to base64 URL-safe string
  const json = JSON.stringify(state);
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

