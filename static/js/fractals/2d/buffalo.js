import { vertexShader, createFragmentShader, generatePaletteTexture } from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Buffalo fractal with smooth coloring
        // Formula: z = (|Re(z)| - i|Im(z)|)^2 + c
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
        // Apply absolute value to real, negate imaginary after absolute value
        float abs_x = abs(z.x);
        float abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, -2.0 * abs_x * abs_y) + c;
        
        // Iteration 1
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 1.0 + 1.0 - nu;
        }
        abs_x = abs(z.x);
        abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, -2.0 * abs_x * abs_y) + c;
        
        // Iteration 2
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 2.0 + 1.0 - nu;
        }
        abs_x = abs(z.x);
        abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, -2.0 * abs_x * abs_y) + c;
        
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
            
            // Buffalo formula: z = (|Re(z)| - i|Im(z)|)^2 + c
            // Note the negative sign for the imaginary component
            float abs_x = abs(z.x);
            float abs_y = abs(z.y);
            z = vec2(abs_x * abs_x - abs_y * abs_y, -2.0 * abs_x * abs_y) + c;
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
      uJuliaC: [0, 0], // Not used for Buffalo
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
 * Configuration for Buffalo fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'coral',
  },
  initialPosition: {
    zoom: 2,
    offset: { x: -0.5473, y: 0.5336 },
  },
  interestingPoints: [
    { x: -0.5, y: 0.6, zoom: 1.2 }, // Main buffalo view (flipped ship)
    { x: -1.75, y: 0.03, zoom: 100 }, // Bow detail (flipped)
    { x: -1.62, y: 0.0, zoom: 250 }, // Right antenna
    { x: -1.755, y: 0.028, zoom: 500 }, // Deep bow zoom (flipped)
    { x: -1.7, y: 0.0, zoom: 80 }, // Side structures
    { x: -0.4, y: 0.6, zoom: 150 }, // Hull detail (flipped)
    { x: -1.8, y: 0.0085, zoom: 300 }, // Fine bow structures (flipped)
    { x: -1.65, y: 0.0, zoom: 50 }, // Middle antenna
    { x: -0.9, y: 0.3, zoom: 200 }, // Central structures (flipped)
    { x: -1.72, y: 0.025, zoom: 400 }, // Intricate bow patterns (flipped)
  ],
  fallbackPosition: {
    offset: { x: -0.5, y: 0.6 },
    zoom: 1.2,
  },
};
