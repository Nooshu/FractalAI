import {
  generatePaletteTexture,
  createFragmentShader,
  getVertexShader
} from '../utils.js';

const fractalFunction = `
// Substitution Tilings Fractal
// Additional substitution rules for tiling patterns
// Creates self-similar patterns with various substitution schemes

const float PHI = 1.618033988749; // Golden ratio
const float PI = 3.14159265359;
const float SQRT2 = 1.4142135623730951;
const float SQRT3 = 1.7320508075688772;

// Check if point is inside a rhombus
bool isInsideRhombus(vec2 p, vec2 center, vec2 v1, vec2 v2) {
    vec2 rel = p - center;
    float a = dot(rel, v1);
    float b = dot(rel, v2);
    float v1Len = length(v1);
    float v2Len = length(v2);

    return abs(a) <= v1Len * 0.5 && abs(b) <= v2Len * 0.5;
}

// Check if point is inside a square
bool isInsideSquare(vec2 p, vec2 center, float size) {
    vec2 rel = p - center;
    return abs(rel.x) <= size * 0.5 && abs(rel.y) <= size * 0.5;
}

// Check if point is inside a triangle
bool isInsideTriangle(vec2 p, vec2 v0, vec2 v1, vec2 v2) {
    vec2 v0v1 = v1 - v0;
    vec2 v0v2 = v2 - v0;
    vec2 v0p = p - v0;

    float dot00 = dot(v0v2, v0v2);
    float dot01 = dot(v0v2, v0v1);
    float dot02 = dot(v0v2, v0p);
    float dot11 = dot(v0v1, v0v1);
    float dot12 = dot(v0v1, v0p);

    float invDenom = 1.0 / (dot00 * dot11 - dot01 * dot01);
    float u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    float v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return (u >= 0.0) && (v >= 0.0) && (u + v <= 1.0);
}

// Rotate vector
vec2 rotate(vec2 v, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

// Substitution tiling - uses various substitution rules
float computeFractal(vec2 c) {
    // Scale coordinates
    float scale = 2.5 + uYScale * 3.5; // 2.5 to 6.0
    vec2 p = c * scale;

    // Number of substitution levels
    int levels = int(clamp(uIterations / 20.0, 2.0, 8.0));

    // Base size
    float baseSize = 2.5;

    // Rotation offset controlled by X Scale
    float rotation = uXScale * PI * 2.0;

    // Substitution tilings use recursive substitution rules
    float depth = 0.0;
    float pattern = 0.0;

    vec2 center = vec2(0.0, 0.0);
    float currentSize = baseSize;

    // Iterate through substitution levels
    for (int level = 0; level < 8; level++) {
        if (level >= levels) break;

        // Use different substitution factors
        float subFactor = mix(2.0, SQRT2, mod(float(level), 2.0));
        currentSize = baseSize / pow(subFactor, float(level));

        // Generate tiles based on substitution rules
        int numTiles = 1;
        if (level > 0) {
            // Substitution rules typically create 4-8 tiles per level
            numTiles = int(pow(4.0, float(level - 1))) + 1;
        }

        bool found = false;

        for (int i = 0; i < 50; i++) {
            if (i >= numTiles) break;

            // Use various angles for substitution patterns
            float angle = float(i) * PI / 4.0 + rotation; // 45-degree increments
            float radius = currentSize * sqrt(float(i)) * 0.4;
            vec2 tileCenter = center + vec2(cos(angle), sin(angle)) * radius;

            // Create square tiles (common in substitution tilings)
            float squareSize = currentSize * 0.9;
            if (isInsideSquare(p, tileCenter, squareSize)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }

            // Create rhombic tiles with substitution proportions
            vec2 v1 = rotate(vec2(currentSize, 0.0), angle);
            vec2 v2 = rotate(vec2(currentSize * subFactor, 0.0), angle + PI / 4.0);

            if (isInsideRhombus(p, tileCenter, v1, v2)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }

            // Create triangular tiles (substitution rules often use triangles)
            vec2 v0 = tileCenter;
            vec2 v1_tri = tileCenter + rotate(vec2(currentSize, 0.0), angle);
            vec2 v2_tri = tileCenter + rotate(vec2(currentSize * 0.5, currentSize * SQRT3 * 0.5), angle);

            if (isInsideTriangle(p, v0, v1_tri, v2_tri)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }

            // Create rotated square variant (substitution creates rotated copies)
            vec2 v3 = rotate(vec2(currentSize * 0.8, 0.0), angle + PI / 6.0);
            vec2 v4 = rotate(vec2(0.0, currentSize * 0.8), angle + PI / 6.0);

            if (isInsideRhombus(p, tileCenter, v3, v4)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }

            // Create another substitution variant
            vec2 v5 = rotate(vec2(currentSize * SQRT2 * 0.7, 0.0), angle + PI / 3.0);
            vec2 v6 = rotate(vec2(currentSize * 0.7, 0.0), angle - PI / 3.0);

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
 * Configuration for Substitution Tilings fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'neon',
    iterations: 25
},
  initialPosition: {
    zoom: 3.2,
    offset: { x: 0.11, y: 0.0114 }
},
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
  // Interesting bounds for "surprise me" - Substitution tilings have specific viewing area
  interestingBounds: {
    offsetX: [-1, 1],
    offsetY: [-1, 1],
    zoom: [1, 20],
  }
};
