import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Recursive Circle Removal Fractal
// Recursively removes circles from a base circle, creating an Apollonian-like pattern
// Similar to Sierpinski carpet but with circles instead of squares

const float PI = 3.14159265359;

// Check if point is inside a circle
bool isInsideCircle(vec2 p, vec2 center, float radius) {
    return length(p - center) <= radius;
}

// Check if point is outside a circle (for removal regions)
bool isOutsideCircle(vec2 p, vec2 center, float radius) {
    return length(p - center) > radius;
}

float computeFractal(vec2 c) {
    int iterations = int(clamp(uIterations / 20.0, 1.0, 7.0));
    
    // Start with a base circle centered at origin
    vec2 baseCenter = vec2(0.0, 0.0);
    float baseRadius = 1.0;
    
    // Check if point is outside base circle
    if (!isInsideCircle(c, baseCenter, baseRadius)) {
        return 0.0;
    }
    
    // Apply recursive circle removal iteratively
    float depth = 0.0;
    vec2 currentCenter = baseCenter;
    float currentRadius = baseRadius;
    
    for (int i = 0; i < 7; i++) {
        if (i >= iterations) break;
        
        // Check if still in current circle
        if (!isInsideCircle(c, currentCenter, currentRadius)) {
            return depth * 20.0;
        }
        
        // Remove center circle (1/3 of radius)
        float removedRadius = currentRadius / 3.0;
        if (isInsideCircle(c, currentCenter, removedRadius)) {
            return 0.0; // In removed region
        }
        
        // Subdivide into 4 smaller circles arranged around the removed center
        // Position them at the corners of a square inscribed in the remaining ring
        float subRadius = currentRadius / 3.0;
        float offset = currentRadius * 0.666; // Distance from center to sub-circle centers
        
        // Calculate centers of 4 sub-circles
        vec2 subCenter0 = currentCenter + vec2(-offset, -offset); // Bottom-left
        vec2 subCenter1 = currentCenter + vec2(offset, -offset);   // Bottom-right
        vec2 subCenter2 = currentCenter + vec2(-offset, offset);  // Top-left
        vec2 subCenter3 = currentCenter + vec2(offset, offset);   // Top-right
        
        // Determine which sub-circle contains the point
        bool found = false;
        
        if (isInsideCircle(c, subCenter0, subRadius)) {
            currentCenter = subCenter0;
            currentRadius = subRadius;
            depth += 1.0;
            found = true;
        } else if (isInsideCircle(c, subCenter1, subRadius)) {
            currentCenter = subCenter1;
            currentRadius = subRadius;
            depth += 2.0;
            found = true;
        } else if (isInsideCircle(c, subCenter2, subRadius)) {
            currentCenter = subCenter2;
            currentRadius = subRadius;
            depth += 3.0;
            found = true;
        } else if (isInsideCircle(c, subCenter3, subRadius)) {
            currentCenter = subCenter3;
            currentRadius = subRadius;
            depth += 4.0;
            found = true;
        }
        
        if (!found) {
            // Point is in the ring region between circles
            return depth * 20.0 + 10.0;
        }
    }
    
    // Return depth for coloring
    return depth * 10.0 + float(iterations) * 5.0;
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
 * Configuration for Recursive Circle Removal fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'midnight',
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

