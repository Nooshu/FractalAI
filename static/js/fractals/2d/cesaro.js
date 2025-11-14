import regl from 'regl';
import { generatePaletteTexture } from '../utils.js';

// Generate vertices for the Cesàro fractal
function generateCesaro(iterations, angle = 85) {
  // Start with a square (going counterclockwise from bottom-left)
  let vertices = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
    [-0.5, -0.5] // Close the square
  ];

  // Convert angle to radians
  const angleRad = (angle * Math.PI) / 180;

  // Apply Cesàro transformation for each iteration
  for (let iter = 0; iter < iterations; iter++) {
    const newVertices = [];
    
    for (let i = 0; i < vertices.length - 1; i++) {
      const p1 = vertices[i];
      const p2 = vertices[i + 1];
      
      // Calculate direction vector
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const len = Math.sqrt(dx * dx + dy * dy);
      
      // Normalized direction
      const ux = dx / len;
      const uy = dy / len;
      
      // Cesàro fractal: divide into 4 equal parts
      // Pattern: forward, turn left by angle, forward, turn right by 2*angle, forward, turn left by angle, forward
      const segmentLen = len / 4;
      
      // Point 1: Start
      const pt1 = p1;
      
      // Point 2: Go forward 1/4
      const pt2 = [
        p1[0] + ux * segmentLen,
        p1[1] + uy * segmentLen
      ];
      
      // Point 3: Turn left by angle and go forward 1/4
      const dir1x = ux * Math.cos(angleRad) - uy * Math.sin(angleRad);
      const dir1y = ux * Math.sin(angleRad) + uy * Math.cos(angleRad);
      const pt3 = [
        pt2[0] + dir1x * segmentLen,
        pt2[1] + dir1y * segmentLen
      ];
      
      // Point 4: Turn right by 2*angle (so net angle is -angle from original) and go forward 1/4
      const dir2x = ux * Math.cos(-angleRad) - uy * Math.sin(-angleRad);
      const dir2y = ux * Math.sin(-angleRad) + uy * Math.cos(-angleRad);
      const pt4 = [
        pt3[0] + dir2x * segmentLen,
        pt3[1] + dir2y * segmentLen
      ];
      
      // Point 5: Turn left by angle (back to original direction) and go forward 1/4 to reach p2
      // This should automatically be p2 if our math is correct
      
      const points = [pt1, pt2, pt3, pt4, p2];
      
      // Add all points except the last (it will be the first point of the next segment)
      for (let j = 0; j < points.length - 1; j++) {
        newVertices.push(points[j]);
      }
    }
    
    // Close the curve by adding the first point
    newVertices.push(newVertices[0]);
    vertices = newVertices;
  }

  // Flatten to Float32Array
  const flatVertices = new Float32Array(vertices.length * 2);
  for (let i = 0; i < vertices.length; i++) {
    flatVertices[i * 2] = vertices[i][0];
    flatVertices[i * 2 + 1] = vertices[i][1];
  }

  return flatVertices;
}

const vertexShader = `
  precision mediump float;
  attribute vec2 position;
  uniform float uZoom;
  uniform vec2 uOffset;
  uniform vec2 uResolution;
  uniform float uXScale;
  uniform float uYScale;
  varying vec2 vPosition;

  void main() {
    float aspect = uResolution.x / uResolution.y;
    float scale = 4.0 / uZoom;
    
    // Transform vertex position to match the standard fractal coordinate system
    // Fragment shader: c = (uv - 0.5) * scale * aspect * xScale + offset
    // So for vertices in fractal coordinate space 'c', we need to convert to clip space:
    // 1. Subtract offset to get relative position
    vec2 fractalCoord = position;
    vec2 relative = fractalCoord - uOffset;
    
    // 2. Convert to UV space (inverse of fragment shader transformation)
    vec2 uv = vec2(
      relative.x / (scale * aspect * uXScale) + 0.5,
      relative.y / (scale * uYScale) + 0.5
    );
    
    // 3. Convert UV (0-1) to clip space (-1 to 1)
    vec2 clipSpace = (uv - 0.5) * 2.0;
    
    // 4. The fragment shader's aspect is already in the x coordinate,
    //    so we need to divide by aspect to get proper clip space
    clipSpace.x /= aspect;
    
    gl_Position = vec4(clipSpace, 0.0, 1.0);
    vPosition = position;
  }
`;

const fragmentShader = `
  precision mediump float;
  uniform sampler2D uPalette;
  uniform float uIterations;
  varying vec2 vPosition;

  void main() {
    // Color based on distance from origin for visual interest
    float dist = length(vPosition);
    float t = fract(dist * 3.5);
    
    vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function render(regl, params, canvas) {
  // Generate palette texture for the current color scheme
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  // Calculate iteration level based on params.iterations
  // Map 0-200 iterations to 0-6 levels
  const iterationLevel = Math.max(0, Math.min(6, Math.floor(params.iterations / 30)));
  
  // Use xScale to control the angle (map 0.5-1.5 to 60-100 degrees)
  const angle = 60 + (params.xScale - 0.5) * 40; // Default at 1.0 gives 80°
  
  // Generate vertices for current iteration level
  const vertices = generateCesaro(iterationLevel, angle);

  const drawCesaro = regl({
    vert: vertexShader,
    frag: fragmentShader,
    attributes: {
      position: vertices,
    },
    uniforms: {
      uZoom: params.zoom,
      uOffset: [params.offset.x, params.offset.y],
      uResolution: [canvas.width, canvas.height],
      uPalette: paletteTexture,
      uIterations: params.iterations,
      uXScale: params.xScale,
      uYScale: params.yScale,
    },
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    },
    count: vertices.length / 2,
    primitive: 'line strip',
    lineWidth: 1,
  });

  return drawCesaro;
}

export const is2D = true;

