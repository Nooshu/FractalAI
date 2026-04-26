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

  // regl throws if `.destroy()` is called more than once.
  // In fast resize / multi-resolution flows it’s easy for two cleanup paths to race,
  // so make framebuffer destruction idempotent.
  const originalDestroy = framebuffer.destroy?.bind(framebuffer);
  if (originalDestroy) {
    let destroyed = false;
    framebuffer.destroy = () => {
      // regl marks internal handles on destroy; avoid calling into regl if already gone.
      // (These are non-public but stable enough for a safety guard in our app code.)
      if (framebuffer._destroyed || framebuffer._framebuffer == null) return;
      if (destroyed) return;
      destroyed = true;
      try {
        originalDestroy();
      } catch (_error) {
        // best-effort cleanup
      }
    };
  }

  return framebuffer;
}
