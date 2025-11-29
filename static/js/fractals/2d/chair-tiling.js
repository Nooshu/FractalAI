import {
  generatePaletteTexture,
  createFragmentShader,
  getVertexShader,
} from '../utils.js';

const fractalFunction = `
// Chair Tiling Fractal Boundaries
// Based on Chair tiling substitution system (aperiodic tiling)
// Creates self-similar patterns with chair-shaped boundaries

const float PHI = 1.618033988749; // Golden ratio
const float PI = 3.14159265359;
const float SQRT2 = 1.4142135623730951;

// Check if point is inside a square
bool isInsideSquare(vec2 p, vec2 center, float size) {
    vec2 rel = p - center;
    return abs(rel.x) <= size * 0.5 && abs(rel.y) <= size * 0.5;
}

// Check if point is inside a rectangle
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

// Chair tiling substitution - uses chair-shaped boundaries
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
    
    // Chair tiling uses square-based substitutions with L-shaped boundaries
    float depth = 0.0;
    float pattern = 0.0;
    
    vec2 center = vec2(0.0, 0.0);
    float currentSize = baseSize;
    
    // Iterate through substitution levels
    for (int level = 0; level < 8; level++) {
        if (level >= levels) break;
        
        currentSize = baseSize / pow(2.0, float(level)); // Chair tilings use 2x scaling
        
        // Chair tilings create patterns with square and L-shaped boundaries
        int numTiles = 1;
        if (level > 0) {
            numTiles = int(pow(4.0, float(level - 1))) + 1; // 4-way subdivision
        }
        
        bool found = false;
        
        for (int i = 0; i < 50; i++) {
            if (i >= numTiles) break;
            
            // Chair pattern uses 90-degree rotations
            float angle = float(i) * PI / 2.0 + rotation; // 90-degree increments
            float radius = currentSize * sqrt(float(i)) * 0.3;
            vec2 tileCenter = center + vec2(cos(angle), sin(angle)) * radius;
            
            // Create square tile (base of chair tiling)
            float squareSize = currentSize * 0.9;
            if (isInsideSquare(p, tileCenter, squareSize)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }
            
            // Create L-shaped boundary (characteristic of chair tilings)
            // L-shape: square with one corner removed
            float lSize = currentSize * 0.8;
            vec2 lCenter = tileCenter + rotate(vec2(currentSize * 0.2, currentSize * 0.2), angle);
            
            // Check if inside L-shape (square minus corner)
            vec2 rel = p - lCenter;
            vec2 rotatedRel = rotate(rel, -angle);
            
            // L-shape: inside square but not in the removed corner
            bool inSquare = abs(rotatedRel.x) <= lSize * 0.5 && abs(rotatedRel.y) <= lSize * 0.5;
            bool inCorner = rotatedRel.x > lSize * 0.3 && rotatedRel.y > lSize * 0.3;
            
            if (inSquare && !inCorner) {
                depth = float(level);
                float dist = length(p - lCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }
            
            // Create rotated L-shape variant
            vec2 l2Center = tileCenter + rotate(vec2(currentSize * 0.15, -currentSize * 0.15), angle + PI / 4.0);
            vec2 rel2 = p - l2Center;
            vec2 rotatedRel2 = rotate(rel2, -(angle + PI / 4.0));
            
            bool inSquare2 = abs(rotatedRel2.x) <= lSize * 0.7 && abs(rotatedRel2.y) <= lSize * 0.7;
            bool inCorner2 = rotatedRel2.x < -lSize * 0.3 && rotatedRel2.y < -lSize * 0.3;
            
            if (inSquare2 && !inCorner2) {
                depth = float(level);
                float dist = length(p - l2Center) / currentSize;
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
 * Configuration for Chair Tiling fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'midnight',
    iterations: 25,
  },
  initialPosition: {
    zoom: 4,
    offset: { x: 0.77, y: 0.502 },
  },
  interestingPoints: [],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};
