import { vertexShader, generatePaletteTexture } from '../utils.js';

const fractalFunction = `
    // Generalised Sierpinski Gasket
    // Creates Sierpinski-style fractals for any regular polygon
    
    const float PI = 3.14159265359;
    
    // Get vertex position for an n-sided regular polygon
    vec2 getPolygonVertex(int n, int i) {
        float angle = float(i) * 2.0 * PI / float(n);
        // Start from top vertex (rotate by -PI/2 for odd n, adjust for even n)
        if (n == 3) {
            angle -= PI / 2.0; // Triangle points up
        } else if (n == 4) {
            angle += PI / 4.0; // Square is diamond-oriented
        } else if (n == 5) {
            angle -= PI / 2.0; // Pentagon points up
        } else if (n == 6) {
            angle += 0.0; // Hexagon flat top
        } else {
            angle -= PI / 2.0; // General case: point up
        }
        return vec2(cos(angle), sin(angle));
    }
    
    // Check if point is inside an n-sided regular polygon
    bool isInsidePolygon(vec2 p, vec2 center, float radius, int n) {
        // Use cross product method to check if point is on the correct side of all edges
        for (int i = 0; i < 12; i++) { // Max 12 sides
            if (i >= n) break;
            
            vec2 v1 = getPolygonVertex(n, i) * radius + center;
            
            // Get next vertex (handle wrap-around)
            int nextI = i + 1;
            if (nextI >= n) nextI = 0;
            vec2 v2 = getPolygonVertex(n, nextI) * radius + center;
            
            // Edge vector
            vec2 edge = v2 - v1;
            // Vector from v1 to point
            vec2 toPoint = p - v1;
            
            // Cross product (2D: returns scalar)
            float cross = edge.x * toPoint.y - edge.y * toPoint.x;
            
            // If point is on wrong side of any edge, it's outside
            if (cross < 0.0) {
                return false;
            }
        }
        return true;
    }
    
    // Get the scaling factor for n-sided gasket
    float getScalingFactor(int n) {
        // For n-sided regular polygon gasket
        // The scaling factor is typically 1 / (1 + 2*cos(PI/n))
        // But we use simpler factors for common cases
        if (n == 3) return 1.0 / 2.0;       // Triangle
        if (n == 4) return 1.0 / 2.0;       // Square (Sierpinski carpet style)
        if (n == 5) return 1.0 / (1.618033988749895 + 1.0); // Pentagon (golden ratio)
        if (n == 6) return 1.0 / 3.0;       // Hexagon
        if (n == 7) return 0.35;            // Heptagon
        if (n == 8) return 0.33;            // Octagon
        if (n == 9) return 0.31;            // Nonagon
        if (n == 10) return 0.3;            // Decagon
        
        // General formula for larger n
        float angleRad = PI / float(n);
        return 1.0 / (1.0 + 2.0 * cos(angleRad));
    }
    
    // Get the center of the sub-polygon at vertex i
    vec2 getSubPolygonCenter(vec2 center, float radius, int n, int vertexIndex) {
        vec2 vertex = getPolygonVertex(n, vertexIndex);
        float scaleFactor = getScalingFactor(n);
        
        // Position sub-polygon at vertex, accounting for scaling
        // The distance factor depends on n
        float distanceFactor = 1.0 - scaleFactor;
        
        return center + vertex * radius * distanceFactor;
    }
    
    // Iterative Sierpinski gasket computation
    float computeFractal(vec2 c) {
        // Get number of sides from uIterations mapping
        // Map iterations slider (0-200) to number of sides (3-12)
        // iterations 0-20 -> level control for n=3
        // We'll use a different approach: use xScale for n, yScale for depth
        int numSides = int(clamp(uXScale * 6.0 + 3.0, 3.0, 12.0));
        int maxDepth = int(clamp(uIterations / 30.0, 1.0, 6.0));
        
        // Scale and center the polygon
        float baseRadius = 0.85;
        vec2 baseCenter = vec2(0.0, 0.0);
        
        vec2 currentPos = c;
        float currentRadius = baseRadius;
        vec2 currentCenter = baseCenter;
        float depth = 0.0;
        
        // Iterative depth calculation for coloring
        for (int level = 0; level < 6; level++) {
            if (level >= maxDepth) break;
            
            if (!isInsidePolygon(currentPos, currentCenter, currentRadius, numSides)) {
                return 0.0; // Outside the polygon
            }
            
            float scaleFactor = getScalingFactor(numSides);
            float centerRadius = currentRadius * scaleFactor;
            
            // Check if in center removed region
            if (isInsidePolygon(currentPos, currentCenter, centerRadius, numSides)) {
                return 0.0; // In removed region
            }
            
            // Find which sub-polygon we're in
            float subRadius = currentRadius * scaleFactor;
            bool foundSubPolygon = false;
            
            for (int i = 0; i < 12; i++) {
                if (i >= numSides) break;
                
                vec2 subCenter = getSubPolygonCenter(currentCenter, currentRadius, numSides, i);
                if (isInsidePolygon(currentPos, subCenter, subRadius, numSides)) {
                    // Move into this sub-polygon
                    currentCenter = subCenter;
                    currentRadius = subRadius;
                    depth += 1.0;
                    foundSubPolygon = true;
                    break;
                }
            }
            
            if (!foundSubPolygon) {
                // In the "border" region between sub-polygons
                return depth * 15.0 + 10.0 + float(numSides) * 2.0;
            }
        }
        
        // Inside a sub-polygon at max depth
        return depth * 15.0 + float(maxDepth) * 5.0 + float(numSides);
    }
`;

// Custom fragment shader matching sierpinski-hexagon approach but without uXScale in coordinates
const fragmentShader = `
    #ifdef GL_ES
    precision mediump float;
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
    
    ${fractalFunction}
    
    void main() {
        vec2 uv = vUv;
        
        // Precompute aspect ratio and scale once
        float aspect = uResolution.x / uResolution.y;
        float scale = 4.0 / uZoom;
        
        // Optimize coordinate calculation
        // Match standard shader approach: apply aspect to X, but don't apply uXScale
        // uXScale is used to control number of polygon sides, not coordinate scaling
        vec2 uvCentered = uv - 0.5;
        vec2 c = vec2(
            uvCentered.x * scale * aspect + uOffset.x,
            uvCentered.y * scale * uYScale + uOffset.y
        );
        
        float iterations = computeFractal(c);
        
        // Normalized iteration value for color lookup
        float invIterations = 1.0 / uIterations;
        float t = clamp(iterations * invIterations, 0.0, 1.0);
        
        // Texture-based palette lookup
        vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
        
        // Points in the set are black - use step() to avoid branch
        float isInSet = step(uIterations, iterations);
        color = mix(color, vec3(0.0), isInSet);
        
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
      uJuliaC: [0, 0], // Not used
      uPalette: paletteTexture,
      uXScale: params.xScale, // Used for number of sides
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
 * Configuration for Sierpinski Gasket fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'autumn',
    xScale: 0.5,
  },
  initialPosition: {
    zoom: 1,
    offset: { x: 0.019, y: 0.144 },
  },
  interestingPoints: [],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};

