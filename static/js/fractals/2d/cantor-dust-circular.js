import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Cantor Dust in Circular Form
// A circular version of the Cantor set, where circular regions are recursively removed
// Similar to Cantor set but applied to circles instead of line segments

const float PI = 3.14159265359;

// Check if point is inside a circle
bool isInsideCircle(vec2 p, vec2 center, float radius) {
    return length(p - center) <= radius;
}

// Check if point is outside a circle
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
    
    // Apply recursive circular removal iteratively
    // Similar to Cantor set: remove middle third, but in circular form
    // We'll remove concentric rings, keeping outer and inner rings
    
    float depth = 0.0;
    vec2 currentCenter = baseCenter;
    float currentRadius = baseRadius;
    
    for (int i = 0; i < 7; i++) {
        if (i >= iterations) break;
        
        // Check if still in current circle
        if (!isInsideCircle(c, currentCenter, currentRadius)) {
            return depth * 20.0;
        }
        
        // Divide circle into three concentric rings:
        // Outer ring: radius from 2/3 to 1.0 (keep)
        // Middle ring: radius from 1/3 to 2/3 (remove)
        // Inner ring: radius from 0.0 to 1/3 (keep)
        
        float outerRingMin = currentRadius * (2.0 / 3.0);
        float innerRingMax = currentRadius * (1.0 / 3.0);
        
        float distFromCenter = length(c - currentCenter);
        
        // Check if in removed middle ring
        if (distFromCenter > innerRingMax && distFromCenter <= outerRingMin) {
            return 0.0; // In removed region
        }
        
        // Determine which ring we're in and recurse
        if (distFromCenter <= innerRingMax) {
            // In inner ring - recurse into it
            currentRadius = innerRingMax;
            depth += 1.0;
        } else if (distFromCenter > outerRingMin) {
            // In outer ring - recurse into it
            // Scale and position to the outer ring
            float ringThickness = currentRadius - outerRingMin;
            float scale = ringThickness / currentRadius;
            vec2 toPoint = normalize(c - currentCenter);
            currentCenter = currentCenter + toPoint * (outerRingMin + ringThickness * 0.5);
            currentRadius = ringThickness * 0.5;
            depth += 2.0;
        } else {
            // Should not happen, but handle edge case
            return depth * 20.0;
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
 * Configuration for Cantor Dust Circular fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'cosmic',
  },
  initialPosition: {
    zoom: 2.597,
    offset: { x: 1.1991, y: 0.9663 },
  },
  interestingPoints: [],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};
