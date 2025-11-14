import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Vicsek Snowflake (Box Fractal)
// Creates a recursive cross/plus pattern

bool isInVicsek(vec2 p, int maxIter) {
    // Normalize to [0, 1] range - make snowflake fill the view
    // At zoom=1, c ranges from about -2 to 2, so map [-1, 1] to the snowflake
    vec2 pos = p * 0.5 + 0.5;
    
    // Check if we're outside the base square [-1, 1]
    if (p.x < -1.0 || p.x > 1.0 || p.y < -1.0 || p.y > 1.0) {
        return false;
    }
    
    // Iteratively check each level
    for (int i = 0; i < 10; i++) {
        if (i >= maxIter) break;
        
        // Scale position to check which of the 9 squares we're in
        vec2 scaled = pos * 3.0;
        vec2 cell = floor(scaled);
        
        // The Vicsek fractal keeps:
        // - Center square (1, 1)
        // - Top middle (1, 2)
        // - Bottom middle (1, 0)
        // - Left middle (0, 1)
        // - Right middle (2, 1)
        // All corners are removed: (0,0), (2,0), (0,2), (2,2)
        
        // Check if we're in a removed corner
        if ((cell.x == 0.0 && cell.y == 0.0) ||  // Bottom-left corner
            (cell.x == 2.0 && cell.y == 0.0) ||  // Bottom-right corner
            (cell.x == 0.0 && cell.y == 2.0) ||  // Top-left corner
            (cell.x == 2.0 && cell.y == 2.0)) {  // Top-right corner
            return false; // In a removed square
        }
        
        // Move to next level - focus on the current cell
        pos = fract(scaled);
    }
    
    return true;
}

float computeFractal(vec2 c) {
    int iterations = int(clamp(uIterations / 15.0, 1.0, 8.0));
    
    // c is already transformed by zoom/offset in utils.js
    // Check if point is in the Vicsek snowflake
    if (!isInVicsek(c, iterations)) {
        // Point is in a removed square - return 0 for black
        return 0.0;
    }
    
    // Point is in the snowflake - calculate depth for interesting coloring
    float depth = 0.0;
    vec2 pos = c * 0.5 + 0.5;
    
    for (int i = 0; i < 10; i++) {
        if (i >= iterations) break;
        
        vec2 scaled = pos * 3.0;
        vec2 cell = floor(scaled);
        
        // Check if we're in the center
        if (cell.x == 1.0 && cell.y == 1.0) {
            depth += 5.0;
        }
        // Check if we're in an edge middle square
        else if ((cell.x == 1.0 && cell.y == 0.0) ||  // Bottom middle
                 (cell.x == 1.0 && cell.y == 2.0) ||  // Top middle
                 (cell.x == 0.0 && cell.y == 1.0) ||  // Left middle
                 (cell.x == 2.0 && cell.y == 1.0)) {  // Right middle
            depth += 3.0;
        }
        
        // Distance from center of current cell for additional variation
        vec2 cellCenter = (cell + 0.5) / 3.0;
        float distFromCenter = length(pos - cellCenter);
        depth += distFromCenter * 2.0;
        
        pos = fract(scaled);
    }
    
    // Return color intensity based on depth - must be less than uIterations to be colored
    return mod(depth * 8.0, uIterations * 0.9);
}
`;

export function render(regl, params, canvas) {
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);
  
  const frag = createFragmentShader(fractalFunction);
  
  const drawFractal = regl({
    frag,
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

