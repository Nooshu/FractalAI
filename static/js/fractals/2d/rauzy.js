import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Rauzy Fractal
// Based on Rauzy substitution system (three-letter substitution)
// Creates self-similar patterns with specific geometric properties

const float PHI = 1.618033988749; // Golden ratio
const float PI = 3.14159265359;
const float SQRT3 = 1.7320508075688772;

// Check if point is inside a triangle
bool isInsideTriangle(vec2 p, vec2 v0, vec2 v1, vec2 v2) {
    vec2 v0v1 = v1 - v0;
    vec2 v0v2 = v2 - v0;
    vec2 v0p = p - v0;
    
    float dot00 = dot(v0v2, v0v2);
    float dot01 = dot(v0v2, v0v1);
    float dot02 = dot(v0v2, v0p);
    float dot11 = dot(v0v1, v0v1);
    float dot12 = dot(v0v1, v0p);
    
    float invDenom = 1.0 / (dot00 * dot11 - dot01 * dot01);
    float u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    float v = (dot00 * dot12 - dot01 * dot02) * invDenom;
    
    return (u >= 0.0) && (v >= 0.0) && (u + v <= 1.0);
}

// Rotate vector
vec2 rotate(vec2 v, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

// Rauzy substitution - uses three-letter substitution rules
float computeFractal(vec2 c) {
    // Scale coordinates
    float scale = 3.0 + uYScale * 3.0; // 3.0 to 6.0
    vec2 p = c * scale;
    
    // Number of substitution levels
    int levels = int(clamp(uIterations / 20.0, 2.0, 8.0));
    
    // Base size
    float baseSize = 3.0;
    
    // Rotation offset controlled by X Scale
    float rotation = uXScale * PI * 2.0;
    
    // Rauzy fractal uses triangular subdivisions
    float depth = 0.0;
    float pattern = 0.0;
    
    vec2 center = vec2(0.0, 0.0);
    float currentSize = baseSize;
    
    // Iterate through substitution levels
    for (int level = 0; level < 8; level++) {
        if (level >= levels) break;
        
        currentSize = baseSize / pow(PHI, float(level));
        
        // Rauzy substitution creates triangular patterns
        // Generate triangles in a pattern
        int numTriangles = 1;
        if (level > 0) {
            numTriangles = int(pow(3.0, float(level - 1))) + 1;
        }
        
        bool found = false;
        
        for (int i = 0; i < 50; i++) {
            if (i >= numTriangles) break;
            
            // Rauzy pattern uses specific angles (related to golden ratio)
            float angle = float(i) * 2.0 * PI / 3.0 + rotation; // 120-degree increments
            float radius = currentSize * sqrt(float(i)) * 0.3;
            vec2 triangleCenter = center + vec2(cos(angle), sin(angle)) * radius;
            
            // Create equilateral triangle (common in Rauzy fractals)
            float triangleSize = currentSize * 0.9;
            vec2 v0 = triangleCenter;
            vec2 v1 = triangleCenter + rotate(vec2(triangleSize, 0.0), angle);
            vec2 v2 = triangleCenter + rotate(vec2(triangleSize * 0.5, triangleSize * SQRT3 * 0.5), angle);
            
            if (isInsideTriangle(p, v0, v1, v2)) {
                depth = float(level);
                float dist = length(p - triangleCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }
            
            // Create rotated triangle variant
            vec2 v3 = triangleCenter;
            vec2 v4 = triangleCenter + rotate(vec2(triangleSize * 0.7, 0.0), angle + PI / 3.0);
            vec2 v5 = triangleCenter + rotate(vec2(triangleSize * 0.35, triangleSize * SQRT3 * 0.35), angle + PI / 3.0);
            
            if (isInsideTriangle(p, v3, v4, v5)) {
                depth = float(level);
                float dist = length(p - triangleCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }
            
            // Create another triangle variant (Rauzy uses three types)
            vec2 v6 = triangleCenter;
            vec2 v7 = triangleCenter + rotate(vec2(triangleSize * PHI * 0.5, 0.0), angle - PI / 6.0);
            vec2 v8 = triangleCenter + rotate(vec2(triangleSize * PHI * 0.25, triangleSize * SQRT3 * PHI * 0.25), angle - PI / 6.0);
            
            if (isInsideTriangle(p, v6, v7, v8)) {
                depth = float(level);
                float dist = length(p - triangleCenter) / currentSize;
                pattern = mix(float(level) / float(levels), 1.0 - dist, 0.7);
                found = true;
                break;
            }
        }
        
        if (found) break;
    }
    
    // Add some texture based on position
    float noise = fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) * 0.1;
    
    // Return value
    float result = pattern + noise;
    return result * uIterations;
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
      ],
    },
    uniforms: {
      uResolution: [canvas.width, canvas.height],
      uZoom: params.zoom,
      uOffset: [params.offset.x, params.offset.y],
      uIterations: params.iterations,
      uPalette: paletteTexture,
      uXScale: params.xScale,
      uYScale: params.yScale,
    },
    primitive: 'triangle strip',
    count: 4,
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    },
  });

  return drawFractal;
}

export const is2D = true;

/**
 * Configuration for Rauzy fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow-double',
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

