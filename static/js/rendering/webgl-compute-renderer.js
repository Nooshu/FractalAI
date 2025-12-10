/**
 * WebGL Compute Shader Renderer
 * Provides compute shader-based rendering when WEBGL_compute_shader extension is available
 * Uses compute shaders for parallel pixel computation instead of fragment shaders
 */

import { devLog } from '../core/logger.js';

/**
 * Create a compute shader from a fractal function
 * @param {string} fractalFunction - The fractal computation function
 * @param {boolean} useUBO - Whether to use UBOs for parameters
 * @returns {string} Compute shader source code
 */
function createComputeShader(fractalFunction, useUBO = false) {
  const uboSection = useUBO
    ? `
    layout(std140) uniform FractalParams {
      float uIterations;
      float uZoom;
      vec2 uOffset;
      vec2 uJuliaC;
      vec2 uScale;
    };
    #define uXScale uScale.x
    #define uYScale uScale.y
    `
    : `
    uniform float uIterations;
    uniform float uZoom;
    uniform vec2 uOffset;
    uniform vec2 uJuliaC;
    uniform float uXScale;
    uniform float uYScale;
    `;

  return `#version 310 es
    #extension GL_EXT_shader_image_load_store : require
    
    precision highp float;
    
    ${uboSection}
    
    uniform vec2 uResolution;
    uniform sampler2D uPalette;
    
    // Storage image for output
    layout(rgba8, binding = 0) uniform writeonly highp image2D uOutput;
    
    // Precomputed constants
    const float LOG2 = 0.6931471805599453;
    const float INV_LOG2 = 1.4426950408889634;
    const float ESCAPE_RADIUS_SQ = 4.0;
    const float ESCAPE_RADIUS_SQ_EARLY = 2.0;
    
    ${fractalFunction}
    
    layout(local_size_x = 8, local_size_y = 8, local_size_z = 1) in;
    
    void main() {
        ivec2 pixelCoord = ivec2(gl_GlobalInvocationID.xy);
        
        // Check bounds
        if (pixelCoord.x >= int(uResolution.x) || pixelCoord.y >= int(uResolution.y)) {
            return;
        }
        
        // Calculate UV coordinates
        vec2 uv = (vec2(pixelCoord) + 0.5) / uResolution;
        
        // Precompute aspect ratio and scale
        float aspect = uResolution.x / uResolution.y;
        float scale = 4.0 / uZoom;
        
        // Calculate complex coordinate
        vec2 uvCentered = uv - 0.5;
        vec2 c = vec2(
            uvCentered.x * scale * aspect * uXScale + uOffset.x,
            uvCentered.y * scale * uYScale + uOffset.y
        );
        
        // Compute fractal
        float iterations = computeFractal(c);
        
        // Normalized iteration value for color lookup
        float invIterations = 1.0 / uIterations;
        float t = clamp(iterations * invIterations, 0.0, 1.0);
        
        // Texture-based palette lookup
        vec3 color = texture(uPalette, vec2(t, 0.5)).rgb;
        
        // Points in the set are black
        float isInSet = step(uIterations, iterations);
        color = mix(color, vec3(0.0), isInSet);
        
        // Write to output image
        imageStore(uOutput, pixelCoord, vec4(color, 1.0));
    }
`;
}

import { generatePaletteTexture } from '../fractals/utils.js';

/**
 * WebGL Compute Shader Renderer
 * Renders fractals using compute shaders when available
 */
export class WebGLComputeRenderer {
  /**
   * @param {WebGL2RenderingContext} gl - WebGL2 context
   * @param {Object} computeExt - WEBGL_compute_shader extension
   * @param {Object} capabilities - WebGL capabilities
   */
  constructor(gl, computeExt, capabilities) {
    this.gl = gl;
    this.computeExt = computeExt;
    this.capabilities = capabilities;
    this.programs = new Map(); // Cache compute programs by fractal function
    this.outputTextures = new Map(); // Cache output textures by size
    this.isAvailable = false;

    // Check if compute shaders are actually available
    if (gl && computeExt && capabilities?.isWebGL2) {
      try {
        // The extension should provide COMPUTE_SHADER constant
        const COMPUTE_SHADER = computeExt.COMPUTE_SHADER || gl.COMPUTE_SHADER;
        if (COMPUTE_SHADER) {
          // Test if we can create a compute shader
          const testShader = gl.createShader(COMPUTE_SHADER);
          if (testShader) {
            gl.deleteShader(testShader);
            this.isAvailable = true;
          }
        }
      } catch (e) {
        console.warn('[WebGL Compute] Extension available but not functional:', e);
      }
    }

    if (this.isAvailable) {
      devLog.log(
        '%c[WebGL Compute]%c Compute shader rendering enabled',
        'color: #4CAF50; font-weight: bold;',
        'color: inherit;'
      );
    }
  }

  /**
   * Create a compute shader program for a fractal function
   * @param {string} fractalFunction - The fractal computation function
   * @param {boolean} useUBO - Whether to use UBOs
   * @returns {WebGLProgram|null} Compute shader program or null if failed
   */
  createComputeProgram(fractalFunction, useUBO = false) {
    const cacheKey = `${fractalFunction}_${useUBO}`;
    if (this.programs.has(cacheKey)) {
      return this.programs.get(cacheKey);
    }

    if (!this.isAvailable) {
      return null;
    }

    const gl = this.gl;
    const computeShaderSource = createComputeShader(fractalFunction, useUBO);

    // Get compute shader type from extension
    const COMPUTE_SHADER = this.computeExt.COMPUTE_SHADER;
    if (!COMPUTE_SHADER) {
      console.error('[WebGL Compute] COMPUTE_SHADER constant not available');
      return null;
    }

    // Create compute shader
    const computeShader = gl.createShader(COMPUTE_SHADER);
    if (!computeShader) {
      console.error('[WebGL Compute] Failed to create compute shader');
      return null;
    }

    gl.shaderSource(computeShader, computeShaderSource);
    gl.compileShader(computeShader);

    if (!gl.getShaderParameter(computeShader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(computeShader);
      console.error('[WebGL Compute] Compute shader compilation error:', error);
      gl.deleteShader(computeShader);
      return null;
    }

    // Create program
    const program = gl.createProgram();
    if (!program) {
      console.error('[WebGL Compute] Failed to create compute program');
      gl.deleteShader(computeShader);
      return null;
    }

    gl.attachShader(program, computeShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      console.error('[WebGL Compute] Program linking error:', error);
      gl.deleteProgram(program);
      gl.deleteShader(computeShader);
      return null;
    }

    // Clean up shader (no longer needed after linking)
    gl.deleteShader(computeShader);

    // Cache the program
    this.programs.set(cacheKey, program);

    return program;
  }

  /**
   * Get or create output texture for a given size
   * @param {number} width - Texture width
   * @param {number} height - Texture height
   * @returns {WebGLTexture|null} Output texture or null if failed
   */
  getOutputTexture(width, height) {
    const cacheKey = `${width}_${height}`;
    if (this.outputTextures.has(cacheKey)) {
      return this.outputTextures.get(cacheKey);
    }

    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) {
      return null;
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Bind as image for compute shader
    gl.bindImageTexture(0, texture, 0, false, 0, gl.WRITE_ONLY, gl.RGBA8);

    this.outputTextures.set(cacheKey, texture);
    return texture;
  }

  /**
   * Render fractal using compute shader
   * @param {Object} regl - Regl context (for palette texture)
   * @param {Object} params - Fractal parameters
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {string} fractalFunction - Fractal computation function
   * @param {Object} options - Additional options (ubo, webglCapabilities)
   * @returns {Function|null} Draw command or null if failed
   */
  render(regl, params, canvas, fractalFunction, options = {}) {
    if (!this.isAvailable) {
      return null;
    }

    const gl = this.gl;
    const useUBO = options.webglCapabilities?.isWebGL2 && options.ubo;

    // Create compute program
    const program = this.createComputeProgram(fractalFunction, useUBO);
    if (!program) {
      return null;
    }

    // Get output texture
    const outputTexture = this.getOutputTexture(canvas.width, canvas.height);
    if (!outputTexture) {
      return null;
    }

    // Generate palette texture
    const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

    // Create draw command that executes compute shader and displays result
    return () => {
      gl.useProgram(program);

      // Bind output texture as image
      gl.bindImageTexture(0, outputTexture, 0, false, 0, gl.WRITE_ONLY, gl.RGBA8);

      // Set uniforms
      if (useUBO && options.ubo) {
        // Update UBO
        options.ubo.update({
          iterations: params.iterations,
          zoom: params.zoom,
          offset: params.offset,
          juliaC: params.juliaC || { x: 0, y: 0 },
          xScale: params.xScale,
          yScale: params.yScale,
        });
        options.ubo.bind(program);
      } else {
        // Set individual uniforms
        const iterationsLoc = gl.getUniformLocation(program, 'uIterations');
        const zoomLoc = gl.getUniformLocation(program, 'uZoom');
        const offsetLoc = gl.getUniformLocation(program, 'uOffset');
        const juliaCLoc = gl.getUniformLocation(program, 'uJuliaC');
        const xScaleLoc = gl.getUniformLocation(program, 'uXScale');
        const yScaleLoc = gl.getUniformLocation(program, 'uYScale');

        if (iterationsLoc) gl.uniform1f(iterationsLoc, params.iterations);
        if (zoomLoc) gl.uniform1f(zoomLoc, params.zoom);
        if (offsetLoc) gl.uniform2f(offsetLoc, params.offset.x, params.offset.y);
        if (juliaCLoc) {
          const juliaC = params.juliaC || { x: 0, y: 0 };
          gl.uniform2f(juliaCLoc, juliaC.x, juliaC.y);
        }
        if (xScaleLoc) gl.uniform1f(xScaleLoc, params.xScale);
        if (yScaleLoc) gl.uniform1f(yScaleLoc, params.yScale);
      }

      const resolutionLoc = gl.getUniformLocation(program, 'uResolution');
      if (resolutionLoc) {
        gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
      }

      // Bind palette texture
      const paletteLoc = gl.getUniformLocation(program, 'uPalette');
      if (paletteLoc) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
        gl.uniform1i(paletteLoc, 0);
      }

      // Dispatch compute shader
      const workgroupSizeX = 8;
      const workgroupSizeY = 8;
      const numGroupsX = Math.ceil(canvas.width / workgroupSizeX);
      const numGroupsY = Math.ceil(canvas.height / workgroupSizeY);

      // Use extension's dispatchCompute method
      if (this.computeExt.dispatchCompute) {
        this.computeExt.dispatchCompute(numGroupsX, numGroupsY, 1);
      } else if (gl.dispatchCompute) {
        // Fallback to gl method if available
        gl.dispatchCompute(numGroupsX, numGroupsY, 1);
      } else {
        console.error('[WebGL Compute] dispatchCompute not available');
        return;
      }

      // Memory barrier to ensure compute shader completes
      gl.memoryBarrier(gl.SHADER_IMAGE_ACCESS_BARRIER_BIT);

      // Display result using a simple quad render
      // This would typically be done with a separate render pass
      // For now, we'll use regl to display the texture
      regl({
        frag: `
          precision mediump float;
          uniform sampler2D uTexture;
          in vec2 vUv;
          out vec4 fragColor;
          void main() {
            fragColor = texture(uTexture, vUv);
          }
        `,
        vert: `
          precision mediump float;
          in vec2 position;
          out vec2 vUv;
          void main() {
            vUv = position * 0.5 + 0.5;
            gl_Position = vec4(position, 0, 1);
          }
        `,
        attributes: {
          position: [-1, -1, 1, -1, -1, 1, 1, 1],
        },
        uniforms: {
          uTexture: outputTexture,
        },
        count: 4,
        primitive: 'triangle strip',
      })();
    };
  }

