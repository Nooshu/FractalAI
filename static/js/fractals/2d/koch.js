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
    varying vec2 vPosition;

    void main() {
      // Pass original position to fragment shader for coloring
      vPosition = position;
      
      // Start with the base vertex position
      vec2 pos = position;
      
      // Apply x/y scale
      pos.x *= scale2d.x;
      pos.y *= scale2d.y;
      
      // Apply zoom (higher zoom = more zoomed in)
      // For geometry, we need to scale UP to zoom in (opposite of coordinate space scaling)
      pos *= (zoom / 4.0);
      
      // Apply offset
      pos.x -= offset.x;
      pos.y -= offset.y;
      
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
    uniform int uColorScheme;
    varying vec2 vPosition;

    vec3 getColorScheme(float t, int scheme) {
        if (scheme == 1) { // fire
            return vec3(t, t * 0.5, 0.0);
        } else if (scheme == 2) { // ocean
            return vec3(0.0, t * 0.5, t);
        } else if (scheme == 3) { // rainbow
            float hue = mod(t * 360.0, 360.0) / 360.0;
            return vec3(0.5 + 0.5 * cos(hue * 6.28 + 0.0),
                       0.5 + 0.5 * cos(hue * 6.28 + 2.09),
                       0.5 + 0.5 * cos(hue * 6.28 + 4.18));
        } else if (scheme == 12) { // rainbow2 - pastel
            float hue = mod(t * 360.0, 360.0) / 360.0;
            float sat = 0.6;
            float light = 0.7;
            return vec3(light + sat * cos(hue * 6.28 + 0.0),
                       light + sat * cos(hue * 6.28 + 2.09),
                       light + sat * cos(hue * 6.28 + 4.18));
        } else if (scheme == 13) { // rainbow3 - dark
            float hue = mod(t * 360.0, 360.0) / 360.0;
            float sat = 1.0;
            float light = 0.3;
            return vec3(light + sat * cos(hue * 6.28 + 0.0),
                       light + sat * cos(hue * 6.28 + 2.09),
                       light + sat * cos(hue * 6.28 + 4.18));
        } else if (scheme == 14) { // rainbow4 - vibrant
            float hue = mod(t * 360.0, 360.0) / 360.0;
            float sat = 1.2;
            float light = 0.4;
            return vec3(clamp(light + sat * cos(hue * 6.28 + 0.0), 0.0, 1.0),
                       clamp(light + sat * cos(hue * 6.28 + 2.09), 0.0, 1.0),
                       clamp(light + sat * cos(hue * 6.28 + 4.18), 0.0, 1.0));
        } else if (scheme == 15) { // rainbow5 - double
            float hue = mod(t * 720.0, 360.0) / 360.0;
            return vec3(0.5 + 0.5 * cos(hue * 6.28 + 0.0),
                       0.5 + 0.5 * cos(hue * 6.28 + 2.09),
                       0.5 + 0.5 * cos(hue * 6.28 + 4.18));
        } else if (scheme == 16) { // rainbow6 - shifted
            float hue = mod(t * 360.0 + 60.0, 360.0) / 360.0;
            return vec3(0.5 + 0.5 * cos(hue * 6.28 + 0.0),
                       0.5 + 0.5 * cos(hue * 6.28 + 2.09),
                       0.5 + 0.5 * cos(hue * 6.28 + 4.18));
        } else if (scheme == 4) { // monochrome
            return vec3(t, t, t);
        } else if (scheme == 5) { // forest
            return vec3(t * 0.3, t * 0.8, t * 0.4);
        } else if (scheme == 6) { // sunset
            return vec3(t, t * 0.4, t * 0.2);
        } else if (scheme == 7) { // purple
            return vec3(t * 0.6, t * 0.3, t);
        } else if (scheme == 8) { // cyan
            return vec3(0.0, t, t);
        } else if (scheme == 9) { // gold
            return vec3(t, t * 0.8, t * 0.2);
        } else if (scheme == 10) { // ice
            return vec3(t * 0.7, t * 0.9, t);
        } else if (scheme == 11) { // neon
            float pulse = sin(t * 3.14159) * 0.5 + 0.5;
            return vec3(t * 0.2 + pulse * 0.8, t * 0.8 + pulse * 0.2, t);
        } else { // classic (scheme == 0)
            return vec3(t * 0.5, t, min(t * 1.5, 1.0));
        }
    }

    void main() {
      // Use position to create variation in color
      float t = length(vPosition) * 0.5 + 0.5;
      vec3 color = getColorScheme(t, uColorScheme);
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // Get color based on color scheme
  const colorSchemeIndex = getColorSchemeIndex(params.colorScheme);

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
      uColorScheme: colorSchemeIndex,
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