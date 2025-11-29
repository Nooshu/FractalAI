import { generatePaletteTexture } from '../utils.js';

// Generate vertices for the H-tree fractal
function generateHTree(iterations) {
  const segments = [];

  // Helper function to add an H at a given center with a given size
  function addH(cx, cy, size, depth) {
    if (depth >= iterations) return;

    const halfSize = size / 2;

    // Vertical lines on left and right
    const leftX = cx - halfSize;
    const rightX = cx + halfSize;
    const topY = cy + halfSize;
    const bottomY = cy - halfSize;

    // Add the three lines that make up the H:
    // Left vertical line
    segments.push({
      x1: leftX,
      y1: bottomY,
      x2: leftX,
      y2: topY,
    });

    // Horizontal middle line
    segments.push({
      x1: leftX,
      y1: cy,
      x2: rightX,
      y2: cy,
    });

    // Right vertical line
    segments.push({
      x1: rightX,
      y1: bottomY,
      x2: rightX,
      y2: topY,
    });

    // Recursively add smaller H's at the four corners
    const newSize = size / 2;

    // Top-left
    addH(leftX, topY, newSize, depth + 1);
    // Top-right
    addH(rightX, topY, newSize, depth + 1);
    // Bottom-left
    addH(leftX, bottomY, newSize, depth + 1);
    // Bottom-right
    addH(rightX, bottomY, newSize, depth + 1);
  }

  // Start with the root H at center with size 0.8
  addH(0, 0, 0.8, 0);

  // Convert segments to vertex array for line rendering
  const vertices = new Float32Array(segments.length * 4);
  let idx = 0;

  for (const seg of segments) {
    vertices[idx++] = seg.x1;
    vertices[idx++] = seg.y1;
    vertices[idx++] = seg.x2;
    vertices[idx++] = seg.y2;
  }

  return vertices;
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
    float t = fract(dist * 2.5);
    
    vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function render(regl, params, canvas) {
  // Generate palette texture for the current color scheme
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  // Calculate iteration level based on params.iterations
  // Map 0-200 iterations to 0-8 levels (H-tree gets very dense quickly)
  const iterationLevel = Math.max(0, Math.min(8, Math.floor(params.iterations / 25)));

  // Generate vertices for current iteration level
  const vertices = generateHTree(iterationLevel);

  const drawHTree = regl({
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
    primitive: 'lines',
    lineWidth: 1,
  });

  return drawHTree;
}

export const is2D = true;

/**
 * Configuration for H-Tree fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow-pastel',
  },
  initialPosition: {
    zoom: 2,
    offset: { x: 0.1054, y: 0.0943 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1 }, // Full overview
    { x: 0, y: 0, zoom: 2 }, // Center H
    { x: -0.2, y: 0.2, zoom: 3 }, // Top-left branch
    { x: 0.2, y: 0.2, zoom: 3 }, // Top-right branch
    { x: -0.2, y: -0.2, zoom: 3 }, // Bottom-left branch
    { x: 0.2, y: -0.2, zoom: 3 }, // Bottom-right branch
    { x: -0.3, y: 0.3, zoom: 5 }, // Deep into top-left
    { x: 0.3, y: 0.3, zoom: 5 }, // Deep into top-right
    { x: -0.15, y: 0.15, zoom: 7 }, // Very deep zoom
    { x: 0, y: 0, zoom: 1.5 }, // Medium zoom center
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};
