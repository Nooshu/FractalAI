import {
  generatePaletteTexture,
  createFragmentShader,
  getVertexShader
} from '../utils.js';

const fractalFunction = `
// Domino Substitution Fractal
// Based on domino tiling substitution system (aperiodic tiling)
// Creates self-similar patterns with domino-shaped boundaries

const float PHI = 1.618033988749; // Golden ratio
const float PI = 3.14159265359;
const float SQRT2 = 1.4142135623730951;

// Check if point is inside a rectangle (domino shape)
bool isInsideRectangle(vec2 p, vec2 center, vec2 v1, vec2 v2) {
    vec2 rel = p - center;
    float a = dot(rel, v1);
    float b = dot(rel, v2);
    float v1Len = length(v1);
    float v2Len = length(v2);
    
    return abs(a) <= v1Len * 0.5 && abs(b) <= v2Len * 0.5;
}

// Rotate vector
vec2 rotate(vec2 v, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

// Domino substitution - uses 2x1 rectangle (domino) tiles
float computeFractal(vec2 c) {
    // Scale coordinates
    float scale = 3.0 + uYScale * 3.0; // 3.0 to 6.0
    vec2 p = c * scale;
    
    // Number of substitution levels
    int levels = int(clamp(uIterations / 20.0, 2.0, 8.0));
    
    // Base size
    float baseSize = 3.0;
    
    // Rotation offset controlled by X Scale
    float rotation = uXScale * PI * 2.0;
    
    // Domino tilings use 2x1 rectangles (dominoes)
    float depth = 0.0;
    float pattern = 0.0;
    
    vec2 center = vec2(0.0, 0.0);
    float currentSize = baseSize;
    
    // Iterate through substitution levels
    for (int level = 0; level < 8; level++) {
        if (level >= levels) break;
        
        currentSize = baseSize / pow(2.0, float(level)); // Domino tilings use 2x scaling
        
        // Domino tilings create patterns with horizontal and vertical dominoes
        int numTiles = 1;
        if (level > 0) {
            numTiles = int(pow(4.0, float(level - 1))) + 1; // 4-fold symmetry
        }
        
        bool found = false;
        
        for (int i = 0; i < 50; i++) {
            if (i >= numTiles) break;
            
            // Domino pattern uses 90-degree rotations
            float angle = float(i) * PI / 2.0 + rotation; // 90-degree increments
            float radius = currentSize * sqrt(float(i)) * 0.4;
            vec2 tileCenter = center + vec2(cos(angle), sin(angle)) * radius;
            
            // Create horizontal domino (2x1 rectangle)
            float dominoWidth = currentSize * 1.8;
            float dominoHeight = currentSize * 0.9;
            vec2 v1 = rotate(vec2(dominoWidth, 0.0), angle);
            vec2 v2 = rotate(vec2(0.0, dominoHeight), angle);
            
            if (isInsideRectangle(p, tileCenter, v1, v2)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }
            
            // Create vertical domino variant (1x2 rectangle)
            float dominoWidth2 = currentSize * 0.9;
            float dominoHeight2 = currentSize * 1.8;
            vec2 v3 = rotate(vec2(dominoWidth2, 0.0), angle);
            vec2 v4 = rotate(vec2(0.0, dominoHeight2), angle);
            
            if (isInsideRectangle(p, tileCenter, v3, v4)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }
            
            // Create rotated domino variant (diagonal)
            float dominoSize = currentSize * 1.2;
            vec2 v5 = rotate(vec2(dominoSize, 0.0), angle + PI / 4.0);
            vec2 v6 = rotate(vec2(0.0, dominoSize * 0.5), angle + PI / 4.0);
            
            if (isInsideRectangle(p, tileCenter, v5, v6)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }
        }
        
        if (found) break;
    }
    
    // Add some texture based on position
    float noise = fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) * 0.1;
    
    // Return value
    float result = pattern + noise;
    return result * uIterations;
}
`;

export function render(regl, params, canvas, options = {}) {
  // Check if UBOs should be used (WebGL2 optimization)
  const webglCapabilities = options.webglCapabilities;
  const ubo = options.ubo;
  const useUBO = webglCapabilities?.isWebGL2 && ubo;

  // Create fragment shader with UBO support if available
  const fragmentShader = createFragmentShader(fractalFunction, useUBO);

  // Use standard vertex shader (getVertexShader handles UBO mode)
  const vertexShaderSource = getVertexShader(useUBO);

  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  const drawFractal = regl({
    frag: fragmentShader,
    vert: vertexShaderSource,
    attributes: {
      position: [-1, -1, 1, -1, -1, 1, 1, 1]
},
    uniforms: useUBO
      ? {
          uTime: 0,
          uResolution: [canvas.width, canvas.height],
          uPalette: paletteTexture
}
      : {
          uTime: 0,
          uIterations: params.iterations,
          uZoom: params.zoom,
          uOffset: [params.offset.x, params.offset.y],
          uResolution: [canvas.width, canvas.height],
          uJuliaC: [0, 0],
          uPalette: paletteTexture,
          uXScale: params.xScale,
          uYScale: params.yScale
},
    // Bind UBO if available
    ...(useUBO && ubo?.glBuffer && ubo?.bind
      ? {
          context: { ubo: ubo },
          before: function bindUBO(context) {
            const gl = regl._gl;
            const program = gl.getParameter(gl.CURRENT_PROGRAM);
            if (program && context.ubo) {
              context.ubo.update({
                iterations: params.iterations,
                zoom: params.zoom,
                offset: params.offset,
                juliaC: { x: 0, y: 0 },
                xScale: params.xScale,
                yScale: params.yScale
});
              context.ubo.bind(program);
            }
          }
}
      : {}),
    primitive: 'triangle strip',
    count: 4,
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height
}
});

  return drawFractal;
}

export const is2D = true;

/**
 * Configuration for Domino Substitution fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow-double',
    iterations: 40
},
  initialPosition: {
    zoom: 8.8,
    offset: { x: 0.0221, y: 0.0599 }
},
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};