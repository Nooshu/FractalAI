import { vertexShader, createFragmentShader, generatePaletteTexture } from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Phoenix Mandelbrot - variant that uses previous z value
        // Formula: z_new = z^2 + c + p * z_prev
        // Where p is a parameter (Phoenix parameter)
        // This creates interesting "phoenix" patterns
        
        // Phoenix parameter p (controlled by xScale and yScale)
        // xScale controls real part, yScale controls imaginary part
        vec2 p = vec2((uXScale - 0.5) * 2.0, (uYScale - 0.5) * 2.0);
        // Clamp to reasonable range
        p = clamp(p, vec2(-1.0, -1.0), vec2(1.0, 1.0));
        
        vec2 z = vec2(0.0);
        vec2 z_prev = vec2(0.0);
        float zx2 = 0.0;
        float zy2 = 0.0;
        
        // Unroll first few iterations for better performance
        // Iteration 0: z = 0, z_prev = 0, so z_new = 0^2 + c + p*0 = c
        z_prev = z;
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c + p * z_prev;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 0.0 + 1.0 - nu;
        }
        
        // Iteration 1
        z_prev = z;
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c + p * z_prev;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 1.0 + 1.0 - nu;
        }
        
        // Iteration 2
        z_prev = z;
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c + p * z_prev;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 2.0 + 1.0 - nu;
        }
        
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
            
            // Phoenix Mandelbrot formula: z_new = z^2 + c + p * z_prev
            z_prev = z;
            z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c + p * z_prev;
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
      uJuliaC: [0, 0], // Not used for Phoenix Mandelbrot
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

