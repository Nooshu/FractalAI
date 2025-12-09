import {
  generatePaletteTexture,
  createFragmentShader,
  getVertexShader
} from '../utils.js';

const fractalFunction = `
// Recursive Polygon Splitting Fractal
// Recursively splits polygons into smaller polygons by connecting vertices or edge midpoints
// Creates intricate patterns through geometric subdivision

const float PI = 3.14159265359;

// Get vertex position for an n-sided regular polygon
vec2 getPolygonVertex(int n, int i, vec2 center, float radius) {
    float angle = float(i) * 2.0 * PI / float(n);
    // Start from top vertex (rotate by -PI/2)
    angle -= PI / 2.0;
    return center + vec2(cos(angle), sin(angle)) * radius;
}

// Check if point is inside a polygon using ray casting
bool isInsidePolygon(vec2 p, vec2 center, float radius, int n) {
    // Use cross product method to check if point is on the correct side of all edges
    for (int i = 0; i < 12; i++) {
        if (i >= n) break;
        
        vec2 v1 = getPolygonVertex(n, i, center, radius);
        
        // Get next vertex (handle wrap-around)
        int nextI = i + 1;
        if (nextI >= n) nextI = 0;
        vec2 v2 = getPolygonVertex(n, nextI, center, radius);
        
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

float computeFractal(vec2 c) {
    int iterations = int(clamp(uIterations / 20.0, 1.0, 7.0));
    
    // Start with a base polygon (use number of sides from xScale)
    // Use uXScale/uYScale (template provides aliases for UBO mode)
    int numSides = int(clamp(uXScale * 5.0 + 3.0, 3.0, 12.0));
    
    // Base polygon centered at origin
    vec2 baseCenter = vec2(0.0, 0.0);
    float baseRadius = 0.9;
    
    // Check if point is outside base polygon
    if (!isInsidePolygon(c, baseCenter, baseRadius, numSides)) {
        return 0.0;
    }
    
    // Apply recursive polygon splitting iteratively
    float depth = 0.0;
    vec2 currentCenter = baseCenter;
    float currentRadius = baseRadius;
    int currentSides = numSides;
    
    for (int i = 0; i < 7; i++) {
        if (i >= iterations) break;
        
        // Check if still in current polygon
        if (!isInsidePolygon(c, currentCenter, currentRadius, currentSides)) {
            return depth * 20.0;
        }
        
        // Split polygon by connecting vertices or edge midpoints
        // Strategy: split into smaller polygons by connecting every other vertex
        // This creates a star pattern that subdivides the polygon
        
        // Calculate the scale factor for sub-polygons
        // For a polygon split by connecting every other vertex, the scale depends on n
        float scaleFactor;
        if (currentSides == 3) {
            scaleFactor = 0.5; // Triangle splits into 4 smaller triangles
        } else if (currentSides == 4) {
            scaleFactor = 0.5; // Square splits into 4 smaller squares
        } else if (currentSides == 5) {
            scaleFactor = 0.618; // Pentagon (golden ratio)
        } else if (currentSides == 6) {
            scaleFactor = 0.577; // Hexagon
        } else {
            // General formula: scale by approximately 1/sqrt(2) for larger polygons
            scaleFactor = 0.707;
        }
        
        float subRadius = currentRadius * scaleFactor;
        
        // Determine which sub-polygon contains the point
        // We'll create sub-polygons at the vertices and center
        
        // Check center sub-polygon first
        if (isInsidePolygon(c, currentCenter, subRadius, currentSides)) {
            currentRadius = subRadius;
            depth += float(currentSides);
        } else {
            // Check vertex sub-polygons
            bool found = false;
            for (int j = 0; j < 12; j++) {
                if (j >= currentSides) break;
                
                vec2 vertex = getPolygonVertex(currentSides, j, currentCenter, currentRadius);
                vec2 subCenter = currentCenter + (vertex - currentCenter) * (1.0 - scaleFactor);
                
                if (isInsidePolygon(c, subCenter, subRadius, currentSides)) {
                    currentCenter = subCenter;
                    currentRadius = subRadius;
                    depth += float(j + 1);
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                // Point is in a gap between sub-polygons
                return depth * 15.0 + 10.0;
            }
        }
    }
    
    // Return depth for coloring
    return depth * 10.0 + float(iterations) * 5.0 + float(numSides) * 2.0;
}
`;

export function render(regl, params, canvas, options = {}) {
  // Check if UBOs should be used (WebGL2 optimization)
  const webglCapabilities = options.webglCapabilities;
  const ubo = options.ubo;
  const useUBO = webglCapabilities?.isWebGL2 && ubo;

  // Create fragment shader with UBO support if available
  const fragmentShader = createFragmentShader(fractalFunction, useUBO);

  // Use standard vertex shader (getVertexShader handles UBO mode)
  const vertexShaderSource = getVertexShader(useUBO);

  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  const drawFractal = regl({
    frag: fragmentShader,
    vert: vertexShaderSource,
    attributes: {
      position: [-1, -1, 1, -1, -1, 1, 1, 1]
},
    uniforms: useUBO
      ? {
          uTime: 0,
          uResolution: [canvas.width, canvas.height],
          uPalette: paletteTexture
}
      : {
          uTime: 0,
          uIterations: params.iterations,
          uZoom: params.zoom,
          uOffset: [params.offset.x, params.offset.y],
          uResolution: [canvas.width, canvas.height],
          uJuliaC: [0, 0],
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
},
    // Bind UBO if available
    ...(useUBO && ubo?.glBuffer && ubo?.bind
      ? {
          context: { ubo: ubo },
          before: function bindUBO(context) {
            const gl = regl._gl;
            const program = gl.getParameter(gl.CURRENT_PROGRAM);
            if (program && context.ubo) {
              context.ubo.update({
                iterations: params.iterations,
                zoom: params.zoom,
                offset: params.offset,
                juliaC: { x: 0, y: 0 },
                xScale: params.xScale,
                yScale: params.yScale
});
              context.ubo.bind(program);
            }
          }
}
      : {})
});

  return drawFractal;
}

export const is2D = true;

/**
 * Configuration for Recursive Polygon Splitting fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'electric'
},
  initialPosition: {
    zoom: 1.853,
    offset: { x: 0.1162, y: 0.1193 }
},
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};