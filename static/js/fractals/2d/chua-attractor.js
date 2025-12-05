import {
  createFragmentShader,
  createStandardDrawCommand,
} from '../utils.js';

const fractalFunction = `
    // Chua Attractor
    // A chaotic electronic circuit attractor defined by:
    // dx/dt = α(y - x - f(x))
    // dy/dt = x - y + z
    // dz/dt = -βy
    // where f(x) = m1*x + 0.5*(m0-m1)*(|x+1| - |x-1|)
    // We project the 3D trajectory to 2D for visualization
    
    float chuaNonlinearity(float x, float m0, float m1) {
        // Piecewise linear function: f(x) = m1*x + 0.5*(m0-m1)*(|x+1| - |x-1|)
        return m1 * x + 0.5 * (m0 - m1) * (abs(x + 1.0) - abs(x - 1.0));
    }
    
    float computeFractal(vec2 c) {
        // Map screen coordinates to initial conditions
        float x0 = c.x * 3.0; // Initial x position
        float y0 = c.y * 3.0; // Initial y position
        float z0 = 0.0; // Initial z position
        
        // Chua circuit parameters (classic values)
        // Can be controlled by uXScale and uYScale
        float alpha = 9.0 + uXScale * 6.0; // α (9-15)
        float beta = 14.286 + uYScale * 5.0; // β (14.286-19.286)
        float m0 = -1.143; // m0 parameter
        float m1 = -0.714; // m1 parameter
        
        // Time step
        float dt = 0.01;
        
        // Current state
        float x = x0;
        float y = y0;
        float z = z0;
        
        // Track how many times the trajectory passes near this pixel
        float density = 0.0;
        int iterations = int(uIterations);
        float maxStepsFloat = min(float(iterations) * 10.0, 2000.0);
        int maxSteps = int(maxStepsFloat);
        
        // Integrate the Chua system
        for (int i = 0; i < 2000; i++) {
            if (i >= maxSteps) break;
            
            // Chua circuit equations (Euler method)
            float fx = chuaNonlinearity(x, m0, m1);
            float dx = alpha * (y - x - fx);
            float dy = x - y + z;
            float dz = -beta * y;
            
            // Update position
            x += dx * dt;
            y += dy * dt;
            z += dz * dt;
            
            // Project 3D to 2D (x-y projection)
            vec2 projected = vec2(x, y);
            
            // Check if trajectory passes near the current pixel
            float dist = length(projected - c * 3.0);
            float threshold = 0.3;
            
            if (dist < threshold) {
                // Trajectory passes near this pixel
                float influence = 1.0 / (1.0 + dist * 15.0);
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
    juliaC: { x: 0, y: 0 }, // Not used for Chua attractor
  });
}

export const is2D = true;

/**
 * Configuration for Chua Attractor fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow',
  },
  initialPosition: {
    zoom: 1,
    offset: { x: 0, y: 0 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 0.5 }, // Classic view
    { x: 0, y: 0, zoom: 1 }, // Zoomed in
    { x: 0, y: 0, zoom: 2 }, // More detail
    { x: 0.1, y: 0.1, zoom: 3 }, // Detail area
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 0.5,
  },
};

