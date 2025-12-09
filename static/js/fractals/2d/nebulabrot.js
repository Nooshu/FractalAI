import {
  createFragmentShader,
  createStandardDrawCommand
} from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Nebulabrot - density plot of escape paths
        // For each location, sample multiple starting points and track their escape paths
        // Density is built by counting how many escape paths pass through this location
        
        float density = 0.0;
        int numSamples = 6; // Number of nearby starting points to sample
        
        // Sample multiple starting points in a small region around the current location
        // This approximates the density from many escape paths
        for (int sample = 0; sample < 6; sample++) {
            // Create a small offset for sampling
            float angle = float(sample) * 6.28318 / float(numSamples); // 2*PI / numSamples
            float radius = 0.02 / uZoom; // Scale sampling radius by zoom
            vec2 sampleC = c + vec2(cos(angle), sin(angle)) * radius;
            
            // Iterate from this starting point
            vec2 z = vec2(0.0);
            float zx2 = 0.0;
            float zy2 = 0.0;
            bool escaped = false;
            
            // Track the escape path
            for (int i = 0; i < 200; i++) {
                if (i >= int(uIterations)) break;
                
                zx2 = z.x * z.x;
                zy2 = z.y * z.y;
                
                // Check for escape
                if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
                    escaped = true;
                    
                    // After escape, check if the escape location is near the current pixel
                    // This contributes to density
                    float distToCurrent = length(z - c);
                    float influence = 1.0 / (1.0 + distToCurrent * 15.0);
                    density += influence * (1.0 + float(i) * 0.08);
                    break;
                }
                
                // Standard Mandelbrot iteration: z = z^2 + c
                z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + sampleC;
                
                // Check if the current z value passes through or near the pixel location
                // This is the key to building the density map
                float distToCurrent = length(z - c);
                float threshold = 0.08 / uZoom; // Scale threshold by zoom
                
                if (distToCurrent < threshold) {
                    // This escape path passes near the current pixel location
                    // Add to density with distance-based weighting
                    float influence = 1.0 / (1.0 + distToCurrent * 50.0);
                    density += influence * (1.0 + float(i) * 0.03);
                }
            }
            
            // Points that don't escape are in the set (will be black)
            // They don't contribute to the density map
        }
        
        // Normalize density
        float normalizedDensity = density / float(numSamples);
        
        // Apply logarithmic scaling for better visual distribution
        // This makes the density plot more visible and colorful
        if (normalizedDensity > 0.0) {
            // Use logarithmic scaling to compress the range
            float logDensity = log(1.0 + normalizedDensity * 5.0);
            // Scale to work with color schemes (similar to iteration count)
            return logDensity * (uIterations * 0.3);
        }
        
        // Points in the set return max iterations (rendered as black)
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
    juliaC: { x: 0, y: 0 }, // Not used for Nebulabrot
  });
}

export const is2D = true;

/**
 * Configuration for Nebulabrot fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'classic'
},
  initialPosition: {
    zoom: 1,
    offset: { x: 0, y: 0 }
},
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};