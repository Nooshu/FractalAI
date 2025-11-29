import { vertexShader, generatePaletteTexture } from '../utils.js';

// Custom fragment shader for Multibrot Julia sets
const fragmentShader = `
    #ifdef GL_ES
    precision highp float;
    #endif
    
    uniform float uTime;
    uniform float uIterations;
    uniform float uZoom;
    uniform vec2 uOffset;
    uniform vec2 uResolution;
    uniform vec2 uJuliaC;
    uniform sampler2D uPalette;
    uniform float uXScale;
    uniform float uYScale;
    
    varying vec2 vUv;
    
    // Helper function to compute z^n for complex number z and real power n
    // Uses De Moivre's theorem: z^n = |z|^n * (cos(n*arg(z)) + i*sin(n*arg(z)))
    vec2 complexPower(vec2 z, float n) {
        if (n == 2.0) {
            // Optimized case for n=2 (standard Julia)
            return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
        }
        
        float r = length(z);
        if (r < 0.0001) {
            return vec2(0.0, 0.0); // Avoid division by zero
        }
        
        float theta = atan(z.y, z.x);
        float rn = pow(r, n);
        float nTheta = n * theta;
        
        return vec2(rn * cos(nTheta), rn * sin(nTheta));
    }
    
    float computeFractal(vec2 c) {
        // Multibrot Julia set: z = z^n + uJuliaC
        // Order n is controlled by uXScale (mapped from 2.0 to 10.0)
        float n = 2.0 + uXScale * 8.0; // Map xScale (0-1) to order (2-10)
        n = max(2.0, min(10.0, n)); // Clamp to reasonable range
        
        // For Julia sets, z starts at the pixel coordinate c
        vec2 z = c;
        float zx2 = 0.0;
        float zy2 = 0.0;
        
        // Unroll first few iterations for better performance
        z = complexPower(z, n) + uJuliaC;
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 0.0 + 1.0 - nu;
        }
        
        z = complexPower(z, n) + uJuliaC;
        zx2 = z.x * z.x;
        zy2 = z.y * z.y;
        if (zx2 + zy2 > 4.0) {
            float log_zn = log(zx2 + zy2) * 0.5;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            return 1.0 + 1.0 - nu;
        }
        
        z = complexPower(z, n) + uJuliaC;
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
            
            // Use squared magnitude check (faster than dot product)
            zx2 = z.x * z.x;
            zy2 = z.y * z.y;
            if (zx2 + zy2 > 4.0) {
                // Smooth coloring using continuous escape
                float log_zn = log(zx2 + zy2) * 0.5;
                float nu = log(log_zn / log(2.0)) / log(2.0);
                return float(i) + 1.0 - nu;
            }
            
            // Multibrot Julia formula: z = z^n + uJuliaC
            z = complexPower(z, n) + uJuliaC;
        }
        return uIterations;
    }
    
    void main() {
        vec2 uv = vUv;
        float aspect = uResolution.x / uResolution.y;
        float scale = 4.0 / uZoom;
        vec2 c = vec2(
            (uv.x - 0.5) * scale * aspect + uOffset.x,
            (uv.y - 0.5) * scale * uYScale + uOffset.y
        );
        
        float iterations = computeFractal(c);
        
        // Normalized iteration value for color lookup
        float t = clamp(iterations / uIterations, 0.0, 1.0);
        
        // Texture-based palette lookup (much faster than computed colors)
        vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
        
        // Points in the set are black
        if (iterations >= uIterations) {
            color = vec3(0.0);
        }
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

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
 * Configuration for Multibrot Julia fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow-pastel',
    iterations: 25,
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
