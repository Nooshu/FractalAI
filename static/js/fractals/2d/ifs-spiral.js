import {
  createFragmentShader,
  createStandardDrawCommand,
} from '../utils.js';

const fractalFunction = `
    // IFS Spiral Attractor
    // Iterated Function System creating spiral patterns
    // Uses multiple affine transformations with rotation and scaling
    
    float computeFractal(vec2 c) {
        // Scale coordinates
        float scale = 2.0 + uYScale * 2.0; // 2.0 to 4.0
        vec2 p = c * scale;
        
        // Number of iterations
        int maxIter = int(clamp(uIterations / 15.0, 20.0, 80.0));
        
        // Initialize - start from origin and iterate forward
        vec2 point = vec2(0.0, 0.0);
        float density = 0.0;
        
        // IFS transformations for spiral pattern
        // Transformation 1: Rotate and scale (creates spiral)
        float angle1 = 0.2 + uXScale * 0.3; // 0.2 to 0.5 radians
        float scale1 = 0.9;
        mat2 rot1 = mat2(cos(angle1), -sin(angle1), sin(angle1), cos(angle1));
        vec2 offset1 = vec2(0.1, 0.0);
        
        // Transformation 2: Smaller spiral branch
        float angle2 = -0.15;
        float scale2 = 0.7;
        mat2 rot2 = mat2(cos(angle2), -sin(angle2), sin(angle2), cos(angle2));
        vec2 offset2 = vec2(0.3, 0.2);
        
        // Transformation 3: Outer branch
        float angle3 = 0.3;
        float scale3 = 0.6;
        mat2 rot3 = mat2(cos(angle3), -sin(angle3), sin(angle3), cos(angle3));
        vec2 offset3 = vec2(-0.2, 0.4);
        
        // Iterate forward from origin
        for (int i = 0; i < 80; i++) {
            if (i >= maxIter) break;
            
            // Choose transformation randomly
            float choice = fract(sin(float(i) * 12.9898 + dot(point, vec2(78.233, 12.345))) * 43758.5453);
            
            vec2 transformed;
            if (choice < 0.5) {
                // Transformation 1 (50% probability)
                transformed = rot1 * point * scale1 + offset1;
            } else if (choice < 0.8) {
                // Transformation 2 (30% probability)
                transformed = rot2 * point * scale2 + offset2;
            } else {
                // Transformation 3 (20% probability)
                transformed = rot3 * point * scale3 + offset3;
            }
            
            point = transformed;
            
            // Check if point is near the query point p
            vec2 diff = point - p;
            float dist2 = dot(diff, diff);
            
            // Accumulate density based on distance
            density += 1.0 / (1.0 + dist2 * 8.0);
        }
        
        // Normalize and return
        float result = density / float(maxIter);
        result = pow(result, 0.4); // Gamma correction
        return result * uIterations * 3.0;
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
    juliaC: { x: 0, y: 0 }, // Not used for IFS spiral
  });
}

export const is2D = true;

/**
 * Configuration for IFS Spiral Attractor
 */
export const config = {
  initialSettings: {
    colorScheme: 'neon',
  },
  initialPosition: {
    zoom: 2.0,
    offset: { x: 0, y: 0 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1 }, // Full overview
    { x: 0, y: 0, zoom: 2 }, // Center
    { x: 0.2, y: 0.2, zoom: 3 }, // Spiral detail
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 2.0,
  },
};

