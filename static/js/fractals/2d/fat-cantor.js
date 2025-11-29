import {
  createFragmentShader,
  createStandardDrawCommand,
} from '../utils.js';

const fractalFunction = `
    // Helper function to check if a point is in the Fat Cantor set at a given level
    // Fat Cantor set removes a smaller middle portion (1/4 instead of 1/3)
    bool isInFatCantor(float x, int level) {
        // Recursively check if x is in a remaining segment
        // Base case: level 0 means the entire [0, 1] segment
        if (level == 0) {
            return (x >= 0.0 && x <= 1.0);
        }
        
        // For Fat Cantor set, we remove the middle 1/4 (from 3/8 to 5/8)
        // This leaves 3/8 on the left and 3/8 on the right
        float scale = 1.0;
        
        for (int i = 0; i < 15; i++) {
            if (i >= level) break;
            
            // Each segment is divided into: [left 3/8] [removed 1/4] [right 3/8]
            float leftEnd = scale * 3.0 / 8.0;
            float removedStart = scale * 3.0 / 8.0;
            float removedEnd = scale * 5.0 / 8.0;
            float rightStart = scale * 5.0 / 8.0;
            
            // Normalize x to [0, scale] range
            float localX = mod(x, scale);
            
            // Check if in middle removed region
            if (localX >= removedStart && localX < removedEnd) {
                return false;
            }
            
            // If in right segment, adjust x for next iteration
            if (localX >= rightStart) {
                x = localX - rightStart;
            } else {
                x = localX;
            }
            
            // Scale down to 3/8 of current scale (size of remaining segments)
            scale = scale * 3.0 / 8.0;
        }
        
        return true;
    }
    
    float computeFractal(vec2 c) {
        // Fat Cantor Set
        // Removes smaller middle portions (1/4 instead of 1/3)
        // This creates a "fatter" set with positive measure
        
        // Normalize coordinates to work with the Cantor set
        float x = (c.x + 2.0) / 4.0; // Map from [-2, 2] to [0, 1]
        float y = c.y;
        
        // Clamp x to [0, 1] range
        if (x < 0.0 || x > 1.0) {
            return 0.0;
        }
        
        // Determine which iteration level we're viewing based on y coordinate
        // Each level is stacked vertically
        float levelHeight = 0.15; // Height of each iteration band
        float levelSpacing = 0.05; // Gap between bands
        float totalLevelHeight = levelHeight + levelSpacing;
        
        // Center the Fat Cantor set vertically
        float startY = 1.5;
        
        // Determine which iteration we're in
        int maxIterations = int(uIterations);
        if (maxIterations > 15) maxIterations = 15; // Cap at 15 iterations
        
        float intensity = 0.0;
        bool inSegment = false;
        int segmentLevel = -1;
        
        // Check each iteration level
        for (int level = 0; level < 15; level++) {
            if (level >= maxIterations) break;
            
            float levelY = startY - float(level) * totalLevelHeight;
            
            // Check if we're in the vertical range for this level
            if (y >= levelY - levelHeight && y <= levelY) {
                // Check if x is in a Fat Cantor segment at this level
                if (isInFatCantor(x, level)) {
                    inSegment = true;
                    segmentLevel = level;
                    intensity = float(segmentLevel + 1);
                }
                break;
            }
        }
        
        if (inSegment) {
            // Vary intensity based on level for interesting coloring
            return intensity * (uIterations / 15.0);
        } else {
            // Background or removed regions
            return 0.0;
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
    juliaC: { x: 0, y: 0 }, // Not used for Fat Cantor set
  });
}

export const is2D = true;

/**
 * Configuration for Fat Cantor fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'cosmic',
  },
  initialPosition: {
    zoom: 1,
    offset: { x: -0.001, y: 0.102 },
  },
  interestingPoints: [
    { x: 0, y: 0.5, zoom: 1 }, // Full overview
    { x: 0, y: 0.3, zoom: 1.5 }, // Upper levels detail
    { x: 0, y: 0, zoom: 2 }, // Mid-level focus
    { x: 0.5, y: 0.5, zoom: 2 }, // Right side upper levels
    { x: -0.5, y: 0.5, zoom: 2 }, // Left side upper levels
    { x: 0.3, y: 0, zoom: 3 }, // Right side detail
    { x: -0.3, y: 0, zoom: 3 }, // Left side detail
    { x: 0, y: -0.3, zoom: 2 }, // Lower levels
    { x: 0, y: 0.7, zoom: 1.2 }, // Top view
    { x: 0, y: 0, zoom: 1 }, // Centered full view
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};
