import {
  createFragmentShader,
  createStandardDrawCommand
} from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Phoenix Julia set - variant that uses previous z value
        // Formula: z_new = z^2 + uJuliaC + p * z_prev
        // Where p is a parameter (Phoenix parameter)
        // This creates interesting "phoenix" patterns

        // Phoenix parameter p (controlled by xScale and yScale)
        // xScale controls real part, yScale controls imaginary part
        // Use uXScale/uYScale (template provides aliases for UBO mode)
        vec2 p = vec2((uXScale - 0.5) * 2.0, (uYScale - 0.5) * 2.0);
        // Clamp to reasonable range
        p = clamp(p, vec2(-1.0, -1.0), vec2(1.0, 1.0));

        // For Julia sets, z starts at the pixel coordinate c
        vec2 z = c;
        vec2 z_prev = vec2(0.0);
        float zx2 = 0.0;
        float zy2 = 0.0;

        // Unroll first few iterations for better performance
        // Iteration 0: z = c, z_prev = 0
        // Save current z to z_prev, then z_new = c^2 + uJuliaC + p*c
        z_prev = z;
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC + p * z_prev;

        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 0.0 + 1.0 - nu;
        }

        // Iteration 1
        z_prev = z;
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC + p * z_prev;

        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 1.0 + 1.0 - nu;
        }

        // Iteration 2
        z_prev = z;
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC + p * z_prev;

        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 2.0 + 1.0 - nu;
        }

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

            // Phoenix Julia formula: z_new = z^2 + uJuliaC + p * z_prev
            z_prev = z;
            z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC + p * z_prev;
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
 * Configuration for Phoenix Julia fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'cosmic',
    iterations: 25,
    juliaC: { x: -0.5, y: 0.0 },
    xScale: 0.6,
    yScale: 0.5
},
  initialPosition: {
    zoom: 0.605,
    offset: { x: 0.0284, y: 0.0611 }
},
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
  // Interesting bounds for "surprise me" - Phoenix Julia sets
  interestingBounds: {
    offsetX: [-2, 2],
    offsetY: [-2, 2],
    zoom: [0.5, 100],
    juliaCX: [-1, 1],
    juliaCY: [-1, 1],
  }
};