  /**
   * Check if compute shader rendering is available
   * @returns {boolean} True if available
   */
  isComputeShaderAvailable() {
    return this.isAvailable;
  }

  /**
   * Cleanup resources
   */
  dispose() {
    const gl = this.gl;

    // Delete programs
    for (const program of this.programs.values()) {
      gl.deleteProgram(program);
    }
    this.programs.clear();

    // Delete textures
    for (const texture of this.outputTextures.values()) {
      gl.deleteTexture(texture);
    }
    this.outputTextures.clear();

    this.isAvailable = false;
  }
}

/**
 * Create a WebGL compute shader renderer
 * @param {WebGL2RenderingContext} gl - WebGL2 context
 * @param {Object} capabilities - WebGL capabilities
 * @returns {WebGLComputeRenderer|null} Compute renderer or null if not available
 */
export function createWebGLComputeRenderer(gl, capabilities) {
  if (!gl || !capabilities?.isWebGL2) {
    return null;
  }

  const computeExt = capabilities.extensions?.['WEBGL_compute_shader'];
  if (!computeExt) {
    return null;
  }

  try {
    const renderer = new WebGLComputeRenderer(gl, computeExt, capabilities);
    if (renderer.isComputeShaderAvailable()) {
      return renderer;
    }
  } catch (error) {
    console.error('[WebGL Compute] Failed to create compute renderer:', error);
  }

  return null;
}

