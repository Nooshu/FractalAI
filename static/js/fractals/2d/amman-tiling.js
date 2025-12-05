import {
  generatePaletteTexture,
  createFragmentShader,
  getVertexShader,
} from '../utils.js';

const fractalFunction = `
// Amman Tiling Fractal Limit Set
// Uses substitution rules for Amman tilings (aperiodic tilings)
// Creates non-periodic, self-similar patterns with limit sets

const float PHI = 1.618033988749; // Golden ratio
const float PI = 3.14159265359;
const float SQRT2 = 1.4142135623730951;

// Check if point is inside a rhombus
bool isInsideRhombus(vec2 p, vec2 center, vec2 v1, vec2 v2) {
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

// Amman tiling substitution - uses different rules than Penrose
float computeFractal(vec2 c) {
    // Scale coordinates - increased for better visibility
    float scale = 6.0 + uYScale * 5.0; // 6.0 to 11.0
    vec2 p = c * scale;
    
    // Number of substitution levels
    int levels = int(clamp(uIterations / 25.0, 2.0, 7.0));
    
    // Base size - increased for better visibility
    float baseSize = 7.0;
    
    // Rotation offset controlled by X Scale
    float rotation = uXScale * PI * 2.0;
    
    // Amman tiling uses different tile shapes
    // Common Amman tilings use squares, rectangles, and rhombuses
    float depth = 0.0;
    float pattern = 0.0;
    
    vec2 center = vec2(0.0, 0.0);
    float currentSize = baseSize;
    
    // Iterate through substitution levels
    for (int level = 0; level < 7; level++) {
        if (level >= levels) break;
        
        currentSize = baseSize / pow(PHI, float(level));
        
        // Amman tilings often use square-based substitutions
        // Generate tiles in a pattern
        int numTiles = 1;
        if (level > 0) {
            numTiles = int(pow(2.0, float(level))) + 1;
        }
        
        bool found = false;
        
        for (int i = 0; i < 30; i++) {
            if (i >= numTiles) break;
            
            // Use a different spacing pattern than Penrose
            // Amman tilings often have more regular spacing
            float angle = float(i) * PI / 4.0 + rotation; // 45-degree increments
            float radius = currentSize * sqrt(float(i)) * 0.4;
            vec2 tileCenter = center + vec2(cos(angle), sin(angle)) * radius;
            
            // Create square tiles (common in Amman tilings)
            float squareSize = currentSize * 0.8;
            vec2 v1 = rotate(vec2(squareSize, 0.0), angle);
            vec2 v2 = rotate(vec2(0.0, squareSize), angle);
            
            if (isInsideRhombus(p, tileCenter, v1, v2)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }
            
            // Create rectangular tiles (also common in Amman tilings)
            float rectWidth = currentSize * PHI * 0.6;
            float rectHeight = currentSize * 0.6;
            vec2 v3 = rotate(vec2(rectWidth, 0.0), angle + PI / 4.0);
            vec2 v4 = rotate(vec2(0.0, rectHeight), angle + PI / 4.0);
            
            if (isInsideRhombus(p, tileCenter, v3, v4)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }
            
            // Create diamond/rhombus tiles
            float diamondSize = currentSize * 0.7;
            float diamondAngle = PI / 6.0; // 30 degrees
            vec2 v5 = rotate(vec2(diamondSize, 0.0), angle + diamondAngle);
            vec2 v6 = rotate(vec2(diamondSize, 0.0), angle - diamondAngle);
            
            if (isInsideRhombus(p, tileCenter, v5, v6)) {
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
      position: [-1, -1, 1, -1, -1, 1, 1, 1],
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
          uJuliaC: [0, 0],
          uPalette: paletteTexture,
          uXScale: params.xScale,
          uYScale: params.yScale,
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
                yScale: params.yScale,
              });
              context.ubo.bind(program);
            }
          },
        }
      : {}),
    primitive: 'triangle strip',
    count: 4,
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    },
  });

  return drawFractal;
}

export const is2D = true;

/**
 * Configuration for Amman Tiling fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'classic',
    iterations: 25,
  },
  initialPosition: {
    zoom: 6.4,
    offset: { x: 0.0396, y: 0.0619 },
  },
  interestingPoints: [],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};
