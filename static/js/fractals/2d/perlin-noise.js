import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Perlin Noise Fractal
// Generates a fractal pattern using Perlin noise with multiple octaves
// Creates natural-looking, organic patterns

const float PI = 3.14159265359;

// Hash function for pseudo-random gradients
vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

// Perlin noise function
float perlinNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    // Get gradients at the four corners
    vec2 a = hash(i);
    vec2 b = hash(i + vec2(1.0, 0.0));
    vec2 c = hash(i + vec2(0.0, 1.0));
    vec2 d = hash(i + vec2(1.0, 1.0));
    
    // Calculate dot products
    float u = smoothstep(0.0, 1.0, f.x);
    float v = smoothstep(0.0, 1.0, f.y);
    
    float x1 = mix(dot(a, f), dot(b, f - vec2(1.0, 0.0)), u);
    float x2 = mix(dot(c, f - vec2(0.0, 1.0)), dot(d, f - vec2(1.0, 1.0)), u);
    
    return mix(x1, x2, v);
}

// Fractal Brownian Motion (fBm) - multiple octaves of Perlin noise
float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * perlinNoise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
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
      ],
    },
    uniforms: {
      uResolution: [canvas.width, canvas.height],
      uZoom: params.zoom,
      uOffset: [params.offset.x, params.offset.y],
      uIterations: params.iterations,
      uPalette: paletteTexture,
      uXScale: params.xScale,
      uYScale: params.yScale,
    },
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
 * Configuration for Perlin Noise fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow-double', // Rainbow Double
  },
  initialPosition: {
    zoom: 1,
    offset: { x: 0, y: 0 },
  },
  interestingPoints: [],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};
