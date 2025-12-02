/**
 * Framebuffer Utilities
 * Provides optimized framebuffer creation
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
export function createOptimizedFramebuffer(regl, width, height, _webglCapabilities = null) {
  // DISABLED: Half-float texture support to avoid regl extension errors
  // Regl requires OES_texture_half_float extension to be explicitly available,
  // which causes errors even when half-float is core (WebGL2) or extensions exist
  // Always use uint8 textures for reliable operation
  
  // Create framebuffer with uint8 texture (always)
  const framebuffer = regl.framebuffer({
    width,
    height,
    color: regl.texture({
      width,
      height,
      type: 'uint8',
      min: 'linear',
      mag: 'linear',
    }),
    depth: false,
    stencil: false,
  });

  return framebuffer;
}
