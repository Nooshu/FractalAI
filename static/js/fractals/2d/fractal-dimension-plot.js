import {
  createFragmentShader,
  createStandardDrawCommand,
} from '../utils.js';

const fractalFunction = `
    // Fractal Dimension Plot
    // Visualizes fractal dimensions across a parameter space
    // Shows how the fractal dimension varies with different parameters
    
    // Box-counting method approximation for fractal dimension
    // D = lim(ε -> 0) log(N(ε)) / log(1/ε)
    // where N(ε) is the number of boxes of size ε needed to cover the fractal
    
    float estimateFractalDimension(vec2 c, float param) {
        // Estimate fractal dimension using box-counting approximation
        // We'll use a simplified approach that visualizes dimension-like properties
        
        // Map coordinates to parameter space
        // c.x controls one parameter, c.y controls another
        float param1 = c.x * 2.0; // Range: -1 to 1
        float param2 = c.y * 2.0; // Range: -1 to 1
        
        // Use param (from uXScale) to select which fractal type to analyze
        int fractalType = int(param * 4.0); // 0-3 for different fractal types
        
        float dimension = 0.0;
        
        if (fractalType == 0) {
            // Mandelbrot-like dimension estimation
            // Dimension varies with escape behavior
            vec2 z = vec2(0.0);
            vec2 c_param = vec2(param1 * 0.5, param2 * 0.5);
            int count = 0;
            
            for (int i = 0; i < 50; i++) {
                if (i >= int(uIterations / 4.0)) break;
                float zx2 = z.x * z.x;
                float zy2 = z.y * z.y;
                if (zx2 + zy2 > 4.0) break;
                z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c_param;
                count++;
            }
            
            // Estimate dimension based on escape behavior
            // More iterations before escape suggests higher dimension
            dimension = float(count) / 50.0;
        } else if (fractalType == 1) {
            // Cantor-like dimension estimation
            // Dimension based on self-similarity structure
            float x = param1;
            float y = param2;
            
            // Simulate Cantor set structure
            float depth = 0.0;
            for (int i = 0; i < 8; i++) {
                if (i >= int(uIterations / 25.0)) break;
                x = fract(x * 3.0);
                y = fract(y * 3.0);
                
                // Check if in removed middle third
                if (x > 0.333 && x < 0.667) {
                    break;
                }
                if (y > 0.333 && y < 0.667) {
                    break;
                }
                depth += 1.0;
            }
            
            // Dimension estimate: log(2) / log(3) ≈ 0.631 for Cantor set
            dimension = 0.5 + depth / 8.0 * 0.3;
        } else if (fractalType == 2) {
            // Sierpinski-like dimension estimation
            // Dimension based on triangular subdivision
            vec2 p = vec2(param1, param2) * 0.5 + 0.5;
            float depth = 0.0;
            
            for (int i = 0; i < 8; i++) {
                if (i >= int(uIterations / 25.0)) break;
                
                // Check which triangle we're in (simplified)
                p = fract(p * 2.0);
                if (p.x + p.y > 1.0) {
                    break; // In removed triangle
                }
                depth += 1.0;
            }
            
            // Dimension estimate: log(3) / log(2) ≈ 1.585 for Sierpinski triangle
            dimension = 1.0 + depth / 8.0 * 0.6;
        } else {
            // Koch-like dimension estimation
            // Dimension based on curve complexity
            float dist = length(vec2(param1, param2));
            float angle = atan(param2, param1);
            
            // Simulate Koch curve complexity
            float complexity = 0.0;
            for (int i = 0; i < 8; i++) {
                if (i >= int(uIterations / 25.0)) break;
                dist = fract(dist * 4.0);
                angle = fract(angle * 4.0);
                complexity += 1.0 / (1.0 + dist * 10.0);
            }
            
            // Dimension estimate: log(4) / log(3) ≈ 1.262 for Koch curve
            dimension = 1.0 + complexity / 8.0 * 0.3;
        }
        
        return clamp(dimension, 0.0, 2.0);
    }
    
    float computeFractal(vec2 c) {
        // Use uXScale to control which fractal type to visualize
        float param = uXScale;
        
        // Estimate fractal dimension at this point
        float dimension = estimateFractalDimension(c, param);
        
        // Visualize dimension as color
        // Map dimension (0-2) to color value
        // Lower dimension = darker, higher dimension = brighter
        float colorValue = dimension / 2.0;
        
        // Add some variation based on position for better visualization
        float variation = sin(c.x * 10.0) * sin(c.y * 10.0) * 0.1;
        colorValue += variation;
        
        // Return value for coloring
        return colorValue * uIterations;
    }
`;

export function render(regl, params, canvas, options = {}) {
  // Check if UBOs should be used (WebGL2 optimization)
  const webglCapabilities = options.webglCapabilities;
  const ubo = options.ubo;
  const useUBO = webglCapabilities?.isWebGL2 && ubo;

  const fragmentShader = createFragmentShader(fractalFunction);
  return createStandardDrawCommand(regl, params, canvas, fragmentShader, {
    webglCapabilities,
    ubo,
  });
}

export const is2D = true;

/**
 * Configuration for Fractal Dimension Plot
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow-double',
  },
  initialPosition: {
    zoom: 0.994,
    offset: { x: 0, y: 0 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1 }, // Full dimension plot view
    { x: 0, y: 0, zoom: 2 }, // Center detail
    { x: 0.3, y: 0.3, zoom: 3 }, // Upper right quadrant
    { x: -0.3, y: 0.3, zoom: 3 }, // Upper left quadrant
    { x: 0.3, y: -0.3, zoom: 3 }, // Lower right quadrant
    { x: -0.3, y: -0.3, zoom: 3 }, // Lower left quadrant
    { x: 0.2, y: 0.2, zoom: 4 }, // Deep zoom upper right
    { x: -0.2, y: 0.2, zoom: 4 }, // Deep zoom upper left
    { x: 0.2, y: -0.2, zoom: 4 }, // Deep zoom lower right
    { x: 0, y: 0, zoom: 1.5 }, // Medium zoom center
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};

