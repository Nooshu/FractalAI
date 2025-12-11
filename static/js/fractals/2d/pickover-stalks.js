import {
  createFragmentShader,
  createStandardDrawCommand
} from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Pickover stalks - variant of Julia sets
        // Uses standard Julia iteration but ONLY escapes when |Re(z)| or |Im(z)| exceeds threshold
        // NO magnitude check - this is what makes it different from Julia sets
        // Creates stalk-like patterns
        vec2 z = c;
        float zx2 = 0.0;
        float zy2 = 0.0;

        // Threshold for stalk detection (can be adjusted via uXScale)
        // Default threshold is around 10.0, varied from 5.0 to 100.0
        // Higher values allow more iterations before escape, creating longer stalks
        float threshold = 5.0 + uXScale * 95.0;

        // Unroll first few iterations for better performance
        // Check threshold ONLY - this is the ONLY escape condition for stalks
        // Pickover stalks: escape when |Re(z)| OR |Im(z)| exceeds threshold
        // This creates vertical/horizontal "stalk" patterns
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            // Sharp coloring based on which component exceeded
            // If real component exceeded: return low value (creates vertical bands)
            // If imaginary component exceeded: return high value (creates horizontal bands)
            float absX = abs(z.x);
            float absY = abs(z.y);

            // Determine which component exceeded first/more
            if (absX > absY) {
                // Real component dominant - vertical stalks
                return 0.0 + float(0) * 0.1;
            } else {
                // Imaginary component dominant - horizontal stalks
                return uIterations * 0.5 + float(0) * 0.1;
            }
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        // NO magnitude check - only threshold matters for Pickover stalks
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;

        // Iteration 1
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            float absX = abs(z.x);
            float absY = abs(z.y);
            if (absX > absY) {
                return 0.0 + float(1) * 0.1;
            } else {
                return uIterations * 0.5 + float(1) * 0.1;
            }
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;

        // Iteration 2
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            float absX = abs(z.x);
            float absY = abs(z.y);
            if (absX > absY) {
                return 0.0 + float(2) * 0.1;
            } else {
                return uIterations * 0.5 + float(2) * 0.1;
            }
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;

        // Iteration 3
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            float absX = abs(z.x);
            float absY = abs(z.y);
            if (absX > absY) {
                return 0.0 + float(3) * 0.1;
            } else {
                return uIterations * 0.5 + float(3) * 0.1;
            }
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;

        // Iteration 4
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            float absX = abs(z.x);
            float absY = abs(z.y);
            if (absX > absY) {
                return 0.0 + float(4) * 0.1;
            } else {
                return uIterations * 0.5 + float(4) * 0.1;
            }
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;

        // Iteration 5
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            float absX = abs(z.x);
            float absY = abs(z.y);
            if (absX > absY) {
                return 0.0 + float(5) * 0.1;
            } else {
                return uIterations * 0.5 + float(5) * 0.1;
            }
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;

        // Iteration 6
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            float absX = abs(z.x);
            float absY = abs(z.y);
            if (absX > absY) {
                return 0.0 + float(6) * 0.1;
            } else {
                return uIterations * 0.5 + float(6) * 0.1;
            }
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;

        // Iteration 7
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            float absX = abs(z.x);
            float absY = abs(z.y);
            if (absX > absY) {
                return 0.0 + float(7) * 0.1;
            } else {
                return uIterations * 0.5 + float(7) * 0.1;
            }
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;

        // Iteration 8
        if (abs(z.x) > threshold || abs(z.y) > threshold) {
            float absX = abs(z.x);
            float absY = abs(z.y);
            if (absX > absY) {
                return 0.0 + float(8) * 0.1;
            } else {
                return uIterations * 0.5 + float(8) * 0.1;
            }
        }
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + uJuliaC;

        // Continue with loop for remaining iterations
        for (int i = 8; i < 200; i++) {
            if (i >= int(uIterations)) break;

            // Check threshold ONLY - this is the ONLY escape condition
            if (abs(z.x) > threshold || abs(z.y) > threshold) {
                float absX = abs(z.x);
                float absY = abs(z.y);
                if (absX > absY) {
                    // Real component exceeded - vertical stalks
                    return 0.0 + float(i) * 0.1;
                } else {
                    // Imaginary component exceeded - horizontal stalks
                    return uIterations * 0.5 + float(i) * 0.1;
                }
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
 * Configuration for Pickover stalks fractal
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
},
  // Interesting bounds for "surprise me" - Pickover Stalks
  interestingBounds: {
    offsetX: [-2, 2],
    offsetY: [-2, 2],
    zoom: [0.5, 100],
    juliaCX: [-1, 1],
    juliaCY: [-1, 1],
  }
};

