import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Triangular Subdivision Fractal
// Recursively subdivides triangles into 4 smaller triangles by connecting edge midpoints
// Creates a pattern similar to Loop subdivision but as a fractal

// Compute barycentric coordinates
vec3 barycentric(vec2 p, vec2 a, vec2 b, vec2 c) {
    vec2 v0 = c - a;
    vec2 v1 = b - a;
    vec2 v2 = p - a;
    
    float dot00 = dot(v0, v0);
    float dot01 = dot(v0, v1);
    float dot02 = dot(v0, v2);
    float dot11 = dot(v1, v1);
    float dot12 = dot(v1, v2);
    
    float invDenom = 1.0 / (dot00 * dot11 - dot01 * dot01);
    float u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    float v = (dot00 * dot12 - dot01 * dot02) * invDenom;
    
    return vec3(1.0 - u - v, v, u);
}

// Check if point is inside triangle
bool isInsideTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
    vec3 bary = barycentric(p, a, b, c);
    return (bary.x >= 0.0) && (bary.y >= 0.0) && (bary.z >= 0.0);
}

float computeFractal(vec2 c) {
    int iterations = int(clamp(uIterations / 20.0, 1.0, 7.0));
    
    // Define the three vertices of the base equilateral triangle
    vec2 v0 = vec2(0.0, 0.866);      // Top vertex
    vec2 v1 = vec2(-1.0, -0.866);    // Bottom left
    vec2 v2 = vec2(1.0, -0.866);     // Bottom right
    
    vec2 pos = c;
    
    // Check if point is outside base triangle
    if (!isInsideTriangle(pos, v0, v1, v2)) {
        return 0.0;
    }
    
    // Apply triangular subdivision iteratively
    float depth = 0.0;
    vec2 currentV0 = v0;
    vec2 currentV1 = v1;
    vec2 currentV2 = v2;
    
    for (int i = 0; i < 7; i++) {
        if (i >= iterations) break;
        
        // Calculate midpoints of edges
        vec2 mid01 = (currentV0 + currentV1) * 0.5;
        vec2 mid12 = (currentV1 + currentV2) * 0.5;
        vec2 mid20 = (currentV2 + currentV0) * 0.5;
        
        // Subdivide into 4 triangles:
        // Triangle 1: v0, mid01, mid20 (top)
        // Triangle 2: mid01, v1, mid12 (bottom-left)
        // Triangle 3: mid20, mid12, v2 (bottom-right)
        // Triangle 4: mid01, mid12, mid20 (center)
        
        bool found = false;
        
        // Check which sub-triangle contains the point
        if (isInsideTriangle(pos, currentV0, mid01, mid20)) {
            // Top triangle
            currentV0 = currentV0;
            currentV1 = mid01;
            currentV2 = mid20;
            depth += 1.0;
            found = true;
        } else if (isInsideTriangle(pos, mid01, currentV1, mid12)) {
            // Bottom-left triangle
            currentV0 = mid01;
            currentV1 = currentV1;
            currentV2 = mid12;
            depth += 2.0;
            found = true;
        } else if (isInsideTriangle(pos, mid20, mid12, currentV2)) {
            // Bottom-right triangle
            currentV0 = mid20;
            currentV1 = mid12;
            currentV2 = currentV2;
            depth += 3.0;
            found = true;
        } else if (isInsideTriangle(pos, mid01, mid12, mid20)) {
            // Center triangle
            currentV0 = mid01;
            currentV1 = mid12;
            currentV2 = mid20;
            depth += 4.0;
            found = true;
        }
        
        if (!found) {
            return depth * 20.0;
        }
    }
    
    // Return depth for coloring
    return depth * 10.0 + float(iterations) * 5.0;
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
 * Configuration for Triangular Subdivision fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'coral',
  },
  initialPosition: {
    zoom: 1.949,
    offset: { x: 1.3925, y: 1.0736 },
  },
  interestingPoints: [],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};

