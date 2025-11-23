import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Quadrilateral Subdivision Fractal
// Recursively subdivides quadrilaterals (squares) into 4 smaller quadrilaterals
// Creates a pattern similar to Sierpinski carpet but with different subdivision rules

// Check if point is inside a quadrilateral (square) defined by four corners
// We'll use a simple square for the base shape
bool isInsideQuadrilateral(vec2 p, vec2 center, float size) {
    vec2 corner1 = center + vec2(-size, -size);
    vec2 corner2 = center + vec2(size, -size);
    vec2 corner3 = center + vec2(size, size);
    vec2 corner4 = center + vec2(-size, size);
    
    // Check if point is inside the square using cross products
    // For a square, we can check if point is within bounds
    vec2 toPoint = p - center;
    return abs(toPoint.x) <= size && abs(toPoint.y) <= size;
}

// Check which quadrant of a square a point is in
// Returns: 0=bottom-left, 1=bottom-right, 2=top-left, 3=top-right
int getQuadrant(vec2 p, vec2 center) {
    vec2 rel = p - center;
    if (rel.x < 0.0) {
        return rel.y < 0.0 ? 0 : 2; // Left side
    } else {
        return rel.y < 0.0 ? 1 : 3; // Right side
    }
}

float computeFractal(vec2 c) {
    int iterations = int(clamp(uIterations / 20.0, 1.0, 7.0));
    
    // Start with a base square centered at origin
    vec2 baseCenter = vec2(0.0, 0.0);
    float baseSize = 1.0;
    
    // Check if point is outside base square
    if (!isInsideQuadrilateral(c, baseCenter, baseSize)) {
        return 0.0;
    }
    
    // Apply quadrilateral subdivision iteratively
    float depth = 0.0;
    vec2 currentCenter = baseCenter;
    float currentSize = baseSize;
    
    for (int i = 0; i < 7; i++) {
        if (i >= iterations) break;
        
        // Check if still in current square
        if (!isInsideQuadrilateral(c, currentCenter, currentSize)) {
            return depth * 20.0;
        }
        
        // Subdivide into 4 smaller squares
        float halfSize = currentSize * 0.5;
        
        // Calculate centers of 4 sub-quadrilaterals
        vec2 subCenter0 = currentCenter + vec2(-halfSize, -halfSize); // Bottom-left
        vec2 subCenter1 = currentCenter + vec2(halfSize, -halfSize);   // Bottom-right
        vec2 subCenter2 = currentCenter + vec2(-halfSize, halfSize);  // Top-left
        vec2 subCenter3 = currentCenter + vec2(halfSize, halfSize);   // Top-right
        
        // Determine which sub-quadrilateral contains the point
        bool found = false;
        
        if (isInsideQuadrilateral(c, subCenter0, halfSize)) {
            currentCenter = subCenter0;
            currentSize = halfSize;
            depth += 1.0;
            found = true;
        } else if (isInsideQuadrilateral(c, subCenter1, halfSize)) {
            currentCenter = subCenter1;
            currentSize = halfSize;
            depth += 2.0;
            found = true;
        } else if (isInsideQuadrilateral(c, subCenter2, halfSize)) {
            currentCenter = subCenter2;
            currentSize = halfSize;
            depth += 3.0;
            found = true;
        } else if (isInsideQuadrilateral(c, subCenter3, halfSize)) {
            currentCenter = subCenter3;
            currentSize = halfSize;
            depth += 4.0;
            found = true;
        }
        
        if (!found) {
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
 * Configuration for Quadrilateral Subdivision fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'galaxy',
  },
  initialPosition: {
    zoom: 3.186,
    offset: { x: 0.9638, y: 0.6144 },
  },
  interestingPoints: [],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};

