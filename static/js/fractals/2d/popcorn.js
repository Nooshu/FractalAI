import {
  createFragmentShader,
  createStandardDrawCommand,
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
    juliaC: { x: 0, y: 0 },
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
    offset: { x: 0, y: 0 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1 }, // Center view
    { x: 0.5, y: 0.5, zoom: 2 }, // Upper right quadrant
    { x: -0.5, y: -0.5, zoom: 2 }, // Lower left quadrant
    { x: 0.3, y: -0.3, zoom: 3 }, // Mixed region
    { x: -0.4, y: 0.4, zoom: 3 }, // Another mixed region
    { x: 0.7, y: 0.2, zoom: 4 }, // Edge patterns
    { x: -0.2, y: 0.7, zoom: 4 }, // More edge patterns
    { x: 0.1, y: 0.1, zoom: 5 }, // Detailed center
    { x: -0.6, y: 0.1, zoom: 4 }, // Left region detail
    { x: 0.4, y: -0.6, zoom: 4 }, // Bottom right detail
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};
