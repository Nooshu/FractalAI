import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Fractal Islands
// Recursively subdivides squares and keeps only corner regions, creating isolated islands

bool isInFractalIslands(vec2 p, int maxIter) {
    // Normalize to [0, 1] range
    // Map coordinates to [0, 1] range for the fractal algorithm
    // Use a scaling that works well at default zoom
    vec2 pos = p * 0.5 + 0.5;
    
    // Clamp to valid range to handle any coordinate
    pos = clamp(pos, 0.0, 1.0);
    
    // Iteratively check each level
    // At each level, divide into 3x3 grid (9 squares) and keep only the 4 corners
    // Remove center square and all 4 edge squares
    for (int i = 0; i < 10; i++) {
        if (i >= maxIter) break;
        
        // Scale position to check which of the 9 squares we're in
        vec2 scaled = pos * 3.0;
        vec2 cell = floor(scaled);
        
        // Keep only corner squares: (0,0), (2,0), (0,2), (2,2)
        // Remove: center (1,1) and edges: (0,1), (1,0), (1,2), (2,1)
        if ((cell.x == 1.0 && cell.y == 1.0) ||  // Center
            (cell.x == 0.0 && cell.y == 1.0) ||  // Left middle
            (cell.x == 1.0 && cell.y == 0.0) ||  // Bottom middle
            (cell.x == 1.0 && cell.y == 2.0) ||  // Top middle
            (cell.x == 2.0 && cell.y == 1.0)) {  // Right middle
            return false; // In a removed square
        }
        
        // Move to next level - focus on the current corner cell
        pos = fract(scaled);
    }
    
    return true;
}

float computeFractal(vec2 c) {
    int iterations = int(clamp(uIterations / 15.0, 1.0, 8.0));
    
    // c is already transformed by zoom/offset in utils.js
    // Check if point is in the Fractal Islands
    if (!isInFractalIslands(c, iterations)) {
        // Point is in a removed square - return 0 for black
        return 0.0;
    }
    
    // Point is in the fractal - calculate depth for interesting coloring
    float depth = 0.0;
    vec2 pos = c * 0.5 + 0.5;
    
    for (int i = 0; i < 10; i++) {
        if (i >= iterations) break;
        
        vec2 scaled = pos * 3.0;
        vec2 cell = floor(scaled);
        
        // Color based on which corner we're in
        if (cell.x == 0.0 && cell.y == 0.0) {
            depth += 10.0; // Bottom-left corner
        } else if (cell.x == 2.0 && cell.y == 0.0) {
            depth += 8.0; // Bottom-right corner
        } else if (cell.x == 0.0 && cell.y == 2.0) {
            depth += 6.0; // Top-left corner
        } else if (cell.x == 2.0 && cell.y == 2.0) {
            depth += 4.0; // Top-right corner
        }
        
        // Add distance-based variation within the corner
        vec2 cellCenter = (cell + 0.5) / 3.0;
        float distFromCenter = length(pos - cellCenter);
        depth += distFromCenter * 3.0;
        
        // Add iteration-based variation
        depth += float(i) * 2.0;
        
        pos = fract(scaled);
    }
    
    // Return color intensity based on depth - must be less than uIterations to be colored
    return mod(depth * 7.0, uIterations * 0.9);
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

