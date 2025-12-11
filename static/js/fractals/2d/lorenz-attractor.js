import {
  createFragmentShader,
  createStandardDrawCommand
} from '../utils.js';

const fractalFunction = `
    // Lorenz Attractor
    // A chaotic dynamical system defined by:
    // dx/dt = σ(y - x)
    // dy/dt = x(ρ - z) - y
    // dz/dt = xy - βz
    // We project the 3D trajectory to 2D for visualization

    float computeFractal(vec2 c) {
        // Map screen coordinates to initial conditions
        // c.x and c.y control initial position in the attractor space
        float x0 = c.x * 20.0; // Initial x position
        float y0 = c.y * 20.0; // Initial y position
        float z0 = 10.0; // Initial z position (fixed)

        // Lorenz parameters (classic values)
        // Can be controlled by uXScale and uYScale
        float sigma = 10.0; // σ
        float rho = 28.0 + uXScale * 20.0; // ρ (28-48)
        float beta = 8.0 / 3.0 + uYScale * 2.0; // β (2.67-4.67)

        // Time step
        float dt = 0.01;

        // Current state
        float x = x0;
        float y = y0;
        float z = z0;

        // Track how many times the trajectory passes near this pixel
        float density = 0.0;
        int iterations = int(uIterations);
        // Calculate max steps - use float min() then convert to int for WebGL1 compatibility
        float maxStepsFloat = min(float(iterations) * 10.0, 2000.0);
        int maxSteps = int(maxStepsFloat);

        // Integrate the Lorenz system
        for (int i = 0; i < 2000; i++) {
            if (i >= maxSteps) break;

            // Lorenz equations (Euler method)
            float dx = sigma * (y - x);
            float dy = x * (rho - z) - y;
            float dz = x * y - beta * z;

            // Update position
            x += dx * dt;
            y += dy * dt;
            z += dz * dt;

            // Project 3D to 2D (use x-y projection, or x-z, or y-z)
            // Classic view: x-y projection
            vec2 projected = vec2(x, y);

            // Check if trajectory passes near the current pixel
            float dist = length(projected - c * 20.0);
            float threshold = 0.5;

            if (dist < threshold) {
                // Trajectory passes near this pixel
                float influence = 1.0 / (1.0 + dist * 10.0);
                density += influence;
            }
        }

        // Return density for coloring
        if (density > 0.0) {
            // Use logarithmic scaling for better visualization
            float logDensity = log(1.0 + density * 2.0);
            return logDensity * uIterations * 0.5;
        }

        return 0.0;
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
    juliaC: { x: 0, y: 0 }, // Not used for Lorenz
  });
}

export const is2D = true;

/**
 * Configuration for Lorenz Attractor fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'galaxy'
},
  initialPosition: {
    zoom: 1,
    offset: { x: -0.0805, y: 0.0075 }
  },
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 0.5
},
  // Interesting bounds for "surprise me" - Lorenz attractor is always interesting
  interestingBounds: {
    offsetX: [-2, 2],
    offsetY: [-2, 2],
    zoom: [0.3, 5],
  }
};

