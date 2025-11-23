import { vertexShader, createFragmentShader, generatePaletteTexture } from '../utils.js';

const fractalFunction = `
    // Sierpinski Pentagon
    // Creates a self-similar pentagonal fractal pattern
    
    // Pentagon vertices (regular pentagon centered at origin)
    const float PI = 3.14159265359;
    
    vec2 getPentagonVertex(int i) {
        float angle = -PI / 2.0 + float(i) * 2.0 * PI / 5.0;
        return vec2(cos(angle), sin(angle));
    }
    
    // Check if point is inside a pentagon
    bool isInsidePentagon(vec2 p, vec2 center, float radius) {
        // Use cross product method to check if point is on the correct side of all edges
        for (int i = 0; i < 5; i++) {
            vec2 v1 = getPentagonVertex(i) * radius + center;
            // WebGL1 doesn't support integer modulus, so handle wrap-around manually
            int nextI = i + 1;
            if (nextI >= 5) nextI = 0;
            vec2 v2 = getPentagonVertex(nextI) * radius + center;
            
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
    
    // Get the center of the sub-pentagon at vertex i
    vec2 getSubPentagonCenter(vec2 center, float radius, int vertexIndex) {
        vec2 vertex = getPentagonVertex(vertexIndex);
        // Sub-pentagons are positioned at scaled distance toward each vertex
        float phi = 1.618033988749895; // Golden ratio
        float scaleFactor = 1.0 / (1.0 + phi);
        return center + vertex * radius * scaleFactor;
    }
    
    // Iterative version (WebGL1 doesn't support recursion)
    float computeFractal(vec2 c) {
        int maxDepth = int(clamp(uIterations / 20.0, 1.0, 6.0));
        
        // Scale and center the pentagon
        float baseRadius = 0.9;
        vec2 baseCenter = vec2(0.0, 0.0);
        
        vec2 currentPos = c;
        float currentRadius = baseRadius;
        vec2 currentCenter = baseCenter;
        float depth = 0.0;
        
        // Iterative depth calculation for coloring
        for (int level = 0; level < 6; level++) {
            if (level >= maxDepth) break;
            
            if (!isInsidePentagon(currentPos, currentCenter, currentRadius)) {
                return 0.0; // Outside the pentagon
            }
            
            float phi = 1.618033988749895;
            float centerRadius = currentRadius / (1.0 + phi);
            
            // Check if in center removed region
            if (isInsidePentagon(currentPos, currentCenter, centerRadius)) {
                return 0.0; // In removed region
            }
            
            // Find which sub-pentagon we're in
            float subRadius = currentRadius / (1.0 + phi);
            bool foundSubPentagon = false;
            
            for (int i = 0; i < 5; i++) {
                vec2 subCenter = getSubPentagonCenter(currentCenter, currentRadius, i);
                if (isInsidePentagon(currentPos, subCenter, subRadius)) {
                    // Move into this sub-pentagon
                    currentCenter = subCenter;
                    currentRadius = subRadius;
                    depth += 1.0;
                    foundSubPentagon = true;
                    break;
                }
            }
            
            if (!foundSubPentagon) {
                // In the "border" region between sub-pentagons
                return depth * 15.0 + 10.0;
            }
        }
        
        // Inside a sub-pentagon at max depth
        return depth * 15.0 + float(maxDepth) * 5.0;
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
      uJuliaC: [0, 0], // Not used
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
 * Configuration for Sierpinski Pentagon fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'midnight',
  },
  initialPosition: {
    zoom: 1.938,
    offset: { x: 0, y: 0 },
  },
  interestingPoints: [],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};

