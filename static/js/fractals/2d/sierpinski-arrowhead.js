import { getColorSchemeIndex } from '../utils.js';

// Buffer cache for reuse
let cachedBuffer = null;
let cachedVertexCount = 0;

/**
 * Generates the vertices for a Sierpinski Arrowhead Curve.
 * @param {number} iterations - The number of fractal iterations (0-7 recommended)
 * @returns {Float32Array} - Flat array of vertex coordinates [x, y, x, y, ...]
 */
function generateSierpinskiArrowhead(iterations) {
  // For Sierpinski arrowhead: 3^n vertices
  const numSegments = Math.pow(3, iterations);
  const vertices = new Float32Array((numSegments + 1) * 2);
  
  // Starting position (bottom left of triangle)
  let x = -0.5;
  let y = -0.289;
  let angle = Math.PI / 3; // 60 degrees - pointing up-right
  
  // Step length
  const stepLength = 1.0 / Math.pow(2, iterations);
  
  // Set starting vertex
  vertices[0] = x;
  vertices[1] = y;
  
  // Generate curve using the Sierpinski arrowhead turn sequence
  // The sequence is based on counting 1's in ternary representation
  const turnAngle = Math.PI / 3; // 60 degrees
  
  for (let i = 0; i < numSegments; i++) {
    // Move forward
    x += Math.cos(angle) * stepLength;
    y += Math.sin(angle) * stepLength;
    
    // Store vertex
    vertices[(i + 1) * 2] = x;
    vertices[(i + 1) * 2 + 1] = y;
    
    // Calculate turn based on ternary representation of (i+1)
    // Count the number of 1's in ternary digits
    let idx = i + 1;
    let oneCount = 0;
    
    while (idx > 0) {
      const digit = idx % 3;
      if (digit === 1) {
        oneCount++;
      }
      idx = Math.floor(idx / 3);
    }
    
    // Apply turn based on parity
    // If oneCount is odd, turn right (+60°)
    // If oneCount is even, turn left (-60°)
    if (oneCount % 2 === 1) {
      angle += turnAngle; // Turn right
    } else {
      angle -= turnAngle; // Turn left
    }
  }
  
  return vertices;
}

export function render(regl, params, canvas) {
  // Generate vertices based on iteration count (clamp to reasonable range)
  const iterations = Math.max(1, Math.min(7, Math.floor(params.iterations / 20)));
  const positions = generateSierpinskiArrowhead(iterations);
  const vertexCount = positions.length / 2;

  // Reuse buffer if possible, otherwise create new one
  if (!cachedBuffer || cachedVertexCount !== vertexCount) {
    if (cachedBuffer) {
      cachedBuffer.destroy();
    }
    cachedBuffer = regl.buffer(positions);
    cachedVertexCount = vertexCount;
  } else {
    // Buffer exists with same size, just update the data
    cachedBuffer.subdata(positions);
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
      position: cachedBuffer,
    },

    uniforms: {
      zoom: params.zoom,
      offset: [params.offset.x, params.offset.y],
      aspectRatio: canvas.width / canvas.height,
      scale2d: [params.xScale, params.yScale],
      uColorScheme: colorSchemeIndex,
    },

    primitive: 'line strip',
    count: vertexCount,

    lineWidth: 1, // WebGL only supports 1 on most systems

    depth: {
      enable: false,
    },

    blend: {
      enable: false,
    },

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
