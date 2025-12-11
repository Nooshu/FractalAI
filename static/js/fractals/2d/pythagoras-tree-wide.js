import {
  generatePaletteTexture
} from '../utils.js';

// Generate vertices for the Pythagoras tree fractal with wider spread
function generatePythagorasTreeWide(iterations, angle) {
  const segments = [];

  // Helper function to add a square and its two child squares
  function addSquare(cx, cy, size, rotation, depth) {
    if (depth >= iterations) return;

    // Calculate square vertices
    const halfSize = size / 2;
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);

    // Square corners relative to center
    const corners = [
      [-halfSize, -halfSize],
      [halfSize, -halfSize],
      [halfSize, halfSize],
      [-halfSize, halfSize],
    ];

    // Rotate and translate corners
    const worldCorners = corners.map(([x, y]) => {
      const rx = x * cosR - y * sinR;
      const ry = x * sinR + y * cosR;
      return [cx + rx, cy + ry];
    });

    // Add square edges (4 lines forming a square)
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      segments.push({
        x1: worldCorners[i][0],
        y1: worldCorners[i][1],
        x2: worldCorners[next][0],
        y2: worldCorners[next][1]
});
    }

    // Calculate child squares (Pythagoras tree)
    // The tree is built on top of the square
    // Two smaller squares are placed on adjacent sides forming a right triangle

    // Top-right corner of the square
    const topRightX = worldCorners[1][0];
    const topRightY = worldCorners[1][1];

    // Top-left corner of the square
    const topLeftX = worldCorners[0][0];
    const topLeftY = worldCorners[0][1];

    // Calculate the right triangle on top
    // The hypotenuse is the top edge of the square
    const dx = topRightX - topLeftX;
    const dy = topRightY - topLeftY;
    const topEdgeLength = Math.sqrt(dx * dx + dy * dy);

    // Use angle parameter to control the tree shape
    // For wide variant, use narrower rotation angles (30 degrees) which creates a wider overall tree
    // and adjust positioning for tighter clustering which makes the tree appear wider
    const childSize1 = topEdgeLength * angle;
    const childSize2 = topEdgeLength * (1.0 - angle);

    // Calculate positions for child squares
    // For wide variant, bring squares closer together to create wider tree shape
    const clusterFactor = 0.8; // Bring squares closer together
    const child1CenterX = topLeftX + (dx * angle * clusterFactor);
    const child1CenterY = topLeftY + (dy * angle * clusterFactor);
    const child1Rotation = rotation + Math.PI / 6; // 30 degrees (creates wider tree)

    // Second child square (right side of triangle)
    const child2CenterX = topRightX - (dx * (1.0 - angle) * clusterFactor);
    const child2CenterY = topRightY - (dy * (1.0 - angle) * clusterFactor);
    const child2Rotation = rotation - Math.PI / 6; // -30 degrees (creates wider tree)

    // Recursively add child squares
    addSquare(child1CenterX, child1CenterY, childSize1, child1Rotation, depth + 1);
    addSquare(child2CenterX, child2CenterY, childSize2, child2Rotation, depth + 1);
  }

  // Start with base square at bottom center
  const baseSize = 0.3;
  const baseX = 0;
  const baseY = -0.5;
  addSquare(baseX, baseY, baseSize, 0, 0);

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

