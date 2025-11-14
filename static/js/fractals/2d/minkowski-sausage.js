import regl from 'regl';

// Generate vertices for the Minkowski Sausage
function generateMinkowskiSausage(iterations) {
  // Start with a square (going counterclockwise from bottom-left)
  let vertices = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
    [-0.5, -0.5] // Close the square
  ];

  // Apply Minkowski transformation for each iteration
  for (let iter = 0; iter < iterations; iter++) {
    const newVertices = [];
    
    for (let i = 0; i < vertices.length - 1; i++) {
      const p1 = vertices[i];
      const p2 = vertices[i + 1];
      
      // Calculate direction and perpendicular vectors
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const len = Math.sqrt(dx * dx + dy * dy);
      
      // Normalized direction
      const ux = dx / len;
      const uy = dy / len;
      
      // Perpendicular (rotate 90 degrees counterclockwise for outward bump)
      const px = -uy;
      const py = ux;
      
      // Divide segment into 4 parts
      const segmentLen = len / 4;
      
      // Minkowski sausage: creates a rectangular protrusion
      // Pattern: 1/4 forward, 1/4 out, 1/2 forward, 1/4 in, 1/4 forward
      const points = [
        p1,
        // Go 1/4 forward
        [p1[0] + ux * segmentLen, p1[1] + uy * segmentLen],
        // Turn out and go 1/4 perpendicular
        [p1[0] + ux * segmentLen + px * segmentLen, p1[1] + uy * segmentLen + py * segmentLen],
        // Go 1/2 forward (2 segments)
        [p1[0] + ux * 3 * segmentLen + px * segmentLen, p1[1] + uy * 3 * segmentLen + py * segmentLen],
        // Turn in and go 1/4 perpendicular back
        [p1[0] + ux * 3 * segmentLen, p1[1] + uy * 3 * segmentLen],
        // Go final 1/4 forward to reach p2
        p2
      ];
      
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
    
    // Apply zoom and offset
    vec2 transformed = position;
    transformed *= 4.0 / uZoom;
    transformed.x *= aspect * uXScale;
    transformed.y *= uYScale;
    transformed += uOffset;
    
    // Map back to clip space
    vec2 clipSpace = transformed / 2.0;
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
    float t = fract(dist * 4.0);
    
    vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function render(regl, params, canvas) {
  // Generate palette texture
  const paletteData = new Uint8Array(256 * 3);
  const scheme = params.colorScheme || 'classic';
  
  // Generate palette based on color scheme
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    if (scheme === 'classic') {
      paletteData[i * 3] = Math.floor(Math.sin(t * Math.PI * 2) * 127 + 128);
      paletteData[i * 3 + 1] = Math.floor(Math.sin(t * Math.PI * 2 + Math.PI / 2) * 127 + 128);
      paletteData[i * 3 + 2] = Math.floor(Math.sin(t * Math.PI * 2 + Math.PI) * 127 + 128);
    } else if (scheme === 'fire') {
      paletteData[i * 3] = Math.floor(t * 255);
      paletteData[i * 3 + 1] = Math.floor(t * t * 255);
      paletteData[i * 3 + 2] = Math.floor(t * t * t * 128);
    } else if (scheme === 'ocean') {
      paletteData[i * 3] = Math.floor(t * 128);
      paletteData[i * 3 + 1] = Math.floor(t * 200);
      paletteData[i * 3 + 2] = Math.floor(200 + t * 55);
    } else {
      // Default rainbow
      paletteData[i * 3] = Math.floor(Math.sin(t * Math.PI * 2) * 127 + 128);
      paletteData[i * 3 + 1] = Math.floor(Math.sin(t * Math.PI * 2 + 2) * 127 + 128);
      paletteData[i * 3 + 2] = Math.floor(Math.sin(t * Math.PI * 2 + 4) * 127 + 128);
    }
  }

  const paletteTexture = regl.texture({
    data: paletteData,
    width: 256,
    height: 1,
    format: 'rgb',
    wrap: 'repeat',
  });

  // Calculate iteration level based on params.iterations
  // Map 0-200 iterations to 0-6 levels
  const iterationLevel = Math.max(0, Math.min(6, Math.floor(params.iterations / 30)));
  
  // Generate vertices for current iteration level
  const vertices = generateMinkowskiSausage(iterationLevel);

  const drawMinkowski = regl({
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

  return drawMinkowski;
}

export const is2D = true;

