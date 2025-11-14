import { getColorSchemeIndex } from '../utils.js';

/**
 * Generates the vertices for a Koch Snowflake.
 * @param {number} iterations - The number of fractal iterations (0-6 recommended)
 * @returns {Array<[number, number]>} - Array of [x, y] vertex coordinates
 */
function generateKochSnowflake(iterations) {
  // Start with a base equilateral triangle, centered at [0, 0]
  const h = 0.75; // Total height of the base triangle
  const w = h * (Math.sqrt(3) / 2); // Half-width

  let vertices = [
    [0, h * (2 / 3)],        // Top point
    [-w, -h * (1 / 3)],      // Bottom-left point
    [w, -h * (1 / 3)],       // Bottom-right point
  ];

  const SQRT3_OVER_2 = Math.sqrt(3) / 2;

  // Iteratively apply the Koch fractal rule
  for (let i = 0; i < iterations; i++) {
    let newVertices = [];

    // Process each line segment
    for (let j = 0; j < vertices.length; j++) {
      const a = vertices[j];
      const b = vertices[(j + 1) % vertices.length];

      // Keep the starting point
      newVertices.push(a);

      // Calculate the 3 new points that replace the middle third
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];

      // Two points along the original line segment
      const p1 = [a[0] + dx / 3, a[1] + dy / 3];
      const p2 = [a[0] + dx * (2 / 3), a[1] + dy * (2 / 3)];

      // The "tip" of the new equilateral triangle
      const v_dx = p2[0] - p1[0];
      const v_dy = p2[1] - p1[1];

      // Apply 60° rotation
      const qx = p1[0] + v_dx * 0.5 - v_dy * SQRT3_OVER_2;
      const qy = p1[1] + v_dx * SQRT3_OVER_2 + v_dy * 0.5;
      const q = [qx, qy];

      // Add the three new points
      newVertices.push(p1, q, p2);
    }

    vertices = newVertices;
  }

  return vertices;
}

export function render(regl, params, canvas) {
  // Generate vertices based on iteration count (clamp to reasonable range)
  const iterations = Math.max(0, Math.min(6, Math.floor(params.iterations / 30)));
  const vertices = generateKochSnowflake(iterations);

  // Convert to flat array for WebGL
  const positions = [];
  for (const [x, y] of vertices) {
    positions.push(x, y);
  }

  // Shaders
  const vertexShader = `
    precision mediump float;
    attribute vec2 position;
    uniform float zoom;
    uniform vec2 offset;
    uniform float aspectRatio;
    uniform vec2 scale2d;

    void main() {
      // Apply zoom and offset
      vec2 pos = position / zoom - offset;
      
      // Apply x/y scale
      pos.x *= scale2d.x;
      pos.y *= scale2d.y;
      
      // Apply aspect ratio correction
      if (aspectRatio > 1.0) {
        pos.x /= aspectRatio;
      } else {
        pos.y *= aspectRatio;
      }
      
      // Scale down slightly for padding
      pos *= 0.9;
      
      gl_Position = vec4(pos, 0, 1);
    }
  `;

  const fragmentShader = `
    precision mediump float;
    uniform vec3 color;

    void main() {
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // Get color based on color scheme
  const colorSchemeIndex = getColorSchemeIndex(params.colorScheme);
  let color = [0.9, 1.0, 1.0]; // Default: light cyan
  
  // Map color schemes to RGB values
  const colorSchemes = {
    0: [0.5, 1.0, 1.5],   // classic (blue-cyan)
    1: [1.0, 0.5, 0.0],   // fire (orange-red)
    2: [0.0, 0.5, 1.0],   // ocean (blue)
    3: [1.0, 0.5, 1.0],   // rainbow (pink)
    4: [0.8, 0.8, 0.8],   // monochrome (grey)
    5: [0.3, 0.8, 0.4],   // forest (green)
    6: [1.0, 0.4, 0.2],   // sunset (orange)
    7: [0.6, 0.3, 1.0],   // purple
    8: [0.0, 1.0, 1.0],   // cyan
    9: [1.0, 0.8, 0.2],   // gold
    10: [0.7, 0.9, 1.0],  // ice (light blue)
    11: [1.0, 0.0, 1.0],  // neon (magenta)
  };
  
  if (colorSchemes[colorSchemeIndex]) {
    color = colorSchemes[colorSchemeIndex];
  }

  // Create the draw command
  const drawFractal = regl({
    vert: vertexShader,
    frag: fragmentShader,

    attributes: {
      position: regl.buffer(positions),
    },

    uniforms: {
      zoom: params.zoom,
      offset: [params.offset.x, params.offset.y],
      aspectRatio: canvas.width / canvas.height,
      scale2d: [params.xScale, params.yScale],
      color: color,
    },

    primitive: 'line loop',
    count: vertices.length,
    
    lineWidth: 1, // WebGL only supports 1 on most systems

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