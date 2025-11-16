import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Box Fractal Variants
// Different patterns based on which cells are kept in a 3x3 grid

bool isInBoxVariant(vec2 p, int maxIter, float variant) {
    // Normalize to [0, 1] range
    vec2 pos = p * 0.5 + 0.5;
    
    // Check if we're outside the base square [-1, 1]
    if (p.x < -1.0 || p.x > 1.0 || p.y < -1.0 || p.y > 1.0) {
        return false;
    }
    
    // Determine variant type based on uXScale
    // 0.0-0.2: Original Vicsek (center + 4 edges)
    // 0.2-0.4: Anti-Vicsek (4 corners)
    // 0.4-0.6: Corners + Center (removes 4 edges)
    // 0.6-0.8: Diagonal pattern
    // 0.8-1.0: Plus corners pattern
    // 1.0-1.2: Checkerboard pattern
    // 1.2-1.5: H-pattern
    
    int patternType = int(variant * 5.0);
    
    // Iteratively check each level
    for (int i = 0; i < 10; i++) {
        if (i >= maxIter) break;
        
        // Scale position to check which of the 9 squares we're in
        vec2 scaled = pos * 3.0;
        vec2 cell = floor(scaled);
        
        bool removed = false;
        
        // Pattern 0: Original Vicsek (keep center + 4 edges, remove 4 corners)
        if (patternType == 0) {
            if ((cell.x == 0.0 && cell.y == 0.0) ||  // Bottom-left corner
                (cell.x == 2.0 && cell.y == 0.0) ||  // Bottom-right corner
                (cell.x == 0.0 && cell.y == 2.0) ||  // Top-left corner
                (cell.x == 2.0 && cell.y == 2.0)) {  // Top-right corner
                removed = true;
            }
        }
        // Pattern 1: Anti-Vicsek (keep 4 corners, remove center + 4 edges)
        else if (patternType == 1) {
            if ((cell.x == 1.0 && cell.y == 1.0) ||  // Center
                (cell.x == 1.0 && cell.y == 0.0) ||  // Bottom middle
                (cell.x == 1.0 && cell.y == 2.0) ||  // Top middle
                (cell.x == 0.0 && cell.y == 1.0) ||  // Left middle
                (cell.x == 2.0 && cell.y == 1.0)) {  // Right middle
                removed = true;
            }
        }
        // Pattern 2: Corners + Center (keep 4 corners + center, remove 4 edges)
        else if (patternType == 2) {
            if ((cell.x == 1.0 && cell.y == 0.0) ||  // Bottom middle
                (cell.x == 1.0 && cell.y == 2.0) ||  // Top middle
                (cell.x == 0.0 && cell.y == 1.0) ||  // Left middle
                (cell.x == 2.0 && cell.y == 1.0)) {  // Right middle
                removed = true;
            }
        }
        // Pattern 3: Diagonal pattern (keep main diagonal + anti-diagonal + center)
        else if (patternType == 3) {
            // Keep: (0,0), (1,1), (2,2) - main diagonal
            // Keep: (0,2), (1,1), (2,0) - anti-diagonal
            // This means keep (0,0), (0,2), (1,1), (2,0), (2,2)
            // Remove: (0,1), (1,0), (1,2), (2,1)
            if ((cell.x == 0.0 && cell.y == 1.0) ||  // Left middle
                (cell.x == 1.0 && cell.y == 0.0) ||  // Bottom middle
                (cell.x == 1.0 && cell.y == 2.0) ||  // Top middle
                (cell.x == 2.0 && cell.y == 1.0)) {  // Right middle
                removed = true;
            }
        }
        // Pattern 4: Plus corners (keep center + all 4 edges + all 4 corners - keep everything!)
        // Actually, let's make this: keep corners + edges, remove nothing at first level
        // This would keep everything, so instead: Alternating checkerboard
        else if (patternType == 4) {
            // Checkerboard: remove cells where (x + y) is odd
            float sum = cell.x + cell.y;
            if (mod(sum, 2.0) == 1.0) {
                removed = true;
            }
        }
        // Pattern 5: Checkerboard opposite (remove cells where (x + y) is even, except center)
        else if (patternType == 5) {
            float sum = cell.x + cell.y;
            if (mod(sum, 2.0) == 0.0 && !(cell.x == 1.0 && cell.y == 1.0)) {
                removed = true;
            }
        }
        // Pattern 6: H-pattern (keep left column, middle row, right column)
        else if (patternType == 6) {
            // Remove top-left, top-right, bottom-left, bottom-right of edge cells
            if ((cell.x == 0.0 && cell.y == 0.0) ||  // Bottom-left
                (cell.x == 0.0 && cell.y == 2.0) ||  // Top-left
                (cell.x == 2.0 && cell.y == 0.0) ||  // Bottom-right
                (cell.x == 2.0 && cell.y == 2.0)) {  // Top-right
                removed = true;
            }
        }
        // Default: Original Vicsek
        else {
            if ((cell.x == 0.0 && cell.y == 0.0) ||
                (cell.x == 2.0 && cell.y == 0.0) ||
                (cell.x == 0.0 && cell.y == 2.0) ||
                (cell.x == 2.0 && cell.y == 2.0)) {
                removed = true;
            }
        }
        
        if (removed) {
            return false;
        }
        
        // Move to next level - focus on the current cell
        pos = fract(scaled);
    }
    
    return true;
}

float computeFractal(vec2 c) {
    int iterations = int(clamp(uIterations / 15.0, 1.0, 8.0));
    
    // c is already transformed by zoom/offset in utils.js
    // Check if point is in the box variant
    if (!isInBoxVariant(c, iterations, uXScale)) {
        // Point is in a removed square - return 0 for black
        return 0.0;
    }
    
    // Point is in the fractal - calculate depth for interesting coloring
    float depth = 0.0;
    vec2 pos = c * 0.5 + 0.5;
    
    int patternType = int(uXScale * 5.0);
    
    for (int i = 0; i < 10; i++) {
        if (i >= iterations) break;
        
        vec2 scaled = pos * 3.0;
        vec2 cell = floor(scaled);
        
        // Color based on cell position
        if (cell.x == 1.0 && cell.y == 1.0) {
            depth += 8.0; // Center
        } else if ((cell.x == 1.0 && cell.y == 0.0) ||
                   (cell.x == 1.0 && cell.y == 2.0) ||
                   (cell.x == 0.0 && cell.y == 1.0) ||
                   (cell.x == 2.0 && cell.y == 1.0)) {
            depth += 5.0; // Edges
        } else {
            depth += 3.0; // Corners
        }
        
        // Add distance-based variation
        vec2 cellCenter = (cell + 0.5) / 3.0;
        float distFromCenter = length(pos - cellCenter);
        depth += distFromCenter * 4.0;
        
        // Add pattern-specific coloring variation
        depth += float(patternType) * 2.0;
        
        pos = fract(scaled);
    }
    
    // Return color intensity based on depth
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

