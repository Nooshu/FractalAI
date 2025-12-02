import {
  createFragmentShader,
  createStandardDrawCommand,
} from '../utils.js';

const fractalFunction = `
    // Rössler Attractor
    // A simpler chaotic system defined by:
    // dx/dt = -(y + z)
    // dy/dt = x + ay
    // dz/dt = b + z(x - c)
    // We project the 3D trajectory to 2D for visualization
    
    float computeFractal(vec2 c) {
        // Map screen coordinates to initial conditions
        float x0 = c.x * 15.0; // Initial x position
        float y0 = c.y * 15.0; // Initial y position
        float z0 = 0.0; // Initial z position
        
        // Rössler parameters (classic values)
        // Can be controlled by uXScale and uYScale
        float a = 0.2;
        float b = 0.2 + uXScale * 0.3; // b (0.2-0.5)
        float rosslerC = 5.7 + uYScale * 4.0; // c (5.7-9.7) - renamed to avoid conflict with vec2 c
        
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
        
        // Integrate the Rössler system
        for (int i = 0; i < 2000; i++) {
            if (i >= maxSteps) break;
            
            // Rössler equations (Euler method)
            float dx = -(y + z);
            float dy = x + a * y;
            float dz = b + z * (x - rosslerC);
            
            // Update position
            x += dx * dt;
            y += dy * dt;
            z += dz * dt;
            
            // Project 3D to 2D (x-y projection)
            vec2 projected = vec2(x, y);
            
            // Check if trajectory passes near the current pixel
            float dist = length(projected - c * 15.0);
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
    juliaC: { x: 0, y: 0 }, // Not used for Rössler
  });
}

export const is2D = true;

/**
 * Configuration for Rössler Attractor fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'galaxy',
  },
  initialPosition: {
    zoom: 0.5,
    offset: { x: 0.0253, y: 0.2417 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 0.5 }, // Classic view
    { x: 0, y: 0, zoom: 1 }, // Zoomed in
    { x: 0, y: 0, zoom: 2 }, // More detail
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 0.5,
  },
};

