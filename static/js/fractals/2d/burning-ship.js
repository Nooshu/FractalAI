import { vertexShader, createFragmentShader, generatePaletteTexture } from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Burning Ship fractal with smooth coloring
        // Formula: z = (|Re(z)| + i|Im(z)|)^2 + c
        vec2 z = vec2(0.0);
        float zx2 = 0.0;
        float zy2 = 0.0;

        // Unroll first 8 iterations for better performance
        float abs_x, abs_y;

        // Iteration 0
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 1.0 - nu;
        }
        abs_x = abs(z.x);
        abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, 2.0 * abs_x * abs_y) + c;

        // Iteration 1
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 2.0 - nu;
        }
        abs_x = abs(z.x);
        abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, 2.0 * abs_x * abs_y) + c;

        // Iteration 2
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 3.0 - nu;
        }
        abs_x = abs(z.x);
        abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, 2.0 * abs_x * abs_y) + c;

        // Iteration 3
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 4.0 - nu;
        }
        abs_x = abs(z.x);
        abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, 2.0 * abs_x * abs_y) + c;

        // Iteration 4
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 5.0 - nu;
        }
        abs_x = abs(z.x);
        abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, 2.0 * abs_x * abs_y) + c;

        // Iteration 5
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 6.0 - nu;
        }
        abs_x = abs(z.x);
        abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, 2.0 * abs_x * abs_y) + c;

        // Iteration 6
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 7.0 - nu;
        }
        abs_x = abs(z.x);
        abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, 2.0 * abs_x * abs_y) + c;

        // Iteration 7
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn * INV_LOG2) * INV_LOG2;
            return 8.0 - nu;
        }
        abs_x = abs(z.x);
        abs_y = abs(z.y);
        z = vec2(abs_x * abs_x - abs_y * abs_y, 2.0 * abs_x * abs_y) + c;

        // Continue with loop for remaining iterations
        for (int i = 8; i < 200; i++) {
            if (i >= int(uIterations)) break;

            // Calculate squared magnitudes
            zx2 = z.x * z.x;
            zy2 = z.y * z.y;

            // Check for escape
            if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
                // Smooth coloring using continuous escape
                float log_zn = log(zx2 + zy2) * 0.5;
                // Optimized: use precomputed INV_LOG2 instead of division
                float nu = log(log_zn * INV_LOG2) * INV_LOG2;
                return float(i) + 1.0 - nu;
            }

            // Burning Ship formula: use absolute values before squaring
            // z = (|Re(z)| + i|Im(z)|)^2 + c
            abs_x = abs(z.x);
            abs_y = abs(z.y);
            z = vec2(abs_x * abs_x - abs_y * abs_y, 2.0 * abs_x * abs_y) + c;
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
      uJuliaC: [0, 0], // Not used for Burning Ship
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
 * Configuration for Burning Ship fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'midnight',
  },
  initialPosition: {
    zoom: 1.2,
    offset: { x: -0.2924, y: -0.2544 },
  },
  interestingPoints: [
    { x: -0.5, y: -0.6, zoom: 1.2 }, // Main ship view
    { x: -1.75, y: -0.03, zoom: 100 }, // Bow detail
    { x: -1.62, y: 0.0, zoom: 250 }, // Right antenna
    { x: -1.755, y: -0.028, zoom: 500 }, // Deep bow zoom
    { x: -1.7, y: 0.0, zoom: 80 }, // Side structures
    { x: -0.4, y: -0.6, zoom: 150 }, // Hull detail
    { x: -1.8, y: -0.0085, zoom: 300 }, // Fine bow structures
    { x: -1.65, y: 0.0, zoom: 50 }, // Middle antenna
    { x: -0.9, y: -0.3, zoom: 200 }, // Central structures
    { x: -1.72, y: -0.025, zoom: 400 }, // Intricate bow patterns
  ],
  fallbackPosition: {
    offset: { x: -0.5, y: -0.6 },
    zoom: 1.2,
  },
};
