import {
  createFragmentShader,
  createStandardDrawCommand,
} from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Julia Snakes - creates snake-like or tentacle-like patterns
        // Uses a modified Julia set with exponential growth patterns
        
        // Julia constant for snake-like behavior
        // These specific values create the characteristic "snake" patterns
        vec2 juliaC = uJuliaC;
        
        // Initialize z to the current point
        vec2 z = c;
        
        float minDist = 1000.0;
        float totalDist = 0.0;
        
        for (int i = 0; i < 200; i++) {
            if (i >= int(uIterations)) break;
            
            // Calculate squared magnitudes
            float zx2 = z.x * z.x;
            float zy2 = z.y * z.y;
            float zMagSq = zx2 + zy2;
            
            // Check for escape
            if (zMagSq > 16.0) {
                // Smooth coloring using continuous escape
                float log_zn = log(zMagSq) * 0.5;
                float nu = log(log_zn * INV_LOG2) * INV_LOG2;
                
                // Blend escape iteration with distance traveled
                float escapeValue = float(i) + 1.0 - nu;
                return escapeValue + totalDist * 0.1;
            }
            
            // Track minimum distance to origin (creates interesting patterns)
            minDist = min(minDist, zMagSq);
            
            // Standard Julia iteration: z = z^2 + c
            float newX = zx2 - zy2 + juliaC.x;
            float newY = 2.0 * z.x * z.y + juliaC.y;
            
            // Track total distance traveled (orbit path length)
            vec2 delta = vec2(newX - z.x, newY - z.y);
            totalDist += length(delta);
            
            z = vec2(newX, newY);
            
            // Add slight perturbation for snake-like waviness
            float angle = atan(z.y, z.x);
            float wobble = sin(angle * 5.0 + float(i) * 0.1) * 0.01;
            z += vec2(wobble * cos(angle), wobble * sin(angle));
        }
        
        // For points that don't escape, use orbit characteristics
        // Combine minimum distance with total path length for interesting interior colors
        float interiorValue = minDist * 10.0 + totalDist * 2.0;
        return mod(interiorValue, uIterations);
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
    juliaC: params.juliaC,
  });
}

export const is2D = true;

/**
 * Configuration for Julia Snakes fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'midnight',
    juliaC: { x: -0.4, y: 0.6 },
  },
  initialPosition: {
    zoom: 1,
    offset: { x: 0, y: 0 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1.5, cReal: -0.4, cImag: 0.6 },
    { x: 0, y: 0, zoom: 2, cReal: -0.162, cImag: 1.04 },
    { x: 0, y: 0, zoom: 1.8, cReal: -0.54, cImag: 0.54 },
    { x: 0, y: 0, zoom: 2, cReal: 0.285, cImag: 0.01 },
    { x: 0, y: 0, zoom: 1.5, cReal: -0.7, cImag: 0.3 },
    { x: 0.2, y: 0.2, zoom: 3, cReal: -0.39, cImag: 0.587 },
    { x: 0, y: 0, zoom: 2.5, cReal: -0.194, cImag: 0.6557 },
    { x: 0, y: 0, zoom: 2, cReal: -0.8, cImag: 0.156 },
    { x: 0.1, y: 0.1, zoom: 2.5, cReal: -0.355, cImag: 0.355 },
    { x: 0, y: 0, zoom: 1.8, cReal: -0.45, cImag: 0.6 },
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1.5,
    cReal: -0.4,
    cImag: 0.6,
  },
};
