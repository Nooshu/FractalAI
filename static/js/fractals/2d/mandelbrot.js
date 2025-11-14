import { vertexShader, createFragmentShader, getColorSchemeIndex } from '../utils.js';

const fractalFunction = `
    int computeFractal(vec2 c) {
        // Optimized Mandelbrot with early bailout and better precision
        vec2 z = vec2(0.0);
        float zx2 = 0.0;
        float zy2 = 0.0;
        
        // Unroll first few iterations for better performance
        // Iteration 0-2: manual unroll
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) return 0;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) return 1;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
        
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) return 2;
        z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
        
        // Continue with loop for remaining iterations
        for (int i = 3; i < 200; i++) {
            if (i >= int(uIterations)) break;
            
            // Use squared magnitude check (faster than dot product)
            zx2 = z.x * z.x;
            zy2 = z.y * z.y;
            if (zx2 + zy2 > 4.0) return i;
            
            // Optimized complex multiplication: (a+bi)^2 = (a^2-b^2) + 2abi
            z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + c;
        }
        return int(uIterations);
    }
`;

const fragmentShader = createFragmentShader(fractalFunction);

export function render(regl, params, canvas) {
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
      uColorScheme: getColorSchemeIndex(params.colorScheme),
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
