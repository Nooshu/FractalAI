import { generatePaletteTexture } from '../utils.js';

// Generate vertices for the generalized H-tree fractal with rotation and scaling
function generateGeneralizedHTree(iterations, rotationFactor, scaleFactor) {
  const segments = [];

  // rotationFactor: 0.0 = no rotation (classic H-tree), 1.0 = 45 degrees, 2.0 = 90 degrees
  // scaleFactor: controls size reduction at each level (0.3 to 0.6 typically)

  const rotationAngle = (rotationFactor * Math.PI) / 4; // 0 to 90 degrees (or more)

  // Helper function to add a generalized H at a given center with rotation
  function addH(cx, cy, size, rotation, depth) {
    if (depth >= iterations) return;

    const halfSize = size / 2;

    // Calculate rotated positions for the H
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    // The H consists of:
    // - Two vertical lines (left and right)
    // - One horizontal line connecting them

    // In local coordinates (before rotation):
    // Left line: from (-halfSize, -halfSize) to (-halfSize, +halfSize)
    // Right line: from (+halfSize, -halfSize) to (+halfSize, +halfSize)
    // Middle line: from (-halfSize, 0) to (+halfSize, 0)

    // Apply rotation to each point
    const leftX = -halfSize;
    const rightX = halfSize;
    const topY = halfSize;
    const bottomY = -halfSize;
    const midY = 0;

    // Rotate and translate each point
    function transform(x, y) {
      return {
        x: cx + x * cos - y * sin,
        y: cy + x * sin + y * cos,
      };
    }

    const leftTop = transform(leftX, topY);
    const leftBottom = transform(leftX, bottomY);
    const rightTop = transform(rightX, topY);
    const rightBottom = transform(rightX, bottomY);
    const leftMid = transform(leftX, midY);
    const rightMid = transform(rightX, midY);

    // Add the three lines that make up the H:
    // Left vertical line
    segments.push({
      x1: leftBottom.x,
      y1: leftBottom.y,
      x2: leftTop.x,
      y2: leftTop.y,
    });

    // Horizontal middle line
    segments.push({
      x1: leftMid.x,
      y1: leftMid.y,
      x2: rightMid.x,
      y2: rightMid.y,
    });

    // Right vertical line
    segments.push({
      x1: rightBottom.x,
      y1: rightBottom.y,
      x2: rightTop.x,
      y2: rightTop.y,
    });

    // Recursively add smaller H's at the four corners with additional rotation
    const newSize = size * scaleFactor;
    const newRotation = rotation + rotationAngle;

    // Top-left
    addH(leftTop.x, leftTop.y, newSize, newRotation, depth + 1);
    // Top-right
    addH(rightTop.x, rightTop.y, newSize, newRotation, depth + 1);
    // Bottom-left
    addH(leftBottom.x, leftBottom.y, newSize, newRotation, depth + 1);
    // Bottom-right
    addH(rightBottom.x, rightBottom.y, newSize, newRotation, depth + 1);
  }

  // Start with the root H at center with no initial rotation
  addH(0, 0, 0.8, 0, 0);

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
  uniform float uXScale;
  varying vec2 vPosition;

  void main() {
    // Color based on distance from origin and rotation factor for visual interest
    float dist = length(vPosition);
    float angle = atan(vPosition.y, vPosition.x);
    
    // Combine distance and rotation for interesting patterns
    float t = fract(dist * 2.5 + angle * uXScale * 0.3);
    
    vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function render(regl, params, canvas) {
  // Generate palette texture for the current color scheme
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  // Calculate iteration level based on params.iterations
  const iterationLevel = Math.max(0, Math.min(8, Math.floor(params.iterations / 25)));

  // Map xScale (0-2) to rotation factor:
  // 0.0 = no rotation (classic H-tree)
  // 1.0 = 45 degrees rotation per level
  // 2.0 = 90 degrees rotation per level
  const rotationFactor = params.xScale;

  // Map yScale (0-2) to scaling factor:
  // 0.5 = small children (0.35 size)
  // 1.0 = medium children (0.5 size - classic H-tree)
  // 1.5+ = large children (0.6+ size)
  const scaleFactor = 0.3 + params.yScale * 0.15; // 0.3 to 0.6

  // Generate vertices for current parameters
  const vertices = generateGeneralizedHTree(iterationLevel, rotationFactor, scaleFactor);

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
 * Configuration for H-Tree Generalized fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'electric',
  },
  initialPosition: {
    zoom: 2,
    offset: { x: 0.0928, y: 0.0537 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1 }, // Full overview
    { x: 0, y: 0, zoom: 2 }, // Center detail
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
