import {
  createFragmentShader,
  createStandardDrawCommand
} from '../utils.js';

const fractalFunction = `
    // IFS Maple Leaf Attractor
    // Iterated Function System creating maple leaf-like patterns
    // Uses multiple affine transformations

    float computeFractal(vec2 c) {
        // Scale coordinates
        float scale = 1.5 + uYScale * 1.5; // 1.5 to 3.0
        vec2 p = vec2(c.x * scale, c.y * scale + 2.0); // Shift up

        // Number of iterations
        int maxIter = int(clamp(uIterations / 15.0, 20.0, 80.0));

        // Initialize - start from origin
        vec2 point = vec2(0.0, 0.0);
        float density = 0.0;

        // IFS transformations for maple leaf pattern
        // Based on typical leaf IFS patterns

        // Transformation 1: Main leaf body (most common)
        mat2 rot1 = mat2(0.8, -0.05, 0.05, 0.8);
        vec2 offset1 = vec2(0.0, 0.84);

        // Transformation 2: Left lobe
        mat2 rot2 = mat2(0.3, 0.3, -0.3, 0.3);
        vec2 offset2 = vec2(0.0, 0.3);

        // Transformation 3: Right lobe
        mat2 rot3 = mat2(0.3, -0.3, 0.3, 0.3);
        vec2 offset3 = vec2(0.0, 0.3);

        // Transformation 4: Stem
        mat2 rot4 = mat2(0.0, 0.0, 0.0, 0.2);
        vec2 offset4 = vec2(0.0, 0.0);

        // Iterate forward
        for (int i = 0; i < 80; i++) {
            if (i >= maxIter) break;

            // Choose transformation randomly
            float choice = fract(sin(float(i) * 12.9898 + dot(point, vec2(78.233, 12.345))) * 43758.5453);

            vec2 transformed;
            if (choice < 0.85) {
                // Transformation 1 (85% probability)
                transformed = rot1 * point + offset1;
            } else if (choice < 0.92) {
                // Transformation 2 (7% probability)
                transformed = rot2 * point + offset2;
            } else if (choice < 0.99) {
                // Transformation 3 (7% probability)
                transformed = rot3 * point + offset3;
            } else {
                // Transformation 4 (1% probability) - stem
                transformed = rot4 * point + offset4;
            }

            point = transformed;

            // Check if point is near the query point p
            vec2 diff = point - p;
            float dist2 = dot(diff, diff);

            // Accumulate density
            density += 1.0 / (1.0 + dist2 * 10.0);
        }

        // Normalize and return
        float result = density / float(maxIter);
        result = pow(result, 0.5); // Gamma correction
        return result * uIterations * 4.0;
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
    juliaC: { x: 0, y: 0 }, // Not used for IFS maple
  });
}

export const is2D = true;

/**
 * Configuration for IFS Maple Leaf Attractor
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow'
},
  initialPosition: {
    zoom: 2.321,
    offset: { x: 0.0742, y: 0.2625 }
  },
  fallbackPosition: {
    offset: { x: 0, y: -0.5 },
    zoom: 3.0
},
  // Interesting bounds for "surprise me" - IFS maple is always interesting
  interestingBounds: {
    offsetX: [-1, 1],
    offsetY: [-1, 1],
    zoom: [0.5, 10],
  }
};

