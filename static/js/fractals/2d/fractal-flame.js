import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Fractal Flame Algorithm
// Uses iterated function systems (IFS) with non-linear variations
// Creates organic, flame-like patterns with rich colors

// Variation functions for fractal flames
vec2 variation0(vec2 p) {
    // Linear
    return p;
}

vec2 variation1(vec2 p) {
    // Sinusoidal
    return vec2(sin(p.x), sin(p.y));
}

vec2 variation2(vec2 p) {
    // Spherical
    float r2 = dot(p, p);
    if (r2 < 0.0001) return p;
    return p / r2;
}

vec2 variation3(vec2 p) {
    // Swirl
    float r2 = dot(p, p);
    float c1 = sin(r2);
    float c2 = cos(r2);
    return vec2(c1 * p.x - c2 * p.y, c2 * p.x + c1 * p.y);
}

vec2 variation4(vec2 p) {
    // Horseshoe
    float r2 = dot(p, p);
    if (r2 < 0.0001) return p;
    return vec2((p.x - p.y) * (p.x + p.y) / r2, 2.0 * p.x * p.y / r2);
}

vec2 variation5(vec2 p) {
    // Polar
    float r = length(p);
    float theta = atan(p.y, p.x);
    return vec2(theta / 3.14159, r - 1.0);
}

vec2 variation6(vec2 p) {
    // Disc
    float r = length(p);
    float theta = atan(p.y, p.x);
    return vec2(theta / 3.14159 * sin(r * 3.14159), theta / 3.14159 * cos(r * 3.14159));
}

vec2 variation7(vec2 p) {
    // Spiral
    float r = length(p);
    float theta = atan(p.y, p.x);
    if (r < 0.0001) return p;
    return vec2((cos(theta) + sin(r)) / r, (sin(theta) - cos(r)) / r);
}

// Apply variation based on index
vec2 applyVariation(int varIndex, vec2 p) {
    if (varIndex == 0) return variation0(p);
    else if (varIndex == 1) return variation1(p);
    else if (varIndex == 2) return variation2(p);
    else if (varIndex == 3) return variation3(p);
    else if (varIndex == 4) return variation4(p);
    else if (varIndex == 5) return variation5(p);
    else if (varIndex == 6) return variation6(p);
    else return variation7(p);
}

float computeFractal(vec2 c) {
    // Scale coordinates
    float scale = 2.0 + uYScale * 3.0; // 2.0 to 5.0
    vec2 p = c * scale;
    
    // Number of iterations
    int maxIter = int(clamp(uIterations / 20.0, 15.0, 60.0));
    
    // Initialize - start from a fixed point and iterate forward
    vec2 point = vec2(0.0, 0.0);
    float density = 0.0;
    
    // IFS parameters (affine transformations)
    // Using multiple transformations with different variations
    mat2 transform1 = mat2(0.8, -0.6, 0.6, 0.8);
    vec2 offset1 = vec2(0.1, 0.1);
    int var1 = 3; // Swirl
    
    mat2 transform2 = mat2(0.3, 0.0, 0.0, 0.3);
    vec2 offset2 = vec2(0.5, 0.0);
    int var2 = 2; // Spherical
    
    mat2 transform3 = mat2(0.3, 0.0, 0.0, 0.3);
    vec2 offset3 = vec2(0.25, 0.5);
    int var3 = 7; // Spiral
    
    // Variation weights (controlled by X Scale)
    float varWeight = 0.3 + uXScale * 0.7; // 0.3 to 1.0
    
    // Iterate forward from origin
    for (int i = 0; i < 60; i++) {
        if (i >= maxIter) break;
        
        // Choose transformation randomly (based on iteration and position)
        float choice = fract(sin(float(i) * 12.9898 + dot(point, vec2(78.233, 12.345))) * 43758.5453);
        
        vec2 transformed;
        int varIndex;
        
        if (choice < 0.33) {
            transformed = transform1 * point + offset1;
            varIndex = var1;
        } else if (choice < 0.66) {
            transformed = transform2 * point + offset2;
            varIndex = var2;
        } else {
            transformed = transform3 * point + offset3;
            varIndex = var3;
        }
        
        // Apply variation
        vec2 varied = applyVariation(varIndex, transformed);
        
        // Blend between transformed and varied based on varWeight
        point = mix(transformed, varied, varWeight);
        
        // Check if point is near the query point p
        vec2 diff = point - p;
        float dist2 = dot(diff, diff);
        
        // Accumulate density based on distance to query point
        density += 1.0 / (1.0 + dist2 * 10.0);
    }
    
    // Also check reverse iteration (from query point)
    point = p;
    for (int i = 0; i < 60; i++) {
        if (i >= maxIter / 2) break;
        
        float choice = fract(sin(float(i) * 12.9898 + dot(point, vec2(78.233, 12.345))) * 43758.5453);
        
        vec2 transformed;
        int varIndex;
        
        if (choice < 0.33) {
            transformed = transform1 * point + offset1;
            varIndex = var1;
        } else if (choice < 0.66) {
            transformed = transform2 * point + offset2;
            varIndex = var2;
        } else {
            transformed = transform3 * point + offset3;
            varIndex = var3;
        }
        
        vec2 varied = applyVariation(varIndex, transformed);
        point = mix(transformed, varied, varWeight);
        
        float dist2 = dot(point, point);
        density += 1.0 / (1.0 + dist2 * 10.0);
    }
    
    // Normalize and return
    float result = density / float(maxIter);
    result = pow(result, 0.3); // Gamma correction for better contrast
    return result * uIterations * 2.0;
}
`;

const fragmentShader = createFragmentShader(fractalFunction);

export function render(regl, params, canvas) {
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  const drawFractal = regl({
    frag: fragmentShader,
    vert: `
      precision mediump float;
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position;
        gl_Position = vec4(position, 0, 1);
      }
    `,
    attributes: {
      position: [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]
},
    uniforms: {
      uResolution: [canvas.width, canvas.height],
      uZoom: params.zoom,
      uOffset: [params.offset.x, params.offset.y],
      uIterations: params.iterations,
      uPalette: paletteTexture,
      uXScale: params.xScale,
      uYScale: params.yScale
},
    primitive: 'triangle strip',
    count: 4,
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height
}
});

  return drawFractal;
}

export const is2D = true;

/**
 * Configuration for Fractal Flame fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow-shifted', // Rainbow Shifted
  },
  initialPosition: {
    zoom: 2,
    offset: { x: 1.5954, y: 0.1599 }
},
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};