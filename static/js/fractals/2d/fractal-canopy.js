import {
  generatePaletteTexture
} from '../utils.js';

// Generate vertices for fractal canopy pattern
// Creates a tree-like canopy structure with branching patterns
function generateFractalCanopy(iterations, branchAngle, spreadAngle, lengthRatio) {
  const segments = [];

  // Recursive function to generate canopy branches
  function generateCanopyBranch(x, y, angle, length, depth) {
    if (depth >= iterations || length < 0.001) return;

    // Calculate end point of current branch
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;

    // Add vertices for this branch
    segments.push({
      x1: x,
      y1: y,
      x2: endX,
      y2: endY
});

    // Calculate new length for child branches
    const newLength = length * lengthRatio;

    // Create multiple branches for canopy effect
    // Main branch continues upward
    generateCanopyBranch(endX, endY, angle, newLength, depth + 1);

    // Left branches
    generateCanopyBranch(endX, endY, angle - branchAngle, newLength, depth + 1);
    generateCanopyBranch(endX, endY, angle - spreadAngle, newLength * 0.8, depth + 1);

    // Right branches
    generateCanopyBranch(endX, endY, angle + branchAngle, newLength, depth + 1);
    generateCanopyBranch(endX, endY, angle + spreadAngle, newLength * 0.8, depth + 1);
  }

  // Start from the base, pointing up
  const initialLength = 0.5;
  const initialAngle = Math.PI / 2; // Pointing up (90 degrees)
  generateCanopyBranch(0, -0.7, initialAngle, initialLength, 0);

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
  // Map 0-200 iterations to 0-8 levels (canopy can be dense)
  const iterationLevel = Math.max(0, Math.min(8, Math.floor(params.iterations / 25)));

  // Use uXScale to control branch angle (20-50 degrees)
  const branchAngle = (20 + params.xScale * 30) * (Math.PI / 180.0);

  // Use uYScale to control spread angle (30-60 degrees)
  const spreadAngle = (30 + params.yScale * 30) * (Math.PI / 180.0);

  // Length ratio for canopy (0.6-0.85)
  const lengthRatio = 0.6 + params.yScale * 0.25;

  // Generate vertices for current iteration level
  const vertices = generateFractalCanopy(iterationLevel, branchAngle, spreadAngle, lengthRatio);

  // Create UBO-aware shaders
  const vertexShaderSource = createLineFractalVertexShader(useUBO);
  const fragmentShaderSource = createLineFractalFragmentShader(useUBO);

  const drawCanopy = regl({
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

  return drawCanopy;
}

export const is2D = true;

/**
 * Configuration for Fractal Canopy
 */
export const config = {
  initialSettings: {
    colorScheme: 'autumn'
},
  initialPosition: {
    zoom: 2,
    offset: { x: 0, y: 0 }
  },
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 2
},
  // Interesting bounds for "surprise me" - Fractal canopy is always interesting
  interestingBounds: {
    offsetX: [-1, 1],
    offsetY: [-1, 1],
    zoom: [0.5, 10],
  }
};

