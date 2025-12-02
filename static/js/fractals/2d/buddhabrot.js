import {
  createFragmentShader,
  createStandardDrawCommand,
} from '../utils.js';

const fractalFunction = `
    // Buddhabrot: Classic orbit density visualization
    // Tracks how many escaping orbits pass through each pixel
    // Classic Buddhabrot is simpler than Nebulabrot - single channel, no iteration-based weighting
    
    float computeFractal(vec2 c) {
        // Buddhabrot samples points in the complex plane and tracks their orbits
        // Only orbits that escape contribute to the density map
        
        float density = 0.0;
        int numSamples = 8; // Number of sample points around current location
        
        // Sample points in a circular pattern around the current pixel
        // This approximates the orbit density from many starting points
        for (int sample = 0; sample < 8; sample++) {
            // Create offset for sampling - use deterministic pattern based on sample index
            float angle = float(sample) * 6.28318 / 8.0; // 2*PI / numSamples
            float radius = 0.015 / uZoom; // Scale sampling radius by zoom
            vec2 sampleC = c + vec2(cos(angle), sin(angle)) * radius;
            
            // Track orbit for this starting point
            vec2 z = vec2(0.0);
            bool escaped = false;
            float orbitContrib = 0.0;
            
            // Iterate and track the entire orbit path
            for (int i = 0; i < 200; i++) {
                if (i >= int(uIterations)) break;
                
                // Check for escape
                float zx2 = z.x * z.x;
                float zy2 = z.y * z.y;
                if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
                    escaped = true;
                    break;
                }
                
                // Standard Mandelbrot iteration: z = z^2 + c
                z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + sampleC;
                
                // Check if orbit passes through or near the current pixel
                // Classic Buddhabrot: simple distance-based contribution
                float distToPixel = length(z - c);
                float threshold = 0.05 / uZoom; // Scale threshold by zoom
                
                if (distToPixel < threshold) {
                    // Orbit passes near this pixel - add to density
                    // Simple inverse distance weighting (no iteration-based weighting)
                    float influence = 1.0 / (1.0 + distToPixel * 40.0);
                    orbitContrib += influence;
                }
            }
            
            // Only count orbits that escaped (Buddhabrot only shows escaping orbits)
            if (escaped) {
                density += orbitContrib;
            }
        }
        
        // Average density across samples
        density /= float(numSamples);
        
        // Classic Buddhabrot uses simpler scaling - no logarithmic compression
        // Just scale the density for visualization
        if (density > 0.0) {
            return density * uIterations * 0.5;
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
    juliaC: { x: 0, y: 0 }, // Not used for Buddhabrot
  });
}

export const is2D = true;

/**
 * Configuration for Buddhabrot fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'vintage',
  },
  initialPosition: {
    zoom: 4,
    offset: { x: -0.7566, y: 0.4428 },
  },
  interestingPoints: [
    { x: -0.75, y: 0.1, zoom: 50 }, // Seahorse valley
    { x: -0.5, y: 0.5, zoom: 100 }, // Top bulb
    { x: 0.0, y: 0.0, zoom: 1 }, // Center
    { x: -1.25, y: 0.0, zoom: 200 }, // Left side
    { x: -0.1592, y: 1.0317, zoom: 500 }, // Mini mandelbrot
    { x: -0.77568377, y: 0.13646737, zoom: 1000 }, // Deep zoom area
    { x: 0.285, y: 0.01, zoom: 300 }, // Right side detail
    { x: -0.8, y: 0.156, zoom: 800 }, // Elephant valley
  ],
  fallbackPosition: {
    offset: { x: -0.75, y: 0.1 },
    zoom: 50,
  },
};

