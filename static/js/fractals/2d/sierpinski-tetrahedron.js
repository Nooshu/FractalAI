import {
  createFragmentShader,
  createStandardDrawCommand
} from '../utils.js';

const fractalFunction = `
    // Sierpinski Tetrahedron (2D Projection)
    // We use a 2D slice through the 3D fractal for better visualization
    // This shows the fractal structure more clearly than full 3D ray marching
    
    float computeFractal(vec2 c) {
        // Number of iterations
        int iterations = int(clamp(uIterations / 20.0, 1.0, 6.0));
        
        // Treat c as a 2D slice through the tetrahedron
        // Use iterative subdivision similar to Sierpinski triangle but in 3D space
        vec3 p = vec3(c.x, c.y, 0.0); // 2D slice at z=0
        
        // Scale and center
        p = p * 1.5;
        
        float scale = 1.0;
        bool inSet = true;
        float depth = 0.0;
        
        // Iterative subdivision
        for (int i = 0; i < 6; i++) {
            if (i >= iterations) break;
            
            // Scale up
            p = p * scale;
            scale *= 2.0;
            
            // Map to local space [-1, 1]^3 using modulo
            p = mod(p + 1.0, 2.0) - 1.0;
            
            // Check if in removed center region
            // For Sierpinski tetrahedron, the center inverted tetrahedron is removed
            float dist = length(p);
            
            // The removed center is roughly a sphere/region at origin
            if (dist < 0.45) {
                // More sophisticated check for removed region
                vec3 absP = abs(p);
                float maxCoord = max(max(absP.x, absP.y), absP.z);
                float minCoord = min(min(absP.x, absP.y), absP.z);
                
                // Check if coordinates are all similar (near center)
                float coordSpread = maxCoord - minCoord;
                
                // The removed region is where all coordinates are similar and small
                if (maxCoord < 0.35 && coordSpread < 0.25) {
                    inSet = false;
                    break;
                }
            }
            
            depth += 1.0;
        }
        
        if (!inSet || depth == 0.0) {
            return 0.0;
        }
        
        // Return value for coloring - create interesting patterns
        float distFromOrigin = length(c);
        float angle = atan(c.y, c.x);
        
        // Combine depth, distance, and angle for varied coloring
        float result = depth * 15.0 + distFromOrigin * 10.0 + sin(angle * 3.0) * 5.0;
        
        // Ensure result is less than uIterations for visible coloring
        return min(result, uIterations * 0.9);
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
    juliaC: { x: 0, y: 0 }, // Not used for Sierpinski tetrahedron
  });
}

export const is2D = true;

/**
 * Configuration for Sierpinski Tetrahedron fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow-pastel'
},
  initialPosition: {
    zoom: 2.0,
    offset: { x: 0, y: 0 }
  },
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 2.0
}
};
