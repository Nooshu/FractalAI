import {
  createFragmentShader,
  createStandardDrawCommand,
} from '../utils.js';

const fractalFunction = `
    // IFS Tree Attractor
    // Iterated Function System creating tree-like branching patterns
    // Uses multiple affine transformations with rotation
    
    float computeFractal(vec2 c) {
        // Scale coordinates
        float scale = 2.0 + uYScale * 2.0; // 2.0 to 4.0
        vec2 p = vec2(c.x * scale, c.y * scale - 1.0); // Shift down
        
        // Number of iterations
        int maxIter = int(clamp(uIterations / 15.0, 20.0, 80.0));
        
        // Initialize - start from base of tree
        vec2 point = vec2(0.0, 0.0);
        float density = 0.0;
        
        // IFS transformations for tree pattern
        // Transformation 1: Trunk (continues upward)
        mat2 rot1 = mat2(0.0, 0.0, 0.0, 0.5);
        vec2 offset1 = vec2(0.0, 0.5);
        
        // Transformation 2: Left branch
        float angle2 = 0.4 + uXScale * 0.3; // 0.4 to 0.7 radians
        mat2 rot2 = mat2(cos(angle2), -sin(angle2), sin(angle2), cos(angle2));
        rot2 = rot2 * 0.6; // Scale
        vec2 offset2 = vec2(0.0, 0.5);
        
        // Transformation 3: Right branch
        float angle3 = -0.4 - uXScale * 0.3; // -0.4 to -0.7 radians
        mat2 rot3 = mat2(cos(angle3), -sin(angle3), sin(angle3), cos(angle3));
        rot3 = rot3 * 0.6; // Scale
        vec2 offset3 = vec2(0.0, 0.5);
        
        // Iterate forward
        for (int i = 0; i < 80; i++) {
            if (i >= maxIter) break;
            
            // Choose transformation randomly
            float choice = fract(sin(float(i) * 12.9898 + dot(point, vec2(78.233, 12.345))) * 43758.5453);
            
            vec2 transformed;
            if (choice < 0.33) {
                // Transformation 1 (33% probability) - trunk
                transformed = rot1 * point + offset1;
            } else if (choice < 0.66) {
                // Transformation 2 (33% probability) - left branch
                transformed = rot2 * point + offset2;
            } else {
                // Transformation 3 (34% probability) - right branch
                transformed = rot3 * point + offset3;
            }
            
            point = transformed;
            
            // Check if point is near the query point p
            vec2 diff = point - p;
            float dist2 = dot(diff, diff);
            
            // Accumulate density
            density += 1.0 / (1.0 + dist2 * 8.0);
        }
        
        // Normalize and return
        float result = density / float(maxIter);
        result = pow(result, 0.4); // Gamma correction
        return result * uIterations * 3.5;
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
    juliaC: { x: 0, y: 0 }, // Not used for IFS tree
  });
}

export const is2D = true;

/**
 * Configuration for IFS Tree Attractor
 */
export const config = {
  initialSettings: {
    colorScheme: 'emerald',
  },
  initialPosition: {
    zoom: 2.5,
    offset: { x: 0, y: 0.3 },
  },
  interestingPoints: [
    { x: 0, y: 0.3, zoom: 2 }, // Full tree
    { x: 0, y: 0.5, zoom: 4 }, // Upper branches
    { x: -0.1, y: 0.4, zoom: 5 }, // Left branch detail
    { x: 0.1, y: 0.4, zoom: 5 }, // Right branch detail
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0.3 },
    zoom: 2.5,
  },
};

