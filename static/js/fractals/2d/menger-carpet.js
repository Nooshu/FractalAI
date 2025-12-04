import {
  createFragmentShader,
  createStandardDrawCommand,
} from '../utils.js';

const fractalFunction = `
    // Menger Carpet
    // A variant of Sierpinski carpet that removes more squares
    // Instead of removing just the center square, it removes the center square
    // and the four edge squares (middle of each side)
    // This creates a more complex pattern than the standard Sierpinski carpet
    
    bool isInMengerCarpet(vec2 p, int maxIter) {
        // Normalize to [0, 1] range - make carpet fill the view
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
            
            // Menger carpet removes:
            // 1. Center square (1, 1)
            // 2. Middle of top edge (1, 0)
            // 3. Middle of bottom edge (1, 2)
            // 4. Middle of left edge (0, 1)
            // 5. Middle of right edge (2, 1)
            // So we keep only the 4 corner squares
            
            // Check if we're in a removed square
            if (cell.x == 1.0 && cell.y == 1.0) {
                return false; // Center square
            }
            if (cell.x == 1.0 && cell.y == 0.0) {
                return false; // Top middle
            }
            if (cell.x == 1.0 && cell.y == 2.0) {
                return false; // Bottom middle
            }
            if (cell.x == 0.0 && cell.y == 1.0) {
                return false; // Left middle
            }
            if (cell.x == 2.0 && cell.y == 1.0) {
                return false; // Right middle
            }
            
            // Move to next level - focus on the current cell
            pos = fract(scaled);
        }
        
        return true;
    }
    
    float computeFractal(vec2 c) {
        int iterations = int(clamp(uIterations / 15.0, 1.0, 8.0));
        
        // c is already transformed by zoom/offset in utils.js
        // Check if point is in the carpet
        if (!isInMengerCarpet(c, iterations)) {
            // Point is in a removed square - return 0 for black
            return 0.0;
        }
        
        // Point is in the carpet - calculate depth for interesting coloring
        float depth = 0.0;
        vec2 pos = c * 0.5 + 0.5;
        
        for (int i = 0; i < 10; i++) {
            if (i >= iterations) break;
            
            vec2 scaled = pos * 3.0;
            vec2 cell = floor(scaled);
            
            // Check proximity to removed squares for edge coloring
            vec2 centerDist = abs(cell - vec2(1.0));
            float maxDist = max(centerDist.x, centerDist.y);
            
            // Add more detail based on which corner we're in
            float cornerDist = min(centerDist.x, centerDist.y);
            depth += maxDist * 2.0 + cornerDist * 1.5;
            pos = fract(scaled);
        }
        
        // Return color intensity based on depth - must be less than uIterations to be colored
        return mod(depth * 10.0, uIterations * 0.9);
    }
`;

export function render(regl, params, canvas, options = {}) {
  // Check if UBOs should be used (WebGL2 optimization)
  const webglCapabilities = options.webglCapabilities;
  const ubo = options.ubo;
  const useUBO = webglCapabilities?.isWebGL2 && ubo;

  // Create fragment shader with UBO support if available
  const fragmentShader = createFragmentShader(fractalFunction, useUBO);

  // Use createStandardDrawCommand for UBO support
  return createStandardDrawCommand(regl, params, canvas, fragmentShader, {
    webglCapabilities,
    ubo,
    juliaC: { x: 0, y: 0 }, // Not used for Menger carpet
  });
}

export const is2D = true;

/**
 * Configuration for Menger Carpet fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'aurora',
  },
  initialPosition: {
    zoom: 1.456,
    offset: { x: 0.1169, y: 0.1266 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1 }, // Full overview
    { x: 0.33, y: 0.33, zoom: 3 }, // Upper right corner
    { x: -0.33, y: 0.33, zoom: 3 }, // Upper left corner
    { x: 0.33, y: -0.33, zoom: 3 }, // Lower right corner
    { x: -0.33, y: -0.33, zoom: 3 }, // Lower left corner
    { x: 0, y: 0, zoom: 4 }, // Center zoom
    { x: 0.22, y: 0.22, zoom: 9 }, // Deep zoom upper right
    { x: -0.22, y: -0.22, zoom: 9 }, // Deep zoom lower left
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1.456,
  },
};