// Helper function to create UBO-aware vertex shader for line-based fractals
function createLineFractalVertexShader(useUBO) {
  if (useUBO) {
    return `#version 300 es
    precision mediump float;
    in vec2 position;
    uniform float uZoom;
    uniform vec2 uOffset;
    uniform vec2 uResolution;
    uniform vec2 uScale; // xScale, yScale
    out vec2 vPosition;

    void main() {
      float aspect = uResolution.x / uResolution.y;
      float scale = 4.0 / uZoom;

      vec2 fractalCoord = position;
      vec2 relative = fractalCoord - uOffset;

      vec2 scaled = vec2(
        relative.x / (scale * uScale.x),
        relative.y / (scale * uScale.y)
      );

      scaled.x /= aspect;

      gl_Position = vec4(scaled * 2.0, 0.0, 1.0);
      vPosition = position;
    }`;
  }

  return `
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

      vec2 fractalCoord = position;
      vec2 relative = fractalCoord - uOffset;

      vec2 scaled = vec2(
        relative.x / (scale * uXScale),
        relative.y / (scale * uYScale)
      );

      scaled.x /= aspect;

      gl_Position = vec4(scaled * 2.0, 0.0, 1.0);
      vPosition = position;
    }
  `;
}

// Helper function to create UBO-aware fragment shader for line-based fractals
function createLineFractalFragmentShader(useUBO) {
  if (useUBO) {
    return `#version 300 es
    precision mediump float;
    uniform sampler2D uPalette;
    uniform float uIterations;
    in vec2 vPosition;
    out vec4 fragColor;

    void main() {
      float dist = length(vPosition);
      float t = fract(dist * 2.5);

      vec3 color = texture(uPalette, vec2(t, 0.5)).rgb;
      fragColor = vec4(color, 1.0);
    }`;
  }

  return `
    precision mediump float;
    uniform sampler2D uPalette;
    uniform float uIterations;
    varying vec2 vPosition;

    void main() {
      float dist = length(vPosition);
      float t = fract(dist * 2.5);

      vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
      gl_FragColor = vec4(color, 1.0);
    }
  `;
}

export function render(regl, params, canvas, options = {}) {
  // Check if UBOs should be used (WebGL2 optimization)
  const webglCapabilities = options.webglCapabilities;
  const ubo = options.ubo;
  const useUBO = webglCapabilities?.isWebGL2 && ubo;

  // Generate palette texture for the current color scheme
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  // Calculate iteration level based on params.iterations
  // Map 0-200 iterations to 0-10 levels
  const iterationLevel = Math.max(0, Math.min(10, Math.floor(params.iterations / 20)));

  // Use uXScale to control the angle/ratio of child squares
  // For wide variant, use a more extreme ratio (one square much larger)
  // 0.0 = 0.2, 1.0 = 0.8 (wider range, more asymmetric)
  const angle = 0.2 + params.xScale * 0.6;

  // Generate vertices for current iteration level
  const vertices = generatePythagorasTreeWide(iterationLevel, angle);

  // Create UBO-aware shaders
  const vertexShaderSource = createLineFractalVertexShader(useUBO);
  const fragmentShaderSource = createLineFractalFragmentShader(useUBO);

  const drawPythagorasTree = regl({
    vert: vertexShaderSource,
    frag: fragmentShaderSource,
    attributes: {
      position: vertices
},
    uniforms: useUBO
      ? {
          uZoom: params.zoom,
          uOffset: [params.offset.x, params.offset.y],
          uResolution: [canvas.width, canvas.height],
          uPalette: paletteTexture,
          uIterations: params.iterations,
          uScale: [params.xScale, params.yScale]
}
      : {
          uZoom: params.zoom,
          uOffset: [params.offset.x, params.offset.y],
          uResolution: [canvas.width, canvas.height],
          uPalette: paletteTexture,
          uIterations: params.iterations,
          uXScale: params.xScale,
          uYScale: params.yScale
},
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height
},
    count: vertices.length / 2,
    primitive: 'lines',
    lineWidth: 1
});

  return drawPythagorasTree;
}

export const is2D = true;

/**
 * Configuration for Pythagoras Tree (Wide) fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'neon'
},
  initialPosition: {
    zoom: 6.516,
    offset: { x: 0.0568, y: -0.5476 }
  },
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 2
},
  // Interesting bounds for "surprise me" - Pythagoras tree wide is always interesting
  interestingBounds: {
    offsetX: [-1, 1],
    offsetY: [-1, 1],
    zoom: [0.5, 10],
  }
};
