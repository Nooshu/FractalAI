import { vertexShader, createFragmentShader, createStandardDrawCommand } from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Celtic Mandelbrot fractal with smooth coloring
        // Formula: z = abs(Re(z^2)) + i*Im(z^2) + c
        // Key difference from Burning Ship: only real part of z^2 is absolute-valued
        vec2 z = vec2(0.0);
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
        // Compute z^2 normally, then take abs of real part only
        float z2_real = zx2 - zy2;
        float z2_imag = 2.0 * z.x * z.y;
        z = vec2(abs(z2_real), z2_imag) + c;
        
        // Iteration 1
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 1.0 + 1.0 - nu;
        }
        z2_real = zx2 - zy2;
        z2_imag = 2.0 * z.x * z.y;
        z = vec2(abs(z2_real), z2_imag) + c;
        
        // Iteration 2
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 2.0 + 1.0 - nu;
        }
        z2_real = zx2 - zy2;
        z2_imag = 2.0 * z.x * z.y;
        z = vec2(abs(z2_real), z2_imag) + c;
        
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
            
            // Celtic Mandelbrot formula: compute z^2 normally, then take abs of real part only
            // z = abs(Re(z^2)) + i*Im(z^2) + c
            z2_real = zx2 - zy2;
            z2_imag = 2.0 * z.x * z.y;
            z = vec2(abs(z2_real), z2_imag) + c;
        }
        
        return uIterations;
    }
`;

const fragmentShader = createFragmentShader(fractalFunction);

export function render(regl, params, canvas) {
  // Use the optimized standard draw command with dynamic uniforms
  return createStandardDrawCommand(regl, params, canvas, fragmentShader, {
    fractalType: 'celtic-mandelbrot',
    juliaC: [0, 0], // Not used for Celtic Mandelbrot
  });
}

export const is2D = true;

