import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Apollonian Gasket
// A fractal formed by recursively inscribing circles in the gaps between mutually tangent circles
// Uses a simplified iterative approach to approximate the Apollonian gasket pattern

const float PI = 3.14159265359;

// Check if point is inside a circle
bool isInsideCircle(vec2 p, vec2 center, float radius) {
    return length(p - center) <= radius;
}

float computeFractal(vec2 c) {
    int iterations = int(clamp(uIterations / 20.0, 1.0, 7.0));
    
    // Start with three mutually tangent circles forming the base triangle
    // These are arranged in an equilateral triangle
    // Circle 1: bottom-left
    vec2 c1 = vec2(-0.5, -0.289);
    float r1 = 0.5;
    // Circle 2: bottom-right
    vec2 c2 = vec2(0.5, -0.289);
    float r2 = 0.5;
    // Circle 3: top
    vec2 c3 = vec2(0.0, 0.577);
    float r3 = 0.5;
    
    // Outer bounding circle
    vec2 outerCenter = vec2(0.0, 0.0);
    float outerRadius = 1.2;
    
    // Check if point is outside the outer bounding circle
    if (!isInsideCircle(c, outerCenter, outerRadius)) {
        return 0.0;
    }
    
    // Apply recursive circle packing iteratively
    float depth = 0.0;
    vec2 currentPos = c;
    vec2 currentC1 = c1;
    vec2 currentC2 = c2;
    vec2 currentC3 = c3;
    float currentR1 = r1;
    float currentR2 = r2;
    float currentR3 = r3;
    
    for (int i = 0; i < 7; i++) {
        if (i >= iterations) break;
        
        // Check if point is inside any of the three circles
        if (isInsideCircle(currentPos, currentC1, currentR1)) {
            return depth * 12.0 + 1.0;
        } else if (isInsideCircle(currentPos, currentC2, currentR2)) {
            return depth * 12.0 + 2.0;
        } else if (isInsideCircle(currentPos, currentC3, currentR3)) {
            return depth * 12.0 + 3.0;
        }
        
        // Point is in a gap - calculate the inscribed circle in this gap
        // For Apollonian gasket, we inscribe a circle tangent to all three
        // Simplified: use the center of the gap (centroid of triangle formed by three circle centers)
        vec2 gapCenter = (currentC1 + currentC2 + currentC3) / 3.0;
        
        // Approximate radius of inscribed circle
        // Distance from gap center to nearest circle boundary
        float dist1 = length(gapCenter - currentC1) - currentR1;
        float dist2 = length(gapCenter - currentC2) - currentR2;
        float dist3 = length(gapCenter - currentC3) - currentR3;
        float minDist = min(min(dist1, dist2), dist3);
        float inscribedRadius = minDist * 0.8; // Slightly smaller to ensure tangency
        
        // Check if point is inside the inscribed circle
        if (isInsideCircle(currentPos, gapCenter, inscribedRadius)) {
            // Point is in the inscribed circle - recurse into it
            // Create three new circles around this inscribed circle
            // They are positioned at the gaps between the inscribed circle and the three outer circles
            float scale = 0.5;
            currentC1 = gapCenter + normalize(currentC1 - gapCenter) * inscribedRadius * 1.5;
            currentC2 = gapCenter + normalize(currentC2 - gapCenter) * inscribedRadius * 1.5;
            currentC3 = gapCenter + normalize(currentC3 - gapCenter) * inscribedRadius * 1.5;
            currentR1 = inscribedRadius * scale;
            currentR2 = inscribedRadius * scale;
            currentR3 = inscribedRadius * scale;
            depth += 4.0;
        } else {
            // Point is in one of the three outer gaps
            // Find which gap (between inscribed circle and one of the three outer circles)
            vec2 toC1 = normalize(currentC1 - gapCenter);
            vec2 toC2 = normalize(currentC2 - gapCenter);
            vec2 toC3 = normalize(currentC3 - gapCenter);
            vec2 toPoint = normalize(currentPos - gapCenter);
            
            float dot1 = dot(toPoint, toC1);
            float dot2 = dot(toPoint, toC2);
            float dot3 = dot(toPoint, toC3);
            
            // Find which direction the point is closest to
            if (dot1 >= dot2 && dot1 >= dot3) {
                // Gap near circle 1
                currentC1 = gapCenter + toC1 * inscribedRadius * 1.2;
                currentC2 = currentC1;
                currentC3 = currentC1;
                currentR1 = inscribedRadius * 0.4;
                currentR2 = currentR1;
                currentR3 = currentR1;
                depth += 1.0;
            } else if (dot2 >= dot3) {
                // Gap near circle 2
                currentC1 = gapCenter + toC2 * inscribedRadius * 1.2;
                currentC2 = currentC1;
                currentC3 = currentC1;
                currentR1 = inscribedRadius * 0.4;
                currentR2 = currentR1;
                currentR3 = currentR1;
                depth += 2.0;
            } else {
                // Gap near circle 3
                currentC1 = gapCenter + toC3 * inscribedRadius * 1.2;
                currentC2 = currentC1;
                currentC3 = currentC1;
                currentR1 = inscribedRadius * 0.4;
                currentR2 = currentR1;
                currentR3 = currentR1;
                depth += 3.0;
            }
        }
    }
    
    // Return depth for coloring
    return depth * 10.0 + float(iterations) * 5.0;
}
`;

const fragmentShader = createFragmentShader(fractalFunction);

export function render(regl, params, canvas) {
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);
  
  const frag = createFragmentShader(fractalFunction);
  
  const drawFractal = regl({
    frag,
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

