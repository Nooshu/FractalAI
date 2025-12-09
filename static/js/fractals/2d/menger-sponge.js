import {
  createFragmentShader,
  createStandardDrawCommand
} from '../utils.js';

const fractalFunction = `
    // Menger Sponge (2D Projection)
    // A 3D fractal that is recursively subdivided into 27 smaller cubes,
    // with the center cube and 6 face cubes removed
    // We project it to 2D by checking if a ray from the camera intersects the 3D structure
    
    float computeFractal(vec2 c) {
        // Map screen coordinates to 3D space
        // We'll use an orthographic projection looking at the sponge
        vec3 rayOrigin = vec3(c.x * 3.0, c.y * 3.0, 5.0); // Camera position
        vec3 rayDir = vec3(0.0, 0.0, -1.0); // Looking down the z-axis
        
        // Number of iterations
        int iterations = int(clamp(uIterations / 20.0, 1.0, 5.0));
        
        // Check if ray intersects the Menger sponge
        // Use ray marching or iterative subdivision
        
        // Start with a bounding box check
        vec3 minBox = vec3(-1.5, -1.5, -1.5);
        vec3 maxBox = vec3(1.5, 1.5, 1.5);
        
        // Ray-box intersection
        vec3 invDir = 1.0 / rayDir;
        vec3 t1 = (minBox - rayOrigin) * invDir;
        vec3 t2 = (maxBox - rayOrigin) * invDir;
        vec3 tMin = min(t1, t2);
        vec3 tMax = max(t1, t2);
        float tNear = max(max(tMin.x, tMin.y), tMin.z);
        float tFar = min(min(tMax.x, tMax.y), tMax.z);
        
        if (tFar < tNear || tFar < 0.0) {
            return 0.0; // No intersection
        }
        
        // Ray marching through the Menger sponge
        // Use for loop instead of while for WebGL1 compatibility
        float t = tNear;
        float stepSize = 0.01;
        float maxDist = tFar - tNear;
        int maxSteps = 500; // Maximum ray marching steps
        
        for (int step = 0; step < 500; step++) {
            if (step >= maxSteps) break;
            if (t >= tFar) break;
            
            vec3 pos = rayOrigin + rayDir * t;
            
            // Check if point is inside the Menger sponge
            bool inside = true;
            vec3 p = pos;
            float scale = 1.0;
            
            for (int i = 0; i < 5; i++) {
                if (i >= iterations) break;
                
                // Normalize to unit cube
                p = mod(p * scale + 1.5, 3.0) - 1.5;
                scale *= 3.0;
                
                // Check if in center cube or face cubes (these are removed)
                // Center cube: all coordinates in [-0.5, 0.5]
                if (abs(p.x) < 0.5 && abs(p.y) < 0.5 && abs(p.z) < 0.5) {
                    inside = false;
                    break;
                }
                
                // Face cubes: one coordinate in [-0.5, 0.5], others outside
                if (abs(p.x) < 0.5 && abs(p.y) > 0.5 && abs(p.z) > 0.5) {
                    inside = false;
                    break;
                }
                if (abs(p.y) < 0.5 && abs(p.x) > 0.5 && abs(p.z) > 0.5) {
                    inside = false;
                    break;
                }
                if (abs(p.z) < 0.5 && abs(p.x) > 0.5 && abs(p.y) > 0.5) {
                    inside = false;
                    break;
                }
            }
            
            if (inside) {
                // Hit the sponge - return depth for coloring
                float traveled = t - tNear;
                float depth = float(iterations) + (1.0 - traveled / maxDist);
                return depth * uIterations * 0.1;
            }
            
            t += stepSize;
        }
        
        return 0.0; // No intersection
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
    juliaC: { x: 0, y: 0 }, // Not used for Menger sponge
  });
}

export const is2D = true;

/**
 * Configuration for Menger Sponge fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'emerald'
},
  initialPosition: {
    zoom: 19.16,
    offset: { x: -0.6697, y: 0.169 }
  },
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1
}
};

