import { vertexShader, createFragmentShader, getColorSchemeIndex } from '../utils.js';

// Koch snowflake - based on proven GLSL implementation
const fractalFunction = `
    // Rotate a 2D vector by angle a
    mat2 rot(float a) {
        float c = cos(a);
        float s = sin(a);
        return mat2(c, -s, s, c);
    }
    
    // Signed distance to an equilateral triangle centered at origin
    float sdEquilateralTriangle(vec2 p) {
        const float k = sqrt(3.0);
        p.x = abs(p.x) - 1.0;
        p.y = p.y + 1.0 / k;
        if (p.x + k * p.y > 0.0) {
            p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
        }
        p.x -= clamp(p.x, -2.0, 0.0);
        return -length(p) * sign(p.y);
    }
    
    // Distance to a Koch edge along the x axis
    float kochEdge(vec2 p) {
        // Fold into first quadrant along x
        p.x = abs(p.x);
        
        // Project along base segment [0,1]
        float k = clamp(p.x, 0.0, 1.0);
        p.x -= k;
        
        // Iteratively fold the segment into the Koch shape
        int maxIter = int(min(uIterations, 6.0));
        for (int i = 0; i < 200; i++) {
            if (i >= maxIter) break;
            
            // Scale to 3 subsegments
            p *= 3.0;
            
            // Fold into middle segment
            if (p.x > 1.0) p.x = 2.0 - p.x;
            
            // Rotate the middle segment up to form the "bump"
            // Rotation by 60 degrees: cos(60°)=0.5, sin(60°)=0.8660254
            p = mat2(0.5, 0.8660254, -0.8660254, 0.5) * p;
        }
        
        // Distance to the base line after folding
        return abs(p.y);
    }
    
    // Distance to full Koch snowflake outline
    float sdKochSnowflake(vec2 p) {
        // Scale and center - adjust for our coordinate system
        p /= 1.0;
        
        // Build 3 Koch edges around the triangle
        // The Koch snowflake is defined by the Koch curves on each edge
        float dEdge = 1e9;
        for (int i = 0; i < 3; i++) {
            float a = 2.0 * 3.14159265 * float(i) / 3.0;
            vec2 q = rot(a) * p;
            // Align so that the edge lies roughly on x axis
            // Translate to position the edge correctly
            q.y -= -0.57735027; // -1 / sqrt(3)
            float edgeDist = kochEdge(q);
            dEdge = min(dEdge, edgeDist);
        }
        
        // Use only the Koch edge distance (not the triangle)
        // The Koch curve itself defines the snowflake shape
        return dEdge;
    }
    
    int computeFractal(vec2 c) {
        vec2 p = c;
        
        // Compute distance to Koch snowflake
        float dist = sdKochSnowflake(p);
        
        // Convert distance to iteration count
        // Points very close to the curve = max iterations (black outline)
        // Points further away = lower iterations (colored gradient)
        // Use a fixed threshold that works well
        if (dist < 0.008) {
            return int(uIterations);
        }
        
        // Create gradient based on distance
        // Scale factor adjusted to create better gradient
        float distFactor = dist * 120.0;
        int iter = int(min(distFactor, uIterations - 1.0));
        return max(iter, 1);
    }
`;

const fragmentShader = createFragmentShader(fractalFunction);

export function render(regl, params, canvas) {
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
      uJuliaC: [0, 0],
      uColorScheme: getColorSchemeIndex(params.colorScheme),
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
