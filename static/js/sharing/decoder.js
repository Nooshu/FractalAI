/**
 * Fractal state decoding for sharing
 * Decodes URL-safe base64 string back to fractal parameters
 */

/**
 * Decode fractal state from a shareable string
 * @param {string} encoded - Encoded state string
 * @returns {Object|null} Decoded state object or null if invalid
 */
export function decodeFractalState(encoded) {
  try {
    // Decode base64 URL-safe string
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    const json = atob(base64);
    const state = JSON.parse(json);

    return {
      fractalType: state.t || 'mandelbrot',
      colorScheme: state.c || 'classic',
      zoom: state.z || 1,
      iterations: state.i || 125,
      offsetX: state.ox || 0,
      offsetY: state.oy || 0,
      xScale: state.xs || 1.0,
      yScale: state.ys || 1.0,
      juliaCX: state.jx,
      juliaCY: state.jy,
    };
  } catch (error) {
    console.error('Failed to decode fractal state:', error);
    return null;
  }
}

