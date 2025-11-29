import { generatePaletteTexture } from '../utils.js';

// Generate vertices for the Minkowski Sausage
function generateMinkowskiSausage(iterations) {
  // Start with a square (going counterclockwise from bottom-left)
  let vertices = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
    [-0.5, -0.5], // Close the square
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
        [
          p1[0] + ux * 3 * segmentLen + px * segmentLen,
          p1[1] + uy * 3 * segmentLen + py * segmentLen,
        ],
        // Turn in and go 1/4 perpendicular back
        [p1[0] + ux * 3 * segmentLen, p1[1] + uy * 3 * segmentLen],
        // Go final 1/4 forward to reach p2
        p2,
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
    float scale = 4.0 / uZoom;
    
    // Transform vertex position to match the standard fractal coordinate system
    // For line-based fractals, maintain aspect ratio correctly
    vec2 fractalCoord = position;
    vec2 relative = fractalCoord - uOffset;
    
    // Scale uniformly (same factor for x and y) to preserve shape
    vec2 scaled = vec2(
      relative.x / (scale * uXScale),
      relative.y / (scale * uYScale)
    );
    
    // Apply aspect ratio correction to maintain shape across different window sizes
    // Divide x by aspect to compensate for wider screens, preserving the curve's proportions
    scaled.x /= aspect;
    
    // Convert to clip space (-1 to 1) by multiplying by 2.0
    gl_Position = vec4(scaled * 2.0, 0.0, 1.0);
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
  // Generate palette texture for the current color scheme
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

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

/**
 * Configuration for Minkowski Sausage fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'vintage',
    iterations: 285,
  },
  initialPosition: {
    zoom: 3.02,
    offset: { x: 0.0044, y: 0.0381 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1 }, // Full overview
    { x: 0, y: 0.5, zoom: 3 }, // Top edge bulge
    { x: 0.5, y: 0, zoom: 3 }, // Right edge bulge
    { x: 0, y: -0.5, zoom: 3 }, // Bottom edge bulge
    { x: -0.5, y: 0, zoom: 3 }, // Left edge bulge
    { x: 0.4, y: 0.4, zoom: 5 }, // Top-right corner detail
    { x: -0.4, y: 0.4, zoom: 5 }, // Top-left corner detail
    { x: 0.4, y: -0.4, zoom: 5 }, // Bottom-right corner detail
    { x: -0.4, y: -0.4, zoom: 5 }, // Bottom-left corner detail
    { x: 0, y: 0, zoom: 2.5 }, // Medium zoom center
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};
