import { vertexShader, createFragmentShader, generatePaletteTexture } from '../utils.js';

// Sierpinski triangle using barycentric coordinate method
const fractalFunction = `
    // Define the three vertices of the base triangle
    vec2 v0 = vec2(0.0, 0.866);      // Top vertex
    vec2 v1 = vec2(-1.0, -0.866);   // Bottom left
    vec2 v2 = vec2(1.0, -0.866);    // Bottom right
    
    // Compute barycentric coordinates
    vec3 barycentric(vec2 p, vec2 a, vec2 b, vec2 c) {
        vec2 v0 = c - a;
        vec2 v1 = b - a;
        vec2 v2 = p - a;
        
        float dot00 = dot(v0, v0);
        float dot01 = dot(v0, v1);
        float dot02 = dot(v0, v2);
        float dot11 = dot(v1, v1);
        float dot12 = dot(v1, v2);
        
        float invDenom = 1.0 / (dot00 * dot11 - dot01 * dot01);
        float u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        float v = (dot00 * dot12 - dot01 * dot02) * invDenom;
        
        return vec3(1.0 - u - v, v, u);
    }
    
    float computeFractal(vec2 c) {
        vec2 p = c;
        
        // Optimized Sierpinski with early bailout
        // Pre-compute constant for center check
        const float centerThreshold = 0.333;
        
        // Iteratively subdivide using barycentric coordinates
        for (int i = 0; i < 200; i++) {
            if (i >= int(uIterations)) break;
            
            // Get barycentric coordinates
            vec3 bary = barycentric(p, v0, v1, v2);
            
            // Early bailout: check if point is outside the triangle
            if (bary.x < 0.0 || bary.y < 0.0 || bary.z < 0.0) {
                return float(i);
            }
            
            // Early bailout: if in center triangle, exclude it
            if (bary.x > centerThreshold && bary.y > centerThreshold && bary.z > centerThreshold) {
                return float(i);
            }
            
            // Map to the corresponding sub-triangle
            // Optimized: determine dominant vertex without extra max() call
            if (bary.x >= bary.y && bary.x >= bary.z) {
                // Closest to v0 - map to top sub-triangle
                p = (p - v0) * 2.0 + v0;
            } else if (bary.y >= bary.z) {
                // Closest to v1 - map to bottom-left sub-triangle
                p = (p - v1) * 2.0 + v1;
            } else {
                // Closest to v2 - map to bottom-right sub-triangle
                p = (p - v2) * 2.0 + v2;
            }
        }
        
        // If we completed all iterations, the point is in the set
        return uIterations;
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
      uJuliaC: [0, 0],
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
