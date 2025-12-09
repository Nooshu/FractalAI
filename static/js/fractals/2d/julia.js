import {
  createFragmentShader,
  createStandardDrawCommand
} from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Optimized Julia set with smooth coloring and early bailout
        vec2 z = c;
        float zx2 = 0.0;
        float zy2 = 0.0;
        
        // Unroll first 8 iterations for better performance
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 1.0 - nu;
        }
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 2.0 - nu;
        }
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 3.0 - nu;
        }
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 4.0 - nu;
        }
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 5.0 - nu;
        }
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 6.0 - nu;
        }
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 7.0 - nu;
        }
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 8.0 - nu;
        }
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        // Continue with loop for remaining iterations
        for (int i = 8; i < 200; i++) {
            if (i >= int(uIterations)) break;
            
            // Use squared magnitude check (faster than dot product)
            zx2 = z.x * z.x;
            zy2 = z.y * z.y;
            if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
                // Smooth coloring using continuous escape
                float log_zn = log(zx2 + zy2) * 0.5;
                // Optimized: use precomputed INV_LOG2 instead of division
                float nu = log(log_zn * INV_LOG2) * INV_LOG2;
                return float(i) + 1.0 - nu;
            }
            
            // Optimized complex multiplication
            z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
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
 * Configuration for Julia fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'midnight'
},
  initialPosition: {
    zoom: 1,
    offset: { x: 0, y: 0 }
  },
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1.5,
    cReal: -0.7269,
    cImag: 0.1889
}
};
