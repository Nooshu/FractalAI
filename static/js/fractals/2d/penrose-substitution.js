import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Penrose-Inspired Substitution Fractal
// Uses substitution rules similar to Penrose tilings
// Creates non-periodic, self-similar patterns

const float PHI = 1.618033988749; // Golden ratio
const float PI = 3.14159265359;

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

// Penrose substitution - recursively subdivide using golden ratio
float computeFractal(vec2 c) {
    // Scale coordinates
    float scale = 1.5 + uYScale * 2.5; // 1.5 to 4.0
    vec2 p = c * scale;

    // Number of substitution levels
    int levels = int(clamp(uIterations / 25.0, 2.0, 7.0));

    // Base size
    float baseSize = 2.0;

    // Rotation offset controlled by X Scale
    float rotation = uXScale * PI * 2.0;

    // Recursive substitution using golden ratio
    float depth = 0.0;
    float pattern = 0.0;

    // Start with a base pattern
    vec2 center = vec2(0.0, 0.0);
    float currentSize = baseSize;

    // Iterate through substitution levels
    for (int level = 0; level < 7; level++) {
        if (level >= levels) break;

        currentSize = baseSize / pow(PHI, float(level));

        // Create Penrose-like pattern with golden ratio spacing
        // Generate multiple rhombuses in a spiral pattern
        int numTiles = 1;
        if (level > 0) {
            numTiles = int(pow(PHI, float(level - 1))) + 1;
        }

        bool found = false;

        for (int i = 0; i < 30; i++) {
            if (i >= numTiles) break;

            // Golden angle spacing (137.5 degrees)
            float goldenAngle = 2.399963229728653; // 2 * PI / PHI^2
            float angle = float(i) * goldenAngle + rotation;

            // Spiral radius using golden ratio
            float radius = currentSize * sqrt(float(i)) * 0.5;
            vec2 tileCenter = center + vec2(cos(angle), sin(angle)) * radius;

            // Create thick rhombus (72° and 108° angles)
            float thickAngle1 = PI / 5.0; // 36 degrees
            float thickAngle2 = PI * 2.0 / 5.0; // 72 degrees

            vec2 v1 = rotate(vec2(currentSize, 0.0), angle + thickAngle1);
            vec2 v2 = rotate(vec2(currentSize * PHI, 0.0), angle - thickAngle1);

            if (isInsideRhombus(p, tileCenter, v1, v2)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }

            // Create thin rhombus (36° and 144° angles)
            float thinAngle1 = PI / 10.0; // 18 degrees
            float thinAngle2 = PI * 3.0 / 10.0; // 54 degrees

            vec2 v3 = rotate(vec2(currentSize * PHI, 0.0), angle + thinAngle1);
            vec2 v4 = rotate(vec2(currentSize, 0.0), angle - thinAngle1);

            if (isInsideRhombus(p, tileCenter, v3, v4)) {
                depth = float(level);
                float dist = length(p - tileCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }
        }

        if (found) break;
    }

    // Add some noise based on position for texture
    float noise = fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) * 0.1;

    // Return value
    float result = pattern + noise;
    return result * uIterations;
}
`;

const fragmentShader = createFragmentShader(fractalFunction);

export function render(regl, params, canvas) {
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  const drawFractal = regl({
    frag: fragmentShader,
    vert: `
      precision mediump float;
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position;
        gl_Position = vec4(position, 0, 1);
      }
    `,
    attributes: {
      position: [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]
},
    uniforms: {
      uResolution: [canvas.width, canvas.height],
      uZoom: params.zoom,
      uOffset: [params.offset.x, params.offset.y],
      uIterations: params.iterations,
      uPalette: paletteTexture,
      uXScale: params.xScale,
      uYScale: params.yScale
},
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
 * Configuration for Penrose Substitution fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'galaxy',
    iterations: 25
},
  initialPosition: {
    zoom: 4,
    offset: { x: 0.7834, y: 0.5579 }
},
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
  // Interesting bounds for "surprise me" - Penrose substitution has specific viewing area
  interestingBounds: {
    offsetX: [-1, 1],
    offsetY: [-1, 1],
    zoom: [1, 20],
  }
};
