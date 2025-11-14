import { vertexShader, createFragmentShader, generatePaletteTexture } from '../utils.js';

const fractalFunction = `
    // Pseudo-random function for GLSL
    float random(float x, float seed) {
        return fract(sin(x * 12.9898 + seed * 78.233) * 43758.5453);
    }
    
    // Helper function to check if a point is in the Randomised Cantor set at a given level
    // Each level uses a random removal ratio between 0.2 and 0.6
    bool isInRandomCantor(float x, int level) {
        // Base case: level 0 means the entire [0, 1] segment
        if (level == 0) {
            return (x >= 0.0 && x <= 1.0);
        }
        
        float currentX = x;
        float segmentSize = 1.0;
        float segmentIndex = 0.0;
        
        for (int step = 1; step <= 15; step++) {
            if (step > level) break;
            
            // Generate a deterministic but random-looking removal ratio for this level
            // Using the step number as seed for consistency
            float seed = float(step) * 123.456;
            float randomValue = random(float(step), seed);
            
            // Removal ratio between 0.2 (remove 20%) and 0.6 (remove 60%)
            float removalRatio = 0.2 + randomValue * 0.4;
            
            // Also randomize the position of the removed region
            // It can be anywhere from 20% to 80% along the segment
            float positionRandom = random(float(step) * 1.5, seed * 1.3);
            float removePosition = 0.2 + positionRandom * 0.6;
            
            // Calculate removal bounds
            float removeLength = segmentSize * removalRatio;
            float removeStart = segmentSize * removePosition - removeLength / 2.0;
            float removeEnd = removeStart + removeLength;
            
            // Clamp to segment bounds
            removeStart = max(0.0, removeStart);
            removeEnd = min(segmentSize, removeEnd);
            
            // Find which segment we're in at this level
            float segmentsAtThisLevel = pow(2.0, float(step - 1));
            float currentSegmentIndex = floor(currentX / segmentSize);
            
            // Position within current segment
            float posInSegment = mod(currentX, segmentSize);
            
            // Check if we're in the removed region
            if (posInSegment >= removeStart && posInSegment < removeEnd) {
                return false;
            }
            
            // Adjust for next iteration
            // Remaining segment is split into left and right parts
            float leftSegmentSize = removeStart;
            float rightSegmentSize = segmentSize - removeEnd;
            
            if (posInSegment < removeStart) {
                // In left segment
                currentX = currentSegmentIndex * segmentSize + posInSegment;
                segmentSize = leftSegmentSize;
            } else {
                // In right segment
                currentX = currentSegmentIndex * segmentSize + (posInSegment - removeEnd);
                segmentSize = rightSegmentSize;
            }
            
            // Prevent infinite loops with very small segments
            if (segmentSize < 0.0001) {
                return true;
            }
        }
        
        return true;
    }
    
    float computeFractal(vec2 c) {
        // Randomised Cantor Set
        // Uses random removal ratios at each iteration level
        // Creates organic, irregular patterns
        
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
        
        // Center the Randomised Cantor set vertically
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
                // Check if x is in a Randomised Cantor segment at this level
                if (isInRandomCantor(x, level)) {
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
      uJuliaC: [0, 0], // Not used for Randomised Cantor set
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

