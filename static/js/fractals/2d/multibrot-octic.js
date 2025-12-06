import {
  getVertexShader,
  generatePaletteTexture,
} from '../utils.js';

// Helper function to create UBO-aware fragment shader for octic multibrot
function createOcticMultibrotFragmentShader(useUBO) {
  const uniformDeclarations = useUBO
    ? `#version 300 es
    #ifdef GL_ES
    precision highp float;
    #endif
    
    layout(std140) uniform FractalParams {
      float uIterations;
      float uZoom;
      vec2 uOffset;
      vec2 uJuliaC;
      vec2 uScale; // xScale, yScale
    };
    
    // Provide aliases for compatibility
    #define uXScale uScale.x
    #define uYScale uScale.y
    
    uniform float uTime;
    uniform vec2 uResolution;
    uniform sampler2D uPalette;
    
    in vec2 vUv;
    out vec4 fragColor;`
    : `#ifdef GL_ES
    precision highp float;
    #endif
    
    uniform float uTime;
    uniform float uIterations;
    uniform float uZoom;
    uniform vec2 uOffset;
    uniform vec2 uResolution;
    uniform vec2 uJuliaC;
    uniform sampler2D uPalette;
    uniform float uXScale;
    uniform float uYScale;
    
    varying vec2 vUv;`;

  const textureFunction = useUBO ? 'texture' : 'texture2D';
  const outputVariable = useUBO ? 'fragColor' : 'gl_FragColor';

  return `${uniformDeclarations}
    
    // Optimized function to compute z^8 for complex number z
    // z^8 = (z^4)^2, so we can compute z^4 first then square it
    vec2 complexOctic(vec2 z) {
        // First compute z^2
        vec2 z2 = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
        // Then compute z^4 = (z^2)^2
        vec2 z4 = vec2(z2.x * z2.x - z2.y * z2.y, 2.0 * z2.x * z2.y);
        // Finally compute z^8 = (z^4)^2
        return vec2(z4.x * z4.x - z4.y * z4.y, 2.0 * z4.x * z4.y);
    }
    
    float computeFractal(vec2 c) {
        // Octic multibrot set: z = z^8 + c
        vec2 z = vec2(0.0);
        float zx2 = 0.0;
        float zy2 = 0.0;
        
        // Unroll first few iterations for better performance
        z = complexOctic(z) + c;
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 0.0 + 1.0 - nu;
        }
        
        z = complexOctic(z) + c;
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 1.0 + 1.0 - nu;
        }
        
        z = complexOctic(z) + c;
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 2.0 + 1.0 - nu;
        }
        
        // Continue with loop for remaining iterations
        for (int i = 3; i < 200; i++) {
            if (i >= int(uIterations)) break;
            
            // Use squared magnitude check (faster than dot product)
            zx2 = z.x * z.x;
            zy2 = z.y * z.y;
            if (zx2 + zy2 > 4.0) {
                // Smooth coloring using continuous escape
                float log_zn = log(zx2 + zy2) * 0.5;
                float nu = log(log_zn / log(2.0)) / log(2.0);
                return float(i) + 1.0 - nu;
            }
            
            // Compute z^8
            z = complexOctic(z) + c;
        }
        return uIterations;
    }
    
    void main() {
        vec2 uv = vUv;
        float aspect = uResolution.x / uResolution.y;
        float scale = 4.0 / uZoom;
        vec2 c = vec2(
            (uv.x - 0.5) * scale * aspect + uOffset.x,
            (uv.y - 0.5) * scale * uYScale + uOffset.y
        );
        
        float iterations = computeFractal(c);
        
        // Normalized iteration value for color lookup
        float t = clamp(iterations / uIterations, 0.0, 1.0);
        
        // Texture-based palette lookup (much faster than computed colors)
        vec3 color = ${textureFunction}(uPalette, vec2(t, 0.5)).rgb;
        
        // Points in the set are black
        if (iterations >= uIterations) {
            color = vec3(0.0);
        }
        
        ${outputVariable} = vec4(color, 1.0);
    }`;
}

export function render(regl, params, canvas, options = {}) {
  // Check if UBOs should be used (WebGL2 optimization)
  const webglCapabilities = options.webglCapabilities;
  const ubo = options.ubo;
  const useUBO = webglCapabilities?.isWebGL2 && ubo;

  // Create custom fragment shader with UBO support if available
  const fragmentShader = createOcticMultibrotFragmentShader(useUBO);

  // Use createStandardDrawCommand for UBO support
  // Note: octic multibrot uses custom shader, so we pass it directly
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);
  const vertexShaderSource = getVertexShader(useUBO);

  return regl({
    vert: vertexShaderSource,
    frag: fragmentShader,
    attributes: {
      position: [-1, -1, 1, -1, -1, 1, 1, 1], // Full-screen quad
    },
    uniforms: useUBO
      ? {
          uTime: 0,
          uResolution: [canvas.width, canvas.height],
          uPalette: paletteTexture,
        }
      : {
          uTime: 0,
          uIterations: params.iterations,
          uZoom: params.zoom,
          uOffset: [params.offset.x, params.offset.y],
          uResolution: [canvas.width, canvas.height],
          uJuliaC: [0, 0], // Not used for Multibrot
          uPalette: paletteTexture,
          uXScale: params.xScale,
          uYScale: params.yScale,
        },
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    },
    count: 4,
    primitive: 'triangle strip',
    // Bind UBO if available
    ...(useUBO && ubo?.glBuffer && ubo?.bind
      ? {
          ubo: {
            FractalParams: ubo.glBuffer,
          },
        }
      : {}),
  });
}

export const is2D = true;

/**
 * Configuration for Octic Multibrot fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'midnight',
  },
  initialPosition: {
    zoom: 1,
    offset: { x: 0, y: 0 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1.5 },
    { x: 0, y: 0, zoom: 2 },
    { x: 0.5, y: 0, zoom: 2 },
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1.5,
  },
};

