import { vertexShader, createFragmentShader, generatePaletteTexture } from '../utils.js';

const fractalFunction = `
    // Sierpinski Hexagon
    // Creates a self-similar hexagonal fractal pattern
    
    const float PI = 3.14159265359;
    
    vec2 getHexagonVertex(int i) {
        float angle = float(i) * 2.0 * PI / 6.0;
        return vec2(cos(angle), sin(angle));
    }
    
    // Check if point is inside a hexagon
    bool isInsideHexagon(vec2 p, vec2 center, float radius) {
        // Use cross product method to check if point is on the correct side of all edges
        for (int i = 0; i < 6; i++) {
            vec2 v1 = getHexagonVertex(i) * radius + center;
            // WebGL1 doesn't support integer modulus, so handle wrap-around manually
            int nextI = i + 1;
            if (nextI >= 6) nextI = 0;
            vec2 v2 = getHexagonVertex(nextI) * radius + center;
            
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
    
    // Get the center of the sub-hexagon at vertex i
    vec2 getSubHexagonCenter(vec2 center, float radius, int vertexIndex) {
        vec2 vertex = getHexagonVertex(vertexIndex);
        // Sub-hexagons are positioned at scaled distance toward each vertex
        // For hexagons, use scaling factor of 1/3
        float scaleFactor = 1.0 / 3.0;
        return center + vertex * radius * scaleFactor * 2.0;
    }
    
    // Iterative version (WebGL1 doesn't support recursion)
    float computeFractal(vec2 c) {
        int maxDepth = int(clamp(uIterations / 20.0, 1.0, 6.0));
        
        // Scale and center the hexagon
        float baseRadius = 0.85;
        vec2 baseCenter = vec2(0.0, 0.0);
        
        vec2 currentPos = c;
        float currentRadius = baseRadius;
        vec2 currentCenter = baseCenter;
        float depth = 0.0;
        
        // Iterative depth calculation for coloring
        for (int level = 0; level < 6; level++) {
            if (level >= maxDepth) break;
            
            if (!isInsideHexagon(currentPos, currentCenter, currentRadius)) {
                return 0.0; // Outside the hexagon
            }
            
            // For hexagons, we scale by 1/3
            float centerRadius = currentRadius / 3.0;
            
            // Check if in center removed region
            if (isInsideHexagon(currentPos, currentCenter, centerRadius)) {
                return 0.0; // In removed region
            }
            
            // Find which sub-hexagon we're in
            float subRadius = currentRadius / 3.0;
            bool foundSubHexagon = false;
            
            for (int i = 0; i < 6; i++) {
                vec2 subCenter = getSubHexagonCenter(currentCenter, currentRadius, i);
                if (isInsideHexagon(currentPos, subCenter, subRadius)) {
                    // Move into this sub-hexagon
                    currentCenter = subCenter;
                    currentRadius = subRadius;
                    depth += 1.0;
                    foundSubHexagon = true;
                    break;
                }
            }
            
            if (!foundSubHexagon) {
                // In the "border" region between sub-hexagons
                return depth * 15.0 + 10.0;
            }
        }
        
        // Inside a sub-hexagon at max depth
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
 * Configuration for Sierpinski Hexagon fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'classic',
  },
  initialPosition: {
    zoom: 1.871,
    offset: { x: 0.0056, y: 0.0898 },
  },
  interestingPoints: [],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};

