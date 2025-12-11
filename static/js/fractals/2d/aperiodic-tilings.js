import {
  generatePaletteTexture,
  createFragmentShader,
  getVertexShader
} from '../utils.js';

const fractalFunction = `
// Aperiodic Tilings Fractal
// Other aperiodic patterns beyond Penrose
// Creates non-periodic, self-similar patterns with various tile shapes

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

// Check if point is inside a hexagon
bool isInsideHexagon(vec2 p, vec2 center, float size) {
    vec2 rel = p - center;
    float angle = atan(rel.y, rel.x);
    float dist = length(rel);

    float angle60 = PI / 3.0;
    float normalizedAngle = mod(angle + PI, angle60 * 2.0) - angle60;
    float edgeDist = size * 0.5 / cos(normalizedAngle);

    return dist <= edgeDist;
}

// Rotate vector
vec2 rotate(vec2 v, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

// Aperiodic tiling substitution - various aperiodic patterns
float computeFractal(vec2 c) {
    // Scale coordinates
    float scale = 3.0 + uYScale * 4.0; // 3.0 to 7.0
    vec2 p = c * scale;

    // Number of substitution levels
    int levels = int(clamp(uIterations / 20.0, 2.0, 8.0));

    // Base size
    float baseSize = 3.0;

    // Rotation offset controlled by X Scale
    float rotation = uXScale * PI * 2.0;

    // Aperiodic tilings use various substitution rules
    float depth = 0.0;
    float pattern = 0.0;

    vec2 center = vec2(0.0, 0.0);
    float currentSize = baseSize;

    // Iterate through substitution levels
    for (int level = 0; level < 8; level++) {
        if (level >= levels) break;

        // Use different scaling factors for different aperiodic patterns
        float scaleFactor = mix(2.0, PHI, mod(float(level), 2.0));
        currentSize = baseSize / pow(scaleFactor, float(level));

        // Generate tiles with various symmetries
        int numTiles = 1;
        if (level > 0) {
            numTiles = int(pow(6.0, float(level - 1))) + 1; // 6-fold symmetry
        }

        bool found = false;

        for (int i = 0; i < 50; i++) {
            if (i >= numTiles) break;

            // Use golden angle for aperiodic spacing
            float goldenAngle = 2.399963229728653; // 2 * PI / PHI^2
            float angle = float(i) * goldenAngle + rotation;
            float radius = currentSize * sqrt(float(i)) * 0.35;
            vec2 tileCenter = center + vec2(cos(angle), sin(angle)) * radius;

            // Create hexagonal tiles (common in aperiodic tilings)
            float hexSize = currentSize * 0.85;
            if (isInsideHexagon(p, tileCenter, hexSize)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }

            // Create rhombic tiles with various angles
            float rhombAngle1 = PI / 6.0 + float(level) * 0.1; // Varying angles
            float rhombAngle2 = PI / 3.0 - float(level) * 0.05;
            vec2 v1 = rotate(vec2(currentSize, 0.0), angle + rhombAngle1);
            vec2 v2 = rotate(vec2(currentSize * 1.2, 0.0), angle - rhombAngle2);

            if (isInsideRhombus(p, tileCenter, v1, v2)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }

            // Create rotated rhombus variant
            vec2 v3 = rotate(vec2(currentSize * 0.9, 0.0), angle + PI / 4.0);
            vec2 v4 = rotate(vec2(currentSize * 0.9 * SQRT2, 0.0), angle - PI / 4.0);

            if (isInsideRhombus(p, tileCenter, v3, v4)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }

            // Create another variant with different proportions
            vec2 v5 = rotate(vec2(currentSize * PHI * 0.7, 0.0), angle + PI / 5.0);
            vec2 v6 = rotate(vec2(currentSize * 0.7, 0.0), angle - PI / 5.0);

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
 * Configuration for Aperiodic Tilings fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rosegold',
    iterations: 25,
  },
  initialPosition: {
    zoom: 3,
    offset: { x: 0.1285, y: -0.0001 },
  },
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
  // Interesting bounds for "surprise me" - Aperiodic tilings have specific viewing area
  interestingBounds: {
    offsetX: [-1, 1],
    offsetY: [-1, 1],
    zoom: [1, 20],
  }
};
