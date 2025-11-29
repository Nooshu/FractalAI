/**
 * WebGL Capabilities Detection Module
 * Detects and stores WebGL version, extensions, and capabilities
 * Provides feature flags for WebGL2-specific optimizations
 */

/**
 * Detect WebGL capabilities
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - WebGL context
 * @returns {Object} Capabilities object
 */
export function detectWebGLCapabilities(gl) {
  if (!gl) {
    return {
      version: 0,
      isWebGL2: false,
      extensions: {},
      limits: {},
      features: {},
    };
  }

  // Check if WebGL2RenderingContext is available (may not be in test environments)
  const WebGL2RenderingContextClass =
    typeof WebGL2RenderingContext !== 'undefined' ? WebGL2RenderingContext : null;
  const isWebGL2 = WebGL2RenderingContextClass && gl instanceof WebGL2RenderingContextClass;
  const version = isWebGL2 ? 2 : 1;

  // Get all supported extensions
  const extensions = {};
  let supportedExtensions = [];

  try {
    if (typeof gl.getSupportedExtensions === 'function') {
      supportedExtensions = gl.getSupportedExtensions() || [];
    }
  } catch {
    // getSupportedExtensions not available (e.g., in test environments)
    supportedExtensions = [];
  }

  for (const extName of supportedExtensions) {
    try {
      if (typeof gl.getExtension === 'function') {
        const ext = gl.getExtension(extName);
        if (ext) {
          extensions[extName] = ext;
        }
      }
    } catch {
      // Extension exists but couldn't be retrieved
      extensions[extName] = null;
    }
  }

  // Get WebGL limits (with safe fallbacks for test environments)
  const getParam = (param, defaultValue = 0) => {
    try {
      if (typeof gl.getParameter === 'function') {
        return gl.getParameter(param);
      }
    } catch {
      // Parameter not available
    }
    return defaultValue;
  };

  const limits = {
    maxTextureSize: getParam(gl.MAX_TEXTURE_SIZE, 2048),
    maxViewportDims: getParam(gl.MAX_VIEWPORT_DIMS, [2048, 2048]),
    maxVertexAttribs: getParam(gl.MAX_VERTEX_ATTRIBS, 16),
    maxTextureImageUnits: getParam(gl.MAX_TEXTURE_IMAGE_UNITS, 8),
    maxCombinedTextureImageUnits: getParam(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS, 8),
    maxFragmentUniformVectors: getParam(gl.MAX_FRAGMENT_UNIFORM_VECTORS, 16),
    maxVertexUniformVectors: getParam(gl.MAX_VERTEX_UNIFORM_VECTORS, 16),
  };

  // WebGL2-specific limits
  if (isWebGL2 && gl.MAX_COLOR_ATTACHMENTS) {
    limits.maxColorAttachments = getParam(gl.MAX_COLOR_ATTACHMENTS, 4);
    limits.maxDrawBuffers = getParam(gl.MAX_DRAW_BUFFERS, 4);
    limits.maxUniformBufferBindings = getParam(gl.MAX_UNIFORM_BUFFER_BINDINGS, 24);
    limits.maxUniformBlockSize = getParam(gl.MAX_UNIFORM_BLOCK_SIZE, 16384);
    limits.maxVertexUniformBlocks = getParam(gl.MAX_VERTEX_UNIFORM_BLOCKS, 12);
    limits.maxFragmentUniformBlocks = getParam(gl.MAX_FRAGMENT_UNIFORM_BLOCKS, 12);
    limits.maxTextureArrayLayers = getParam(gl.MAX_ARRAY_TEXTURE_LAYERS, 256);
  }

  // Feature flags based on capabilities
  const features = {
    // WebGL2 core features
    uniformBufferObjects: isWebGL2,
    multipleRenderTargets: isWebGL2,
    textureArrays: isWebGL2,
    integerTextures: isWebGL2,
    immutableTextures: isWebGL2,
    textureViews:
      isWebGL2 && typeof gl.createTextureView === 'function' && gl.createTextureView !== undefined,

    // Extensions
    compressedTextures: {
      s3tc: !!extensions['WEBGL_compressed_texture_s3tc'],
      etc1: !!extensions['WEBGL_compressed_texture_etc1'],
      etc2: !!extensions['WEBGL_compressed_texture_etc'],
      astc: !!extensions['WEBGL_compressed_texture_astc'],
      bptc: !!extensions['EXT_texture_compression_bptc'],
    },
    halfFloat: {
      colorBuffer: !!extensions['EXT_color_buffer_half_float'],
      texture: !!extensions['OES_texture_half_float'],
      linear: !!extensions['OES_texture_half_float_linear'],
    },
    drawBuffers: {
      webgl2: isWebGL2,
      webgl1: !!extensions['WEBGL_draw_buffers'],
    },
    timerQuery: {
      webgl2: !!extensions['EXT_disjoint_timer_query_webgl2'],
      webgl1: !!extensions['EXT_disjoint_timer_query'],
    },
    standardDerivatives: !!extensions['OES_standard_derivatives'],
    shaderTextureLod: !!extensions['EXT_shader_texture_lod'],
    loseContext: !!extensions['WEBGL_lose_context'],
  };

  return {
    version,
    isWebGL2,
    extensions,
    limits,
    features,
    gl,
  };
}

/**
 * Get a formatted string of WebGL capabilities for logging
 * @param {Object} capabilities - Capabilities object from detectWebGLCapabilities
 * @returns {string} Formatted capabilities string
 */
export function formatCapabilities(capabilities) {
  const { version, isWebGL2, limits, features } = capabilities;
  const lines = [
    `WebGL Version: ${version}${isWebGL2 ? ' (WebGL2)' : ' (WebGL1)'}`,
    `Max Texture Size: ${limits.maxTextureSize}x${limits.maxTextureSize}`,
    `Max Viewport: ${limits.maxViewportDims[0]}x${limits.maxViewportDims[1]}`,
    `Max Texture Units: ${limits.maxTextureImageUnits}`,
  ];

  if (isWebGL2) {
    lines.push(`Max Color Attachments: ${limits.maxColorAttachments}`);
    lines.push(`Max Draw Buffers: ${limits.maxDrawBuffers}`);
    lines.push(`Max Uniform Buffer Bindings: ${limits.maxUniformBufferBindings}`);
  }

  const enabledFeatures = [];
  if (features.uniformBufferObjects) enabledFeatures.push('UBOs');
  if (features.multipleRenderTargets) enabledFeatures.push('MRT');
  if (features.textureArrays) enabledFeatures.push('Texture Arrays');
  if (features.integerTextures) enabledFeatures.push('Integer Textures');

  const compressedFormats = Object.entries(features.compressedTextures)
    .filter(([, supported]) => supported)
    .map(([format]) => format.toUpperCase());
  if (compressedFormats.length > 0) {
    enabledFeatures.push(`Compressed: ${compressedFormats.join(', ')}`);
  }

  if (enabledFeatures.length > 0) {
    lines.push(`Features: ${enabledFeatures.join(', ')}`);
  }

  return lines.join('\n');
}
