import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Cross Fractal (T-Square Fractal)
// Recursively subdivides squares and removes specific quadrants

bool isInCrossFractal(vec2 p, int maxIter) {
    // Normalize to [0, 1] range
    vec2 pos = p * 0.5 + 0.5;
    
    // Check if we're outside the base square [-1, 1]
    if (p.x < -1.0 || p.x > 1.0 || p.y < -1.0 || p.y > 1.0) {
        return false;
    }
    
    // Iteratively check each level
    // At each level, we divide into 4 quadrants and remove the top-right one
    vec2 currentPos = pos;
    float currentScale = 1.0;
    
    for (int i = 0; i < 10; i++) {
        if (i >= maxIter) break;
        
        // Normalize to [0, 1] within current square
        vec2 localPos = currentPos / currentScale;
        
        // Determine which quadrant we're in
        vec2 quadrant = floor(localPos * 2.0);
        
        // Check if we're in the top-right quadrant (1, 1)
        if (quadrant.x == 1.0 && quadrant.y == 1.0) {
            return false; // In removed quadrant
        }
        
        // Move to next level - focus on the current quadrant
        currentScale /= 2.0;
        currentPos = fract(localPos * 2.0) * currentScale;
    }
    
    return true;
}

float computeFractal(vec2 c) {
    int iterations = int(clamp(uIterations / 15.0, 1.0, 8.0));
    
    // c is already transformed by zoom/offset in utils.js
    // Check if point is in the Cross fractal
    if (!isInCrossFractal(c, iterations)) {
        // Point is in a removed square - return 0 for black
        return 0.0;
    }
    
    // Point is in the fractal - calculate depth for interesting coloring
    float depth = 0.0;
    vec2 pos = c * 0.5 + 0.5;
    vec2 currentPos = pos;
    float currentScale = 1.0;
    
    for (int i = 0; i < 10; i++) {
        if (i >= iterations) break;
        
        // Normalize to [0, 1] within current square
        vec2 localPos = currentPos / currentScale;
        
        // Determine which quadrant we're in
        vec2 quadrant = floor(localPos * 2.0);
        
        // Color based on which quadrant (bottom-left=0, bottom-right=1, top-left=2)
        if (quadrant.x == 0.0 && quadrant.y == 0.0) {
            depth += 10.0; // Bottom-left
        } else if (quadrant.x == 1.0 && quadrant.y == 0.0) {
            depth += 7.0; // Bottom-right
        } else if (quadrant.x == 0.0 && quadrant.y == 1.0) {
            depth += 5.0; // Top-left
        }
        
        // Add distance-based variation
        vec2 center = (quadrant + 0.5) / 2.0;
        float distFromCenter = length(localPos - center);
        depth += distFromCenter * 3.0;
        
        // Move to next level
        currentScale /= 2.0;
        currentPos = fract(localPos * 2.0) * currentScale;
    }
    
    // Return color intensity based on depth - must be less than uIterations to be colored
    return mod(depth * 6.0, uIterations * 0.9);
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
 * Configuration for Cross fractal
 */
export const config = {
  initialSettings: {
    iterations: 240,
    xScale: 1.0,
    yScale: 1.0,
    colorScheme: 'midnight',
  },
  initialPosition: {
    zoom: 2.928,
    offset: { x: 0.7305, y: 0.759 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1 }, // Full overview
    { x: 0.25, y: 0.25, zoom: 2 }, // Top-right missing corner
    { x: 0.5, y: 0.5, zoom: 3 }, // Deep into top-right region
    { x: 0.375, y: 0.375, zoom: 4 }, // Edge of removed region
    { x: -0.25, y: -0.25, zoom: 3 }, // Bottom-left quadrant
    { x: 0.25, y: -0.25, zoom: 3 }, // Bottom-right quadrant
    { x: -0.25, y: 0.25, zoom: 3 }, // Top-left quadrant
    { x: 0.5, y: 0.25, zoom: 5 }, // Right edge detail
    { x: 0.25, y: 0.5, zoom: 5 }, // Top edge detail
    { x: 0, y: 0, zoom: 2.5 }, // Medium zoom center
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};

