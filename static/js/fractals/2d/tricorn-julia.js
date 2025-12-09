import {
  createFragmentShader,
  createStandardDrawCommand
} from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Tricorn (Mandelbar) Julia set with smooth coloring
        // Formula: z = (conjugate(z))^2 + uJuliaC
        // For z = x + iy, conjugate(z) = x - iy
        // (conjugate(z))^2 = (x - iy)^2 = x^2 - 2ixy - y^2 = (x^2 - y^2) - 2ixy
        vec2 z = c;
        float zx2 = 0.0;
        float zy2 = 0.0;
        
        // Unroll first few iterations for better performance
        // Iteration 0
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 0.0 + 1.0 - nu;
        }
        // Tricorn formula: (conjugate(z))^2 = (x^2 - y^2) - 2ixy
        z = vec2(zx2 - zy2, -2.0 * z.x * z.y) + uJuliaC;
        
        // Iteration 1
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 1.0 + 1.0 - nu;
        }
        z = vec2(zx2 - zy2, -2.0 * z.x * z.y) + uJuliaC;
        
        // Iteration 2
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 2.0 + 1.0 - nu;
        }
        z = vec2(zx2 - zy2, -2.0 * z.x * z.y) + uJuliaC;
        
        // Continue with loop for remaining iterations
        for (int i = 3; i < 200; i++) {
            if (i >= int(uIterations)) break;
            
            // Calculate squared magnitudes
            zx2 = z.x * z.x;
            zy2 = z.y * z.y;
            
            // Check for escape
            if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
                // Smooth coloring using continuous escape
                float log_zn = log(zx2 + zy2) * 0.5;
                float nu = log(log_zn * INV_LOG2) * INV_LOG2;
                return float(i) + 1.0 - nu;
            }
            
            // Tricorn Julia formula: z = (conjugate(z))^2 + uJuliaC
            // (conjugate(z))^2 = (x^2 - y^2) - 2ixy
            z = vec2(zx2 - zy2, -2.0 * z.x * z.y) + uJuliaC;
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
    juliaC: params.juliaC
});
}

export const is2D = true;

/**
 * Configuration for Tricorn Julia fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'cosmic',
    iterations: 25,
    juliaC: { x: -0.5, y: 0.5 }
},
  initialPosition: {
    zoom: 1,
    offset: { x: 0, y: 0 }
},
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};