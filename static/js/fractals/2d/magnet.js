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
    
    // Helper function for complex multiplication: a * b
    vec2 complexMultiply(vec2 a, vec2 b) {
        return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
    }
    
    // Helper function for complex addition: a + b
    vec2 complexAdd(vec2 a, vec2 b) {
        return vec2(a.x + b.x, a.y + b.y);
    }
    
    // Helper function for complex subtraction: a - b
    vec2 complexSubtract(vec2 a, vec2 b) {
        return vec2(a.x - b.x, a.y - b.y);
    }
    
    // Helper function to compute z^2
    vec2 complexSquare(vec2 z) {
        return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
    }
    
    float computeFractal(vec2 c) {
        // Magnet fractal - iterated rational function
        // Formula: z_new = (z^2 + (a-1)z) / (az + 1)
        // Where 'a' is a complex parameter (controlled by uJuliaC)
        // This creates "magnetic" patterns with interesting basins of attraction
        
        vec2 a = uJuliaC; // Parameter 'a' from Julia C controls
        vec2 one = vec2(1.0, 0.0);
        vec2 a_minus_one = complexSubtract(a, one); // (a - 1)
        
        vec2 z = c;
        vec2 z_prev = z;
        float zx2 = 0.0;
        float zy2 = 0.0;
        float convergenceThreshold = 0.0001;
        float escapeRadius = 10.0;
        
        // Unroll first few iterations for better performance
        // Iteration 0
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > escapeRadius) {
            // Escaped - use smooth coloring
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 0.0 + 1.0 - nu;
        }
        // Magnet formula: z_new = (z^2 + (a-1)z) / (az + 1)
        z_prev = z;
        vec2 z2 = complexSquare(z);
        vec2 numerator = complexAdd(z2, complexMultiply(a_minus_one, z));
        vec2 denominator = complexAdd(complexMultiply(a, z), one);
        z = complexDivide(numerator, denominator);
        
        // Check for convergence to fixed point
        float change = length(z - z_prev);
        if (change < convergenceThreshold) {
            return 0.0;
        }
        
        // Iteration 1
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > escapeRadius) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 1.0 + 1.0 - nu;
        }
        z_prev = z;
        z2 = complexSquare(z);
        numerator = complexAdd(z2, complexMultiply(a_minus_one, z));
        denominator = complexAdd(complexMultiply(a, z), one);
        z = complexDivide(numerator, denominator);
        
        change = length(z - z_prev);
        if (change < convergenceThreshold) {
            return 1.0;
        }
        
        // Iteration 2
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > escapeRadius) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 2.0 + 1.0 - nu;
        }
        z_prev = z;
        z2 = complexSquare(z);
        numerator = complexAdd(z2, complexMultiply(a_minus_one, z));
        denominator = complexAdd(complexMultiply(a, z), one);
        z = complexDivide(numerator, denominator);
        
        change = length(z - z_prev);
        if (change < convergenceThreshold) {
            return 2.0;
        }
        
        // Continue with loop for remaining iterations
        for (int i = 3; i < 200; i++) {
            if (i >= int(uIterations)) break;
            
            // Calculate squared magnitudes
            zx2 = z.x * z.x;
            zy2 = z.y * z.y;
            
            // Check for escape (reduced escape radius for better visibility)
            if (zx2 + zy2 > escapeRadius) {
                // Smooth coloring using continuous escape
                float log_zn = log(zx2 + zy2) * 0.5;
                float nu = log(log_zn / log(2.0)) / log(2.0);
                return float(i) + 1.0 - nu;
            }
            
            // Magnet formula: z_new = (z^2 + (a-1)z) / (az + 1)
            z_prev = z;
            z2 = complexSquare(z);
            numerator = complexAdd(z2, complexMultiply(a_minus_one, z));
            denominator = complexAdd(complexMultiply(a, z), one);
            z = complexDivide(numerator, denominator);
            
            // Check for convergence to fixed point
            change = length(z - z_prev);
            if (change < convergenceThreshold) {
                return float(i);
            }
            
            // Check for numerical instability (very large values)
            if (abs(z.x) > 1000.0 || abs(z.y) > 1000.0) {
                return float(i);
            }
        }
        
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
 * Configuration for Magnet fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow5',
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

