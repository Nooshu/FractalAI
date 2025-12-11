import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Random Midpoint Displacement Fractal Landscape
// Generates fractal landscapes using the midpoint displacement algorithm
// Creates terrain-like height maps with natural-looking variations

const float F2 = 0.5 * (sqrt(3.0) - 1.0);
const float G2 = (3.0 - sqrt(3.0)) / 6.0;

// Hash function for pseudo-random gradients
vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453) * 2.0 - 1.0; // Range [-1, 1]
}

// Simplex noise function (2D) - used as base for displacement
float simplexNoise(vec2 p) {
    float s = (p.x + p.y) * F2;
    vec2 i = floor(p + s);
    float t = (i.x + i.y) * G2;
    vec2 x0 = p - (i - t);

    vec2 i1;
    if (x0.x > x0.y) {
        i1 = vec2(1.0, 0.0);
    } else {
        i1 = vec2(0.0, 1.0);
    }

    vec2 x1 = x0 - i1 + G2;
    vec2 x2 = x0 - 1.0 + 2.0 * G2;

    vec2 h = hash(i);
    vec2 h1 = hash(i + i1);
    vec2 h2 = hash(i + 1.0);

    vec3 w;
    w.x = 0.5 - dot(x0, x0);
    w.y = 0.5 - dot(x1, x1);
    w.z = 0.5 - dot(x2, x2);

    w = max(w, 0.0);
    w = w * w * w;

    float n0 = dot(h, x0);
    float n1 = dot(h1, x1);
    float n2 = dot(h2, x2);

    return 70.0 * (w.x * n0 + w.y * n1 + w.z * n2);
}

// Midpoint displacement using recursive subdivision
float midpointDisplacement(vec2 p, int iterations) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float roughness = 0.5 + uXScale * 0.3; // 0.5 to 0.8 (controls roughness)

    // Start with base noise
    value = simplexNoise(p * frequency) * amplitude;

    // Add multiple octaves with decreasing amplitude
    for (int i = 1; i < 8; i++) {
        if (i >= iterations) break;

        frequency *= 2.0;
        amplitude *= roughness; // Decrease amplitude by roughness factor

        // Add displacement at higher frequencies
        value += simplexNoise(p * frequency) * amplitude;
    }

    return value;
}

float computeFractal(vec2 c) {
    int iterations = int(clamp(uIterations / 25.0, 1.0, 6.0));

    // Scale coordinates based on zoom and scale parameters
    float scale = 1.5 + uYScale * 2.5; // 1.5 to 4.0
    vec2 p = c * scale;

    // Generate midpoint displacement landscape
    float height = midpointDisplacement(p, iterations);

    // Normalize to 0-1 range
    height = height * 0.5 + 0.5;

    // Return value for coloring (multiply by iterations for better color mapping)
    return height * uIterations;
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
 * Configuration for Random Midpoint Displacement fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'cosmic'
},
  initialPosition: {
    zoom: 1,
    offset: { x: 0, y: 0 }
},
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
  // Interesting bounds for "surprise me" - Random midpoint displacement is always interesting
  interestingBounds: {
    offsetX: [-1, 1],
    offsetY: [-1, 1],
    zoom: [0.5, 10],
  }
};
