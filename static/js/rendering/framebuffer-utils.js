/**
 * Framebuffer Utilities
 * Provides optimized framebuffer creation with half-float support when available
 */

/**
 * Creates an optimized framebuffer for frame caching
 * Uses half-float textures when EXT_color_buffer_half_float is available for 2x memory savings
 * @param {Object} regl - The regl context
 * @param {number} width - Framebuffer width
 * @param {number} height - Framebuffer height
 * @param {Object} webglCapabilities - WebGL capabilities object (optional)
 * @returns {Object} regl framebuffer object
 */
export function createOptimizedFramebuffer(regl, width, height, webglCapabilities = null) {
  const gl = regl._gl;
  
  // Check for half-float support if capabilities not provided
  let supportsHalfFloat = false;
  let supportsHalfFloatLinear = false;
  
  if (webglCapabilities?.features?.halfFloat) {
    supportsHalfFloat = webglCapabilities.features.halfFloat.colorBuffer;
    supportsHalfFloatLinear = webglCapabilities.features.halfFloat.linear;
  } else {
    // Fallback: check extensions directly
    const halfFloatExt = gl.getExtension('EXT_color_buffer_half_float');
    const halfFloatLinearExt = gl.getExtension('OES_texture_half_float_linear');
    supportsHalfFloat = !!halfFloatExt;
    supportsHalfFloatLinear = !!halfFloatLinearExt;
  }

  // Determine texture type and filtering
  let textureType = 'uint8'; // Default to 8-bit unsigned integer
  let minFilter = 'linear';
  let magFilter = 'linear';

  if (supportsHalfFloat) {
    // Use half-float (16-bit) for 2x memory savings
    textureType = 'half float';
    
    // Only use linear filtering if the extension supports it
    if (!supportsHalfFloatLinear) {
      // Fallback to nearest if linear filtering not supported for half-float
      minFilter = 'nearest';
      magFilter = 'nearest';
    }
  }

  // Create framebuffer with optimized texture
  const framebuffer = regl.framebuffer({
    width,
    height,
    color: regl.texture({
      width,
      height,
      type: textureType,
      min: minFilter,
      mag: magFilter,
    }),
    depth: false,
    stencil: false,
  });

  return framebuffer;
}

