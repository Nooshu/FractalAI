import {
  generatePaletteTexture,
  createFragmentShader,
  getVertexShader
} from '../utils.js';

const fractalFunction = `
// Snowflake Tiling Fractal
// Based on snowflake tiling substitution system (aperiodic tiling)
// Creates self-similar patterns with snowflake-like boundaries

const float PHI = 1.618033988749; // Golden ratio
const float PI = 3.14159265359;
const float SQRT3 = 1.7320508075688772;

// Check if point is inside a hexagon
bool isInsideHexagon(vec2 p, vec2 center, float size) {
    vec2 rel = p - center;
    float angle = atan(rel.y, rel.x);
    float dist = length(rel);

    // Hexagon has 6 sides, check distance to each edge
    float angle60 = PI / 3.0;
    float normalizedAngle = mod(angle + PI, angle60 * 2.0) - angle60;
    float edgeDist = size * 0.5 / cos(normalizedAngle);

    return dist <= edgeDist;
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

// Snowflake tiling substitution - uses hexagonal and triangular patterns
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

    // Snowflake tiling uses hexagonal and triangular substitutions
    float depth = 0.0;
    float pattern = 0.0;

    vec2 center = vec2(0.0, 0.0);
    float currentSize = baseSize;

    // Iterate through substitution levels
    for (int level = 0; level < 8; level++) {
        if (level >= levels) break;

        currentSize = baseSize / pow(2.0, float(level)); // Snowflake tilings use 2x scaling

        // Snowflake tilings create patterns with hexagons and triangles
        int numTiles = 1;
        if (level > 0) {
            numTiles = int(pow(6.0, float(level - 1))) + 1; // 6-fold symmetry
        }

        bool found = false;

        for (int i = 0; i < 50; i++) {
            if (i >= numTiles) break;

            // Snowflake pattern uses 60-degree rotations (hexagonal symmetry)
            float angle = float(i) * PI / 3.0 + rotation; // 60-degree increments
            float radius = currentSize * sqrt(float(i)) * 0.3;
            vec2 tileCenter = center + vec2(cos(angle), sin(angle)) * radius;

            // Create hexagonal tile (base of snowflake tiling)
            float hexSize = currentSize * 0.9;
            if (isInsideHexagon(p, tileCenter, hexSize)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }

            // Create triangular tile (snowflake pattern uses triangles)
            float triSize = currentSize * 0.8;
            vec2 v0 = tileCenter;
            vec2 v1 = tileCenter + rotate(vec2(triSize, 0.0), angle);
            vec2 v2 = tileCenter + rotate(vec2(triSize * 0.5, triSize * SQRT3 * 0.5), angle);

            if (isInsideTriangle(p, v0, v1, v2)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }

            // Create rotated triangle variant
            vec2 v3 = tileCenter;
            vec2 v4 = tileCenter + rotate(vec2(triSize * 0.7, 0.0), angle + PI / 6.0);
            vec2 v5 = tileCenter + rotate(vec2(triSize * 0.35, triSize * SQRT3 * 0.35), angle + PI / 6.0);

            if (isInsideTriangle(p, v3, v4, v5)) {
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
 * Configuration for Snowflake Tiling fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow-double',
    iterations: 40
},
  initialPosition: {
    zoom: 4,
    offset: { x: 0.0568, y: 0.021 }
},
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
  // Interesting bounds for "surprise me" - Snowflake tiling has specific viewing area
  interestingBounds: {
    offsetX: [-1, 1],
    offsetY: [-1, 1],
    zoom: [1, 20],
  }
};
