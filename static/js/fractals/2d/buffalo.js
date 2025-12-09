import {
  createFragmentShader,
  createStandardDrawCommand
} from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Buffalo fractal with smooth coloring
        // Formula: z = (|Re(z)| - i|Im(z)|)^2 + c
        vec2 z = vec2(0.0);
        float zx2 = 0.0;
        float zy2 = 0.0;
        
        // Unroll first few iterations for better performance
        // Iteration 0
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 0.0 + 1.0 - nu;
        }
        // Apply absolute value to real, negate imaginary after absolute value
        float abs_x = abs(z.x);
        float abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, -2.0 * abs_x * abs_y) + c;
        
        // Iteration 1
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 1.0 + 1.0 - nu;
        }
        abs_x = abs(z.x);
        abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, -2.0 * abs_x * abs_y) + c;
        
        // Iteration 2
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 2.0 + 1.0 - nu;
        }
        abs_x = abs(z.x);
        abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, -2.0 * abs_x * abs_y) + c;
        
        // Continue with loop for remaining iterations
        for (int i = 3; i < 200; i++) {
            if (i >= int(uIterations)) break;
            
            // Calculate squared magnitudes
            zx2 = z.x * z.x;
            zy2 = z.y * z.y;
            
            // Check for escape
            if (zx2 + zy2 > 4.0) {
                // Smooth coloring using continuous escape
                float log_zn = log(zx2 + zy2) * 0.5;
                float nu = log(log_zn / log(2.0)) / log(2.0);
                return float(i) + 1.0 - nu;
            }
            
            // Buffalo formula: z = (|Re(z)| - i|Im(z)|)^2 + c
            // Note the negative sign for the imaginary component
            float abs_x = abs(z.x);
            float abs_y = abs(z.y);
            z = vec2(abs_x * abs_x - abs_y * abs_y, -2.0 * abs_x * abs_y) + c;
        }
        
        return uIterations;
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
    juliaC: { x: 0, y: 0 }
});
}

export const is2D = true;

/**
 * Configuration for Buffalo fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'coral'
},
  initialPosition: {
    zoom: 2,
    offset: { x: -0.5473, y: 0.5336 }
  },
  fallbackPosition: {
    offset: { x: -0.5, y: 0.6 },
    zoom: 1.2
}
};
