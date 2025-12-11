import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Simplex Noise Fractal
// Generates a fractal pattern using Simplex noise with multiple octaves
// Simplex noise is an improvement over Perlin noise, using a triangular grid
// Produces smoother, more natural-looking patterns

const float F2 = 0.5 * (sqrt(3.0) - 1.0);
const float G2 = (3.0 - sqrt(3.0)) / 6.0;

// Hash function for pseudo-random gradients
vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453) * 2.0 - 1.0; // Range [-1, 1]
}

// Simplex noise function (2D)
float simplexNoise(vec2 p) {
    // Skew the input space to determine which simplex cell we're in
    float s = (p.x + p.y) * F2;
    vec2 i = floor(p + s);
    float t = (i.x + i.y) * G2;
    vec2 x0 = p - (i - t);

    // Determine which simplex we're in
    vec2 i1;
    if (x0.x > x0.y) {
        i1 = vec2(1.0, 0.0);
    } else {
        i1 = vec2(0.0, 1.0);
    }

    // Offsets for the other two corners
    vec2 x1 = x0 - i1 + G2;
    vec2 x2 = x0 - 1.0 + 2.0 * G2;

    // Hash values for the three corners
    vec2 h = hash(i);
    vec2 h1 = hash(i + i1);
    vec2 h2 = hash(i + 1.0);

    // Calculate contribution from each corner
    vec3 w;
    w.x = 0.5 - dot(x0, x0);
    w.y = 0.5 - dot(x1, x1);
    w.z = 0.5 - dot(x2, x2);

    // Clamp to avoid negative values
    w = max(w, 0.0);

    // Weight contributions
    w = w * w * w;

    // Calculate dot products
    float n0 = dot(h, x0);
    float n1 = dot(h1, x1);
    float n2 = dot(h2, x2);

    // Combine contributions
    return 70.0 * (w.x * n0 + w.y * n1 + w.z * n2);
}

// Fractal Brownian Motion (fBm) - multiple octaves of Simplex noise
float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float maxValue = 0.0;

    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * simplexNoise(p * frequency);
        maxValue += amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
    }

    // Normalize to [-1, 1] range
    return value / maxValue;
}

float computeFractal(vec2 c) {
    int octaves = int(clamp(uIterations / 30.0, 1.0, 6.0));

    // Scale coordinates based on zoom and scale parameters
    float scale = 2.0 + uXScale * 3.0; // 2.0 to 5.0
    vec2 p = c * scale;

    // Add offset for variation
    p += vec2(uYScale * 10.0, 0.0);

    // Generate fractal noise
    float noise = fbm(p, octaves);

    // Normalize to 0-1 range
    noise = noise * 0.5 + 0.5;

    // Return value for coloring (multiply by iterations for better color mapping)
    return noise * uIterations;
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
 * Configuration for Simplex Noise fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow-pastel'
},
  initialPosition: {
    zoom: 1,
    offset: { x: 0, y: 0 }
},
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
  // Interesting bounds for "surprise me" - Simplex noise is always interesting
  interestingBounds: {
    offsetX: [-1, 1],
    offsetY: [-1, 1],
    zoom: [0.5, 10],
  }
};
