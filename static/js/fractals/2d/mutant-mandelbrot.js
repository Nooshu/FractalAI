import {
  createFragmentShader,
  createStandardDrawCommand
} from '../utils.js';

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
            if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
                float log_zn = log(zx2 + zy2) * 0.5;
                float nu = log(log_zn * INV_LOG2) * INV_LOG2;
                return float(unroll) + 1.0 - nu;
            }
            z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + transformedC;
        }
        
        // Continue with main loop
        for (int i = 3; i < 200; i++) {
            if (i >= int(uIterations)) break;
            
            zx2 = z.x * z.x;
            zy2 = z.y * z.y;
            
            if (zx2 + zy2 > ESCAPE_RADIUS_SQ) {
                // Smooth coloring
                float log_zn = log(zx2 + zy2) * 0.5;
                float nu = log(log_zn * INV_LOG2) * INV_LOG2;
                return float(i) + 1.0 - nu;
            }
            
            // Standard Mandelbrot iteration: z = z^2 + c
            z = vec2(zx2 - zy2, 2.0 * z.x * z.y) + transformedC;
        }
        
        return uIterations;
    }
`;

export function render(regl, params, canvas, options = {}) {
  // Check if UBOs should be used (WebGL2 optimization)
  const webglCapabilities = options.webglCapabilities;
  const ubo = options.ubo;
  const useUBO = webglCapabilities?.isWebGL2 && ubo;

  // Create fragment shader with UBO support if available
  const fragmentShader = createFragmentShader(fractalFunction, useUBO);

  // Use createStandardDrawCommand for UBO support
  return createStandardDrawCommand(regl, params, canvas, fragmentShader, {
    webglCapabilities,
    ubo,
    juliaC: { x: 0, y: 0 }, // Not used for Mutant Mandelbrot
  });
}

export const is2D = true;

/**
 * Configuration for Mutant Mandelbrot fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'classic'
},
  initialPosition: {
    zoom: 1,
    offset: { x: -0.536, y: 0.006 }
  },
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1
}
};
