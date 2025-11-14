import { vertexShader, createFragmentShader, generatePaletteTexture } from '../utils.js';

const fractalFunction = `
    // Helper function to check if a point is in the Smith-Volterra-Cantor set at a given level
    // At step n: remove 2^(n-1) intervals of length 1/(4^n) from the middle of each segment
    bool isInSmithVolterraCantor(float x, int level) {
        // Base case: level 0 means the entire [0, 1] segment
        if (level == 0) {
            return (x >= 0.0 && x <= 1.0);
        }
        
        // For Smith-Volterra-Cantor set:
        // Step 1: Remove middle 1/4 (from 3/8 to 5/8)
        // Step 2: From each remaining segment, remove middle 1/16
        // Step 3: From each remaining segment, remove middle 1/64
        // At step n: remove middle 1/(4^n) from each segment
        
        float currentX = x;
        float segmentSize = 1.0;
        
        for (int step = 1; step <= 15; step++) {
            if (step > level) break;
            
            // Length to remove at this step from each segment
            float removeLength = 1.0 / pow(4.0, float(step));
            
            // Find which segment we're in (0 to 2^(step-1) - 1)
            float segmentsAtThisLevel = pow(2.0, float(step - 1));
            float segmentIndex = floor(currentX / segmentSize);
            
            // Normalize to position within current segment [0, segmentSize]
            float posInSegment = mod(currentX, segmentSize);
            
            // Calculate the bounds of the removed region in this segment
            // Remove from center of segment
            float removeStart = (segmentSize - removeLength) / 2.0;
            float removeEnd = removeStart + removeLength;
            
            // Check if we're in the removed region
            if (posInSegment >= removeStart && posInSegment < removeEnd) {
                return false;
            }
            
            // Adjust position for next iteration
            // If we're in the right half, shift left by the removed amount
            if (posInSegment >= removeEnd) {
                currentX = segmentIndex * segmentSize + (posInSegment - removeLength);
            } else {
                currentX = segmentIndex * segmentSize + posInSegment;
            }
            
            // Update segment size for next level (each segment splits into 2)
            segmentSize = (segmentSize - removeLength) / 2.0;
        }
        
        return true;
    }
    
    float computeFractal(vec2 c) {
        // Smith-Volterra-Cantor Set
        // A nowhere dense set with positive measure (measure = 1/2)
        // Constructed by removing middle portions that decrease in size
        
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
        
        // Center the Smith-Volterra-Cantor set vertically
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
                // Check if x is in a Smith-Volterra-Cantor segment at this level
                if (isInSmithVolterraCantor(x, level)) {
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
      uJuliaC: [0, 0], // Not used for Smith-Volterra-Cantor set
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

