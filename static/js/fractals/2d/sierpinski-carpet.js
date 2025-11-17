import { vertexShader, createFragmentShader, createStandardDrawCommand } from '../utils.js';

const fractalFunction = `
    // Sierpinski Carpet
    // Recursively removes the center square from a 3x3 grid
    
    bool isInCarpet(vec2 p, int maxIter) {
        // Normalize to [0, 1] range - make carpet fill the view
        // At zoom=1, c ranges from about -2 to 2, so map [-1, 1] to the carpet
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
            
            // Check if we're in the center square (1, 1)
            if (cell.x == 1.0 && cell.y == 1.0) {
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
        // Check if point is in the carpet
        if (!isInCarpet(c, iterations)) {
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
            
            // Check proximity to center square for edge coloring
            if (cell.x == 1.0 && cell.y == 1.0) {
                // Near a removed square
                depth += float(i) * 5.0;
                break;
            }
            
            // Distance from center of current 3x3 grid
            vec2 centerDist = abs(cell - vec2(1.0));
            float maxDist = max(centerDist.x, centerDist.y);
            
            depth += maxDist * 2.0;
            pos = fract(scaled);
        }
        
        // Return color intensity based on depth - must be less than uIterations to be colored
        return mod(depth * 10.0, uIterations * 0.9);
    }
`;

const fragmentShader = createFragmentShader(fractalFunction);

export function render(regl, params, canvas) {
  // Use the optimized standard draw command with dynamic uniforms
  return createStandardDrawCommand(regl, params, canvas, fragmentShader, {
    fractalType: 'sierpinski-carpet',
    juliaC: [0, 0], // Not used
  });
}

export const is2D = true;

