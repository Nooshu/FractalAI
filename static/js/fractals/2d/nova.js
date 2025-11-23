import { vertexShader, createFragmentShader, generatePaletteTexture } from '../utils.js';

const fractalFunction = `
    // Helper function for complex division: a / b
    vec2 complexDivide(vec2 a, vec2 b) {
        float denom = b.x * b.x + b.y * b.y;
        if (denom < 0.0001) {
            // Avoid division by zero
            return vec2(0.0, 0.0);
        }
        return vec2(
            (a.x * b.x + a.y * b.y) / denom,
            (a.y * b.x - a.x * b.y) / denom
        );
    }
    
    // Helper function to compute z^3
    vec2 complexCube(vec2 z) {
        float zx2 = z.x * z.x;
        float zy2 = z.y * z.y;
        float zx3 = zx2 * z.x;
        float zy3 = zy2 * z.y;
        // z^3 = (x+iy)^3 = x^3 - 3xy^2 + i(3x^2y - y^3)
        return vec2(zx3 - 3.0 * z.x * zy2, 3.0 * zx2 * z.y - zy3);
    }
    
    // Helper function to compute z^2
    vec2 complexSquare(vec2 z) {
        return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
    }
    
    // Helper function to compute z^2 * 3 (for derivative)
    vec2 complexSquareTimes3(vec2 z) {
        vec2 z2 = complexSquare(z);
        return vec2(z2.x * 3.0, z2.y * 3.0);
    }
    
    // Distance to a root
    float distanceToRoot(vec2 z, vec2 root) {
        vec2 diff = z - root;
        return length(diff);
    }
    
    // Find which root z is closest to
    // Roots of z^3 - 1 = 0 are:
    // root1 = 1.0 + 0.0i
    // root2 = -0.5 + 0.8660254i
    // root3 = -0.5 - 0.8660254i
    float findClosestRoot(vec2 z) {
        vec2 root1 = vec2(1.0, 0.0);
        vec2 root2 = vec2(-0.5, 0.8660254);
        vec2 root3 = vec2(-0.5, -0.8660254);
        
        float dist1 = distanceToRoot(z, root1);
        float dist2 = distanceToRoot(z, root2);
        float dist3 = distanceToRoot(z, root3);
        
        if (dist1 < dist2 && dist1 < dist3) {
            return 1.0; // Root 1
        } else if (dist2 < dist3) {
            return 2.0; // Root 2
        } else {
            return 3.0; // Root 3
        }
    }
    
    float computeFractal(vec2 c) {
        // Nova fractal for z^3 - 1 = 0
        // Nova method: z_new = z - alpha * f(z) / f'(z)
        // This is a relaxed Newton's method where alpha is a relaxation parameter
        // f(z) = z^3 - 1
        // f'(z) = 3z^2
        // z_new = z - alpha * (z^3 - 1) / (3z^2)
        
        // Alpha (relaxation parameter) controlled by uXScale
        // Map uXScale (0-2) to alpha (0.1-1.0) for interesting effects
        // Default uXScale = 1.0 maps to alpha = 0.55 (typical Nova value)
        // This ensures Nova is different from Newton even when xScale = 1.0
        float alpha = 0.1 + clamp(uXScale, 0.0, 2.0) * 0.45;
        
        vec2 z = c;
        float convergenceThreshold = 0.0001;
        
        // Track which root we converge to
        float rootIndex = 0.0;
        
        for (int i = 0; i < 200; i++) {
            if (i >= int(uIterations)) break;
            
            // Check if we've converged to a root
            vec2 z3 = complexCube(z);
            vec2 fz = z3 - vec2(1.0, 0.0); // z^3 - 1
            float fzMag = length(fz);
            
            if (fzMag < convergenceThreshold) {
                // Converged! Find which root
                rootIndex = findClosestRoot(z);
                // Return iteration count with root offset for coloring
                return float(i) + rootIndex * 0.33;
            }
            
            // Compute derivative: f'(z) = 3z^2
            vec2 fPrime = complexSquareTimes3(z);
            float fPrimeMag = length(fPrime);
            
            // Avoid division by zero
            if (fPrimeMag < 0.0001) {
                // Derivative too small, can't continue
                return uIterations;
            }
            
            // Nova step: z_new = z - alpha * f(z) / f'(z)
            vec2 delta = complexDivide(fz, fPrime);
            z = z - vec2(delta.x * alpha, delta.y * alpha);
            
            // Check for divergence (moved too far)
            if (length(z) > 100.0) {
                return uIterations;
            }
        }
        
        // Didn't converge within iterations
        // Find closest root for coloring
        rootIndex = findClosestRoot(z);
        return uIterations + rootIndex * 0.33;
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
      uJuliaC: [params.juliaC.x, params.juliaC.y],
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
 * Configuration for Nova fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'classic',
  },
  initialPosition: {
    zoom: 1,
    offset: { x: 0, y: 0 },
  },
  interestingPoints: [],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};

