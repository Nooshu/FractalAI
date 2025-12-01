import {
  createFragmentShader,
  createStandardDrawCommand,
} from '../utils.js';

const fractalFunction = `
    // Lyapunov Fractal
    // Based on Lyapunov exponents of logistic maps
    // Uses a sequence pattern (like "ABABAB...") to alternate between two parameter values
    
    float computeFractal(vec2 c) {
        // Map coordinates to parameter space
        // c.x controls parameter A (typically 2.0 to 4.0)
        // c.y controls parameter B (typically 2.0 to 4.0)
        float paramA = 2.0 + c.x * 2.0; // Range: 0.0 to 4.0
        float paramB = 2.0 + c.y * 2.0; // Range: 0.0 to 4.0
        
        // Sequence pattern controlled by uXScale
        // 0.0-0.33: AB pattern
        // 0.33-0.66: AAB pattern
        // 0.66-1.0: AABB pattern
        float patternType = uXScale;
        int sequenceLength = 2;
        if (patternType > 0.66) {
            sequenceLength = 4; // AABB
        } else if (patternType > 0.33) {
            sequenceLength = 3; // AAB
        }
        
        // Initialize logistic map
        float x = 0.5; // Starting value
        float lyapunovSum = 0.0;
        int iterations = int(uIterations);
        
        // Iterate logistic map with alternating parameters
        for (int i = 0; i < 200; i++) {
            if (i >= iterations) break;
            
            // Determine which parameter to use based on sequence pattern
            // Use mod() with float conversion for WebGL1 compatibility
            float param;
            if (sequenceLength == 2) {
                // AB pattern - use mod(float(i), 2.0) < 1.0 to check if even
                param = (mod(float(i), 2.0) < 1.0) ? paramA : paramB;
            } else if (sequenceLength == 3) {
                // AAB pattern
                float pos = mod(float(i), 3.0);
                param = (pos < 2.0) ? paramA : paramB;
            } else {
                // AABB pattern
                float pos = mod(float(i), 4.0);
                param = (pos < 2.0) ? paramA : paramB;
            }
            
            // Logistic map: x_{n+1} = r * x_n * (1 - x_n)
            // Clamp to avoid numerical issues
            x = clamp(param * x * (1.0 - x), 0.0, 1.0);
            
            // Calculate Lyapunov exponent contribution
            // L = sum of log|df/dx| / n
            // For logistic map: df/dx = r * (1 - 2*x)
            float derivative = abs(param * (1.0 - 2.0 * x));
            
            // Avoid log(0) or log(very small)
            if (derivative > 0.0001) {
                lyapunovSum += log(derivative);
            }
        }
        
        // Calculate Lyapunov exponent
        float lyapunov = lyapunovSum / float(iterations);
        
        // Color based on Lyapunov exponent
        // Negative = stable (chaotic), positive = unstable
        // Map to 0-1 range for coloring
        // Typical range: -2 to 2
        float normalized = (lyapunov + 2.0) / 4.0; // Map -2..2 to 0..1
        normalized = clamp(normalized, 0.0, 1.0);
        
        // Return value for coloring
        // Use iterations to scale for better visualization
        return normalized * uIterations;
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
    juliaC: { x: 0, y: 0 }, // Not used for Lyapunov
  });
}

export const is2D = true;

/**
 * Configuration for Lyapunov fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow',
  },
  initialPosition: {
    zoom: 1,
    offset: { x: 0, y: 0 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1 }, // Center
    { x: 0.5, y: 0.5, zoom: 2 }, // Upper right
    { x: -0.5, y: 0.5, zoom: 2 }, // Upper left
    { x: 0.5, y: -0.5, zoom: 2 }, // Lower right
    { x: -0.5, y: -0.5, zoom: 2 }, // Lower left
    { x: 0.25, y: 0.25, zoom: 3 }, // Detail area
    { x: -0.25, y: 0.25, zoom: 3 }, // Detail area
    { x: 0, y: 0.3, zoom: 4 }, // Vertical detail
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};

