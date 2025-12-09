import {
  createFragmentShader,
  createStandardDrawCommand
} from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Pickover biomorphs - organic-looking shapes from Julia sets
        // Uses standard Julia iteration but ONLY escapes when |Re(z)| or |Im(z)| exceeds threshold
        // NO magnitude check - this is what makes it different from Julia sets
        // Creates organic, cell-like patterns
        vec2 z = c;
        float zx2 = 0.0;
        float zy2 = 0.0;
        
        // Threshold for biomorph detection (can be adjusted via uXScale)
        // Default threshold is around 10.0, varied from 5.0 to 100.0
        // Higher values create more organic, complex biomorphic patterns
        float threshold = 5.0 + uXScale * 95.0;
        
        // Unroll first few iterations for better performance
        // Check threshold ONLY - this is the ONLY escape condition for biomorphs
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            // Return iteration count with enhanced fractional part for organic look
            float t = max(abs(z.x) / threshold, abs(z.y) / threshold);
            // Add some variation based on both components for more organic patterns
            float variation = (abs(z.x) + abs(z.y)) / (threshold * 2.0);
            return 0.0 + (t - 1.0) * 0.3 + variation * 0.2;
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        // NO magnitude check - only threshold matters for biomorphs
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        // Iteration 1
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            float t = max(abs(z.x) / threshold, abs(z.y) / threshold);
            float variation = (abs(z.x) + abs(z.y)) / (threshold * 2.0);
            return 1.0 + (t - 1.0) * 0.3 + variation * 0.2;
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        // Iteration 2
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            float t = max(abs(z.x) / threshold, abs(z.y) / threshold);
            float variation = (abs(z.x) + abs(z.y)) / (threshold * 2.0);
            return 2.0 + (t - 1.0) * 0.3 + variation * 0.2;
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        // Iteration 3
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            float t = max(abs(z.x) / threshold, abs(z.y) / threshold);
            float variation = (abs(z.x) + abs(z.y)) / (threshold * 2.0);
            return 3.0 + (t - 1.0) * 0.3 + variation * 0.2;
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        // Iteration 4
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            float t = max(abs(z.x) / threshold, abs(z.y) / threshold);
            float variation = (abs(z.x) + abs(z.y)) / (threshold * 2.0);
            return 4.0 + (t - 1.0) * 0.3 + variation * 0.2;
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        // Iteration 5
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            float t = max(abs(z.x) / threshold, abs(z.y) / threshold);
            float variation = (abs(z.x) + abs(z.y)) / (threshold * 2.0);
            return 5.0 + (t - 1.0) * 0.3 + variation * 0.2;
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        // Iteration 6
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            float t = max(abs(z.x) / threshold, abs(z.y) / threshold);
            float variation = (abs(z.x) + abs(z.y)) / (threshold * 2.0);
            return 6.0 + (t - 1.0) * 0.3 + variation * 0.2;
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        // Iteration 7
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            float t = max(abs(z.x) / threshold, abs(z.y) / threshold);
            float variation = (abs(z.x) + abs(z.y)) / (threshold * 2.0);
            return 7.0 + (t - 1.0) * 0.3 + variation * 0.2;
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        // Iteration 8
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            float t = max(abs(z.x) / threshold, abs(z.y) / threshold);
            float variation = (abs(z.x) + abs(z.y)) / (threshold * 2.0);
            return 8.0 + (t - 1.0) * 0.3 + variation * 0.2;
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;
        
        // Continue with loop for remaining iterations
        for (int i = 8; i < 200; i++) {
            if (i >= int(uIterations)) break;
            
            // Check threshold ONLY - this is the ONLY escape condition
            if (abs(z.x) > threshold || abs(z.y) > threshold) {
                float t = max(abs(z.x) / threshold, abs(z.y) / threshold);
                float variation = (abs(z.x) + abs(z.y)) / (threshold * 2.0);
                return float(i) + 1.0 + (t - 1.0) * 0.3 + variation * 0.2;
            }
            
            zx2 = z.x * z.x;
            zy2 = z.y * z.y;
            // NO magnitude check - only threshold matters
            
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
 * Configuration for Biomorphs fractal
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

