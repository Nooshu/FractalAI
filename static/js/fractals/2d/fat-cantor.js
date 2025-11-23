import { vertexShader, createFragmentShader, generatePaletteTexture } from '../utils.js';

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

const fragmentShader = createFragmentShader(fractalFunction);

export function render(regl, params, canvas) {
  // Generate palette texture for the current color scheme
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  // Create or update the draw command
  const drawFractal = regl({
    vert: vertexShader,
    frag: fragmentShader,
    attributes: {
      position: [-1, -1, 1, -1, -1, 1, 1, 1], // Full-screen quad
    },
    uniforms: {
      uTime: 0,
      uIterations: params.iterations,
      uZoom: params.zoom,
      uOffset: [params.offset.x, params.offset.y],
      uResolution: [canvas.width, canvas.height],
      uJuliaC: [0, 0], // Not used for Fat Cantor set
      uPalette: paletteTexture,
      uXScale: params.xScale,
      uYScale: params.yScale,
    },
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    },
    count: 4,
    primitive: 'triangle strip',
  });

  return drawFractal;
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
  interestingPoints: [],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};

