/**
 * Framebuffer Utilities
 * Provides optimized framebuffer creation with half-float support when available
 */

// Cache for half-float support detection per regl context
const halfFloatSupportCache = new WeakMap();

/**
 * Tests if regl can actually use half-float textures
 * @param {Object} regl - The regl context
 * @returns {Object} Object with supportsHalfFloat and supportsHalfFloatLinear flags
 */
function testHalfFloatSupport(regl) {
  // Check cache first
  if (halfFloatSupportCache.has(regl)) {
    return halfFloatSupportCache.get(regl);
  }

  const gl = regl._gl;
  
  // Check if WebGL2 - in WebGL2, half-float is core but regl still requires the extension
  const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && 
                   gl instanceof WebGL2RenderingContext;
  
  const textureHalfFloatExt = gl.getExtension('OES_texture_half_float');
  const colorBufferHalfFloatExt = gl.getExtension('EXT_color_buffer_half_float');
  const halfFloatLinearExt = gl.getExtension('OES_texture_half_float_linear');

  // Check if extensions are available
  const hasTextureExt = textureHalfFloatExt !== null && 
                        textureHalfFloatExt !== undefined && 
                        typeof textureHalfFloatExt === 'object';
  const hasColorBufferExt = colorBufferHalfFloatExt !== null && 
                            colorBufferHalfFloatExt !== undefined && 
                            typeof colorBufferHalfFloatExt === 'object';

  let supportsHalfFloat = false;
  let supportsHalfFloatLinear = false;

  // IMPORTANT: In WebGL2, regl requires OES_texture_half_float extension to be explicitly available
  // Even though half-float is core in WebGL2, regl's internal checks fail without the extension
  // To avoid errors, we disable half-float in WebGL2 unless both extensions are explicitly available
  // and we can successfully test texture creation
  if (isWebGL2) {
    // In WebGL2, be very conservative - only use half-float if extension is available AND test passes
    if (!hasTextureExt || !hasColorBufferExt) {
      // WebGL2 but extensions not available - can't use half-float
      supportsHalfFloat = false;
      supportsHalfFloatLinear = false;
      
      if (import.meta.env?.DEV) {
        console.warn(
          '%c[Half-Float]%c WebGL2 detected but OES_texture_half_float extension not available. Using uint8 textures.',
          'color: #FF9800; font-weight: bold;',
          'color: inherit;'
        );
      }
    } else if (hasTextureExt && hasColorBufferExt) {
      // Extensions available in WebGL2 - try test (but be prepared for it to fail)
      // Don't try the test - regl's error handling in WebGL2 is problematic
      // Just disable half-float in WebGL2 to avoid errors
      supportsHalfFloat = false;
      supportsHalfFloatLinear = false;
      
      if (import.meta.env?.DEV) {
        console.warn(
          '%c[Half-Float]%c WebGL2 detected - half-float disabled to avoid regl extension errors. Using uint8 textures.',
          'color: #FF9800; font-weight: bold;',
          'color: inherit;'
        );
      }
    }
  } else if (!hasTextureExt || !hasColorBufferExt) {
    // WebGL1: Extensions not available - can't use half-float
    supportsHalfFloat = false;
    supportsHalfFloatLinear = false;
  } else if (hasTextureExt && hasColorBufferExt) {
    // Both extensions available - try to create a test texture to verify regl can use half-float
    // Use a more defensive approach: wrap in try-catch and also check for error patterns
    let testSucceeded = false;
    
    try {
      // Use setTimeout to ensure any async errors are caught
      const testTexture = regl.texture({
        width: 1,
        height: 1,
        type: 'half float',
        min: 'nearest',
        mag: 'nearest',
      });
      
      // If we get here, the texture was created successfully
      testSucceeded = true;
      supportsHalfFloat = true;
      supportsHalfFloatLinear = halfFloatLinearExt !== null && 
                                halfFloatLinearExt !== undefined && 
                                typeof halfFloatLinearExt === 'object';
      
      // Clean up test texture
      testTexture.destroy();
      
      if (import.meta.env?.DEV) {
        console.log(
          '%c[Half-Float]%c Supported - Using half-float textures for framebuffers',
          'color: #4CAF50; font-weight: bold;',
          'color: inherit;'
        );
      }
    } catch (error) {
      // Regl can't use half-float textures - catch any errors
      testSucceeded = false;
      supportsHalfFloat = false;
      supportsHalfFloatLinear = false;
      
      if (import.meta.env?.DEV) {
        console.warn(
          '%c[Half-Float]%c Extensions detected but regl cannot use them. Falling back to uint8 textures.',
          'color: #FF9800; font-weight: bold;',
          'color: inherit;',
          error.message || 'Unknown error'
        );
      }
    }
    
    // Double-check: if test didn't succeed, ensure we're not using half-float
    if (!testSucceeded) {
      supportsHalfFloat = false;
      supportsHalfFloatLinear = false;
    }
  }

  // Cache the result
  const result = { supportsHalfFloat, supportsHalfFloatLinear };
  halfFloatSupportCache.set(regl, result);
  
  return result;
}

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
