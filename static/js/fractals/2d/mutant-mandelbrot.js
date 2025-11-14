import { vertexShader, createFragmentShader, generatePaletteTexture } from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Mutant Mandelbrot - applies coordinate transformations before Mandelbrot iteration
        // This creates "mutant" versions by using alternate coordinate systems
        
        // Original point
        vec2 transformedC = c;
        
        // Apply multiple coordinate system transformations
        // Mix polar, logarithmic spiral, and other transformations
        
        // 1. Polar coordinate transformation
        float r = length(c);
        float theta = atan(c.y, c.x);
        
        // 2. Logarithmic spiral transformation
        float spiralFactor = 0.3;
        float spiralR = r * exp(spiralFactor * theta);
        vec2 spiralC = vec2(spiralR * cos(theta), spiralR * sin(theta));
        
        // 3. Hyperbolic transformation
        float hyperbolicX = c.x / (1.0 + c.y * c.y);
        float hyperbolicY = c.y / (1.0 + c.x * c.x);
        vec2 hyperbolicC = vec2(hyperbolicX, hyperbolicY);
        
        // 4. Inversion transformation
        float rSq = r * r;
        vec2 inversionC = rSq > 0.0 ? c / rSq : c;
        
        // 5. Sine wave perturbation
        float waveX = c.x + 0.1 * sin(c.y * 3.0);
        float waveY = c.y + 0.1 * sin(c.x * 3.0);
        vec2 waveC = vec2(waveX, waveY);
        
        // Blend between different transformations based on position
        float blendFactor = sin(theta * 3.0) * 0.5 + 0.5;
        float blendFactor2 = cos(r * 2.0) * 0.5 + 0.5;
        
        // Create mutant coordinate by blending transformations
        transformedC = mix(spiralC, hyperbolicC, blendFactor);
        transformedC = mix(transformedC, waveC, blendFactor2 * 0.5);
        
        // Apply standard Mandelbrot iteration on transformed coordinates
        vec2 z = vec2(0.0);
        float zx2 = 0.0;
        float zy2 = 0.0;
        
        // Unroll first few iterations for performance
        for (int unroll = 0; unroll < 3; unroll++) {
            zx2 = z.x * z.x;
            zy2 = z.y * z.y;
            if (zx2 + zy2 > 4.0) {
                float log_zn = log(zx2 + zy2) * 0.5;
                float nu = log(log_zn / log(2.0)) / log(2.0);
                return float(unroll) + 1.0 - nu;
            }
            z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + transformedC;
        }
        
        // Continue with main loop
        for (int i = 3; i < 200; i++) {
            if (i >= int(uIterations)) break;
            
            zx2 = z.x * z.x;
            zy2 = z.y * z.y;
            
            if (zx2 + zy2 > 4.0) {
                // Smooth coloring
                float log_zn = log(zx2 + zy2) * 0.5;
                float nu = log(log_zn / log(2.0)) / log(2.0);
                return float(i) + 1.0 - nu;
            }
            
            // Standard Mandelbrot iteration: z = z^2 + c
            z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + transformedC;
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
      uJuliaC: [0, 0], // Not used for Mutant Mandelbrot
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

