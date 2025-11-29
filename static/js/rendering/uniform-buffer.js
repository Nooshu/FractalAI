/**
 * Uniform Buffer Object (UBO) Manager for WebGL2
 * Provides efficient uniform updates using UBOs when WebGL2 is available
 * Falls back to regular uniforms for WebGL1
 */

/**
 * Creates a uniform buffer object for fractal parameters
 * Uses std140 layout for compatibility
 * @param {Object} regl - The regl context
 * @param {Object} webglCapabilities - WebGL capabilities object
 * @returns {Object|null} UBO buffer object or null if not supported
 */
export function createFractalParamsUBO(regl, webglCapabilities) {
  if (!webglCapabilities || !webglCapabilities.isWebGL2) {
    return null; // UBOs only available in WebGL2
  }

  const gl = regl._gl;
  if (!(gl instanceof WebGL2RenderingContext)) {
    return null;
  }

  // std140 layout: each float is 4 bytes, vec2 is 8 bytes (aligned to 8 bytes)
  // Layout: uIterations (4), uZoom (4), uOffset (8), uJuliaC (8), uScale (8)
  // Total: 32 bytes (8 floats)
  const bufferSize = 8 * 4; // 8 floats * 4 bytes each

  // Create WebGL2 uniform buffer
  const glBuffer = gl.createBuffer();
  gl.bindBuffer(gl.UNIFORM_BUFFER, glBuffer);
  gl.bufferData(gl.UNIFORM_BUFFER, bufferSize, gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.UNIFORM_BUFFER, null);

  return {
    glBuffer,
    gl,
    update: (params) => {
      // Update buffer data with current parameters
      // std140 layout: floats are 4-byte aligned, vec2s are 8-byte aligned
      const data = new Float32Array([
        params.iterations || 0, // uIterations
        params.zoom || 1.0, // uZoom
        params.offset?.x || 0.0, // uOffset.x
        params.offset?.y || 0.0, // uOffset.y
        params.juliaC?.x || 0.0, // uJuliaC.x
        params.juliaC?.y || 0.0, // uJuliaC.y
        params.xScale || 1.0, // uScale.x (xScale)
        params.yScale || 1.0, // uScale.y (yScale)
      ]);

      gl.bindBuffer(gl.UNIFORM_BUFFER, glBuffer);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);
      gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    },
    bind: (program, blockName = 'FractalParams', bindingPoint = 0) => {
      const blockIndex = gl.getUniformBlockIndex(program, blockName);
      if (blockIndex !== gl.INVALID_INDEX) {
        gl.uniformBlockBinding(program, blockIndex, bindingPoint);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, glBuffer);
        return true;
      }
      return false;
    },
    destroy: () => {
      gl.deleteBuffer(glBuffer);
    },
  };
}

/**
 * Gets the UBO shader code for fractal parameters
 * @param {boolean} useUBO - Whether to use UBO (WebGL2) or regular uniforms
 * @returns {string} Shader code for uniform declarations
 */
export function getFractalParamsShaderCode(useUBO) {
  if (useUBO) {
    // WebGL2 UBO declaration using std140 layout
    return `
      #version 300 es
      layout(std140) uniform FractalParams {
        float uIterations;
        float uZoom;
        vec2 uOffset;
        vec2 uJuliaC;
        vec2 uScale; // xScale, yScale
      };
    `;
  } else {
    // WebGL1 regular uniforms
    return `
      uniform float uIterations;
      uniform float uZoom;
      uniform vec2 uOffset;
      uniform vec2 uJuliaC;
      uniform float uXScale;
      uniform float uYScale;
    `;
  }
}

/**
 * Gets the shader code to access scale values
 * @param {boolean} useUBO - Whether to use UBO
 * @returns {string} Shader code snippet for accessing xScale and yScale
 */
export function getScaleAccessCode(useUBO) {
  if (useUBO) {
    return 'uScale.x, uScale.y';
  } else {
    return 'uXScale, uYScale';
  }
}

/**
 * Creates uniform configuration for regl draw command
 * @param {Object} params - Fractal parameters
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} ubo - UBO object (if available)
 * @param {Object} options - Additional options
 * @returns {Object} Uniforms object for regl
 */
export function createUniformsConfig(params, canvas, ubo, options = {}) {
  const juliaC =
    options.juliaC !== undefined
      ? [options.juliaC.x, options.juliaC.y]
      : [params.juliaC?.x || 0, params.juliaC?.y || 0];

  if (ubo) {
    // WebGL2 with UBO - update UBO and return minimal uniforms
    ubo.update({
      iterations: params.iterations,
      zoom: params.zoom,
      offset: params.offset,
      juliaC: { x: juliaC[0], y: juliaC[1] },
      xScale: params.xScale,
      yScale: params.yScale,
    });

    return {
      uTime: options.uTime ?? 0,
      uResolution: [canvas.width, canvas.height],
      uPalette: options.uPalette,
      // UBO is bound separately via uniformBlock
    };
  } else {
    // WebGL1 - use regular uniforms
    return {
      uTime: options.uTime ?? 0,
      uIterations: params.iterations,
      uZoom: params.zoom,
      uOffset: [params.offset?.x || 0, params.offset?.y || 0],
      uResolution: [canvas.width, canvas.height],
      uJuliaC: juliaC,
      uPalette: options.uPalette,
      uXScale: params.xScale || 1.0,
      uYScale: params.yScale || 1.0,
    };
  }
}

/**
 * Gets the uniform block binding configuration for regl
 * @param {Object} ubo - UBO object (if available)
 * @param {number} bindingPoint - Binding point index (default: 0)
 * @returns {Object|null} Uniform block configuration or null
 */
export function getUniformBlockConfig(ubo, _bindingPoint = 0) {
  if (!ubo) {
    return null;
  }

  return {
    uniformBlock: {
      FractalParams: {
        buffer: ubo.buffer,
        offset: 0,
        size: 8 * 4, // 8 floats * 4 bytes
      },
    },
  };
}

