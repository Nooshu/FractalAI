import {
  createFragmentShader,
  createStandardDrawCommand
} from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Burning Ship Julia set with smooth coloring
        // Formula: z = (|Re(z)| + i|Im(z)|)^2 + uJuliaC
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
        // Apply absolute values before squaring (key difference from standard Julia)
        float abs_x = abs(z.x);
        float abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, 2.0 * abs_x * abs_y) + uJuliaC;

        // Iteration 1
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 1.0 + 1.0 - nu;
        }
        abs_x = abs(z.x);
        abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, 2.0 * abs_x * abs_y) + uJuliaC;

        // Iteration 2
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 2.0 + 1.0 - nu;
        }
        abs_x = abs(z.x);
        abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, 2.0 * abs_x * abs_y) + uJuliaC;

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

            // Burning Ship Julia formula: use absolute values before squaring
            // z = (|Re(z)| + i|Im(z)|)^2 + uJuliaC
            abs_x = abs(z.x);
            abs_y = abs(z.y);
            z = vec2(abs_x * abs_x - abs_y * abs_y, 2.0 * abs_x * abs_y) + uJuliaC;
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
 * Configuration for Burning Ship Julia fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'ocean',
    iterations: 10,
    juliaC: { x: -0.5, y: -0.5 }
},
  initialPosition: {
    zoom: 1,
    offset: { x: 0, y: 0 }
},
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
  // Interesting bounds for "surprise me" - Burning Ship Julia sets
  interestingBounds: {
    offsetX: [-2, 2],
    offsetY: [-2, 2],
    zoom: [0.5, 100],
    juliaCX: [-1, 1],
    juliaCY: [-1, 1],
  }
};
