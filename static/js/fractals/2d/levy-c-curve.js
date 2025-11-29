import { generatePaletteTexture } from '../utils.js';

// Generate vertices for the Lévy C curve
// The Lévy C curve is constructed by replacing each line segment
// with two perpendicular segments forming a right angle (C shape)
function generateLevyCCurve(iterations) {
  if (iterations === 0) {
    // Base case: just a line from start to end
    return new Float32Array([-0.5, 0, 0.5, 0]);
  }

  const vertices = [];

  // Recursive function to generate the curve
  // Each segment is replaced by two perpendicular segments
  function levyC(x1, y1, x2, y2, depth) {
    if (depth >= iterations) {
      // At maximum depth, add the endpoint
      vertices.push(x2, y2);
      return;
    }

    // Calculate the midpoint and the perpendicular point
    // The two new segments form a right angle (C shape)
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Midpoint of the original segment
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    // Perpendicular vector (rotate 90 degrees)
    // For a right angle, we rotate the direction vector by 90 degrees
    const perpX = -dy / 2; // Perpendicular component
    const perpY = dx / 2;

    // The three points: start, corner (midpoint + perpendicular), end
    const cornerX = midX + perpX;
    const cornerY = midY + perpY;

    // Recursively generate the two segments
    levyC(x1, y1, cornerX, cornerY, depth + 1);
    levyC(cornerX, cornerY, x2, y2, depth + 1);
  }

  // Start from left, end at right
  vertices.push(-0.5, 0);
  levyC(-0.5, 0, 0.5, 0, 0);

  // Calculate bounding box and scale to fit
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  for (let i = 0; i < vertices.length; i += 2) {
    minX = Math.min(minX, vertices[i]);
    maxX = Math.max(maxX, vertices[i]);
    minY = Math.min(minY, vertices[i + 1]);
    maxY = Math.max(maxY, vertices[i + 1]);
  }

  // Calculate center and size
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;
  const maxSize = Math.max(width, height);

  // Scale to fit in a reasonable range and center at origin
  // Use a larger scale factor to make it clearly visible
  const scale = maxSize > 0 ? 3.0 / maxSize : 1.0;
  const scaledVertices = new Float32Array(vertices.length);
  for (let i = 0; i < vertices.length; i += 2) {
    scaledVertices[i] = (vertices[i] - centerX) * scale;
    scaledVertices[i + 1] = (vertices[i + 1] - centerY) * scale;
  }

  return scaledVertices;
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
    // Color based on position along the curve
    float dist = length(vPosition);
    float angle = atan(vPosition.y, vPosition.x);
    float t = fract(dist * 2.0 + angle * 0.3);
    
    vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function render(regl, params, canvas) {
  // Generate palette texture for the current color scheme
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  // Calculate iteration level based on params.iterations
  // Map 0-200 iterations to 0-12 levels
  const iterationLevel = Math.max(0, Math.min(12, Math.floor(params.iterations / 15)));

  // Generate vertices for current iteration level
  const vertices = generateLevyCCurve(iterationLevel);
  const vertexCount = vertices.length / 2;

  const drawLevyC = regl({
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
    count: vertexCount,
    primitive: 'line strip',
    lineWidth: 1,
  });

  return drawLevyC;
}

export const is2D = true;

/**
 * Configuration for Levy C-Curve fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow',
  },
  initialPosition: {
    zoom: 1.24,
    offset: { x: 0.0087, y: 0.1054 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1 }, // Full Lévy C curve view
    { x: 0, y: 0, zoom: 2 }, // Center detail
    { x: 0.2, y: 0.2, zoom: 3 }, // Upper right quadrant
    { x: -0.2, y: 0.2, zoom: 3 }, // Upper left quadrant
    { x: 0.2, y: -0.2, zoom: 3 }, // Lower right quadrant
    { x: -0.2, y: -0.2, zoom: 3 }, // Lower left quadrant
    { x: 0.15, y: 0.15, zoom: 4 }, // Deep zoom upper right
    { x: -0.15, y: 0.15, zoom: 4 }, // Deep zoom upper left
    { x: 0.15, y: -0.15, zoom: 4 }, // Deep zoom lower right
    { x: 0, y: 0, zoom: 1.5 }, // Medium zoom center
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};
