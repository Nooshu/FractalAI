import { vertexShader, createFragmentShader, generatePaletteTexture } from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Lambda Julia set with smooth coloring
        // Formula: z_{n+1} = λ * z_n * (1 - z_n)
        // where λ = uJuliaC is the complex parameter
        // For z = x + iy: z * (1 - z) = (x - x^2 + y^2) + i(y - 2xy)
        vec2 z = c;
        float zx2 = 0.0;
        float zy2 = 0.0;
        
        // Unroll first few iterations for better performance
        // Iteration 0
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 0.0 + 1.0 - nu;
        }
        // Lambda formula: z * (1 - z) = (x - x^2 + y^2) + i(y - 2xy)
        float real_part = z.x - zx2 + zy2;
        float imag_part = z.y - 2.0 * z.x * z.y;
        // Multiply by λ (uJuliaC): λ * (real + i*imag) = λ_real*real - λ_imag*imag + i(λ_real*imag + λ_imag*real)
        z = vec2(
            uJuliaC.x * real_part - uJuliaC.y * imag_part,
            uJuliaC.x * imag_part + uJuliaC.y * real_part
        );
        
        // Iteration 1
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 1.0 + 1.0 - nu;
        }
        real_part = z.x - zx2 + zy2;
        imag_part = z.y - 2.0 * z.x * z.y;
        z = vec2(
            uJuliaC.x * real_part - uJuliaC.y * imag_part,
            uJuliaC.x * imag_part + uJuliaC.y * real_part
        );
        
        // Iteration 2
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 2.0 + 1.0 - nu;
        }
        real_part = z.x - zx2 + zy2;
        imag_part = z.y - 2.0 * z.x * z.y;
        z = vec2(
            uJuliaC.x * real_part - uJuliaC.y * imag_part,
            uJuliaC.x * imag_part + uJuliaC.y * real_part
        );
        
        // Continue with loop for remaining iterations
        for (int i = 3; i < 200; i++) {
            if (i >= int(uIterations)) break;
            
            // Calculate squared magnitudes
            zx2 = z.x * z.x;
            zy2 = z.y * z.y;
            
            // Check for escape
            if (zx2 + zy2 > 4.0) {
                // Smooth coloring using continuous escape
                float log_zn = log(zx2 + zy2) * 0.5;
                float nu = log(log_zn / log(2.0)) / log(2.0);
                return float(i) + 1.0 - nu;
            }
            
            // Lambda Julia formula: z_{n+1} = λ * z_n * (1 - z_n)
            // z * (1 - z) = (x - x^2 + y^2) + i(y - 2xy)
            real_part = z.x - zx2 + zy2;
            imag_part = z.y - 2.0 * z.x * z.y;
            // Multiply by λ (uJuliaC)
            z = vec2(
                uJuliaC.x * real_part - uJuliaC.y * imag_part,
                uJuliaC.x * imag_part + uJuliaC.y * real_part
            );
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
 * Configuration for Lambda Julia fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'cosmic',
  },
  initialPosition: {
    zoom: 1,
    offset: { x: 0.734, y: 0.24 },
  },
  interestingPoints: [],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};

