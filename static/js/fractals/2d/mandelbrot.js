import { vertexShader, createFragmentShader, generatePaletteTexture } from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Optimized Mandelbrot with smooth coloring and early bailout
        vec2 z = vec2(0.0);
        float zx2 = 0.0;
        float zy2 = 0.0;
        
        // Unroll first 8 iterations for better performance
        // Iterations 0-7: manual unroll (common case optimization)
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 1.0 - nu;
        }
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 2.0 - nu;
        }
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 3.0 - nu;
        }
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 4.0 - nu;
        }
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 5.0 - nu;
        }
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 6.0 - nu;
        }
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 7.0 - nu;
        }
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 8.0 - nu;
        }
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
        
        // Continue with loop for remaining iterations
        for (int i = 8; i < 200; i++) {
            if (i >= int(uIterations)) break;
            
            // Use squared magnitude check (faster than dot product)
            zx2 = z.x * z.x;
            zy2 = z.y * z.y;
            if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
                // Smooth coloring using continuous escape
                // log_zn = log(|z|^2) / 2 = log(|z|)
                float log_zn = log(zx2 + zy2) * 0.5;
                // Normalized iteration count for smooth coloring
                // Optimized: use precomputed INV_LOG2 instead of division
                float nu = log(log_zn * INV_LOG2) * INV_LOG2;
                return float(i) + 1.0 - nu;
            }
            
            // Optimized complex multiplication: (a+bi)^2 = (a^2-b^2) + 2abi
            z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
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
      uJuliaC: [0, 0], // Not used for Mandelbrot
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
 * Configuration for Mandelbrot fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'classic',
  },
  initialPosition: {
    zoom: 1,
    offset: { x: 0, y: 0 },
  },
  interestingPoints: [
    { x: -0.75, y: 0.1, zoom: 50 }, // Seahorse valley
    { x: -0.5, y: 0.5, zoom: 100 }, // Top bulb
    { x: 0.0, y: 0.0, zoom: 1 }, // Center
    { x: -1.25, y: 0.0, zoom: 200 }, // Left side
    { x: -0.1592, y: 1.0317, zoom: 500 }, // Mini mandelbrot
    { x: -0.77568377, y: 0.13646737, zoom: 1000 }, // Deep zoom area
    { x: 0.285, y: 0.01, zoom: 300 }, // Right side detail
    { x: -0.8, y: 0.156, zoom: 800 }, // Elephant valley
    { x: -0.235125, y: 0.827215, zoom: 400 }, // Another interesting area
    { x: 0.286932, y: 0.008287, zoom: 250 }, // Right side detail
  ],
  fallbackPosition: {
    offset: { x: -0.75, y: 0.1 },
    zoom: 50,
  },
};
