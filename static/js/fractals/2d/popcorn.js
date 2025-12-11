import {
  createFragmentShader,
  createStandardDrawCommand
} from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Popcorn fractal (also known as Clifford attractor variant)
        // Formula: x_n+1 = x_n - h*sin(y_n + tan(a*y_n))
        //          y_n+1 = y_n - h*sin(x_n + tan(b*x_n))

        vec2 z = c;
        float h = 0.05; // Step parameter
        float a = 3.0;  // Parameter for y term
        float b = 3.0;  // Parameter for x term

        // Track how far the point travels (orbit length)
        float orbitLength = 0.0;
        vec2 lastPos = z;

        // We'll use orbit behavior to color the fractal
        // Points that create bounded, interesting patterns vs escaping points
        float escape = 0.0;
        bool escaped = false;

        for (int i = 0; i < 200; i++) {
            if (i >= int(uIterations)) break;

            // Calculate tan values (with safety checks)
            float tanY = tan(a * z.y);
            float tanX = tan(b * z.x);

            // Clamp tan values to prevent infinity
            tanY = clamp(tanY, -10.0, 10.0);
            tanX = clamp(tanX, -10.0, 10.0);

            // Popcorn map iteration
            float newX = z.x - h * sin(z.y + tanY);
            float newY = z.y - h * sin(z.x + tanX);

            z = vec2(newX, newY);

            // Track orbit length (distance traveled)
            vec2 delta = z - lastPos;
            orbitLength += length(delta);
            lastPos = z;

            // Check for escape condition (moved very far from origin)
            float distSq = z.x * z.x + z.y * z.y;
            if (distSq > 100.0) {
                escaped = true;
                escape = float(i);
                break;
            }

            // Check for extremely large values (numerical instability)
            if (abs(z.x) > 1000.0 || abs(z.y) > 1000.0) {
                escaped = true;
                escape = float(i);
                break;
            }
        }

        // Color based on orbit behavior
        if (escaped) {
            // Escaped points - use smooth escape time
            float distSq = z.x * z.x + z.y * z.y;
            if (distSq > 0.0) {
                return escape + 1.0 - log2(log2(distSq) / log2(2.0));
            }
            return escape;
        } else {
            // Bounded orbits - use orbit length for interesting patterns
            // Normalize orbit length to get varied coloring
            return mod(orbitLength * 5.0, uIterations);
        }
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
 * Configuration for Popcorn fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow-vibrant', // Rainbow Vibrant
  },
  initialPosition: {
    zoom: 1,
    offset: { x: 0, y: 0 }
  },
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1
},
  // Interesting bounds for "surprise me" - Popcorn fractal is centered
  interestingBounds: {
    offsetX: [-2, 2],
    offsetY: [-2, 2],
    zoom: [0.5, 100],
  }
};
