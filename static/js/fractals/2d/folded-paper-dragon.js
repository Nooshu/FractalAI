import {
  generatePaletteTexture
} from '../utils.js';

// Generate vertices for the Folded Paper Dragon curve
// This uses the paper-folding sequence: fold a strip of paper in half repeatedly
// The sequence of creases (left/right) determines the turn directions
function generateFoldedPaperDragon(iterations) {
  // Generate the paper-folding sequence
  // Start with an empty sequence (no folds)
  let sequence = [];

  // Build the sequence by repeatedly folding the paper
  // Each fold creates a crease pattern: existing sequence + 1 (right) + reverse of sequence with flipped signs
  for (let iter = 0; iter < iterations; iter++) {
    const newSequence = [...sequence];
    newSequence.push(1); // Add a right turn (crease) in the middle

    // Append the reverse of the sequence with signs flipped
    for (let i = sequence.length - 1; i >= 0; i--) {
      newSequence.push(-sequence[i]);
    }

    sequence = newSequence;
  }

  // Now convert the sequence to vertices
  // Starting position and direction
  let x = -0.5;
  let y = 0;
  let angle = 0; // Start facing right

  // Calculate step size to fit the curve in view
  // Optimized: replace Math.pow with explicit calculation
  const sqrt2 = 1.4142135623730951;
  let sqrt2Power = 1.0;
  for (let i = 0; i < iterations; i++) {
    sqrt2Power *= sqrt2;
  }
  const stepLength = 1.0 / sqrt2Power;

  const vertices = [];
  vertices.push(x, y);

  // Draw each segment based on the paper-folding sequence
  for (let i = 0; i < sequence.length; i++) {
    // Move forward
    x += Math.cos(angle) * stepLength;
    y += Math.sin(angle) * stepLength;
    vertices.push(x, y);

    // Turn based on the sequence value
    // 1 = turn right (clockwise), -1 = turn left (counter-clockwise)
    angle += (sequence[i] * Math.PI) / 2;
  }

  return new Float32Array(vertices);
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
      
      // Transform vertex position to match the standard fractal coordinate system
      // For line-based fractals, maintain aspect ratio correctly
      vec2 fractalCoord = position;
      vec2 relative = fractalCoord - uOffset;
      
      // Scale uniformly (same factor for x and y) to preserve shape
      vec2 scaled = vec2(
        relative.x / (scale * uScale.x),
        relative.y / (scale * uScale.y)
      );
      
      // Apply aspect ratio correction to maintain shape across different window sizes
      // Divide x by aspect to compensate for wider screens, preserving the curve's proportions
      scaled.x /= aspect;
      
      // Convert to clip space (-1 to 1) by multiplying by 2.0
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
      // Color based on position along the curve
      // Create interesting patterns with both distance and angle
      float dist = length(vPosition);
      float angle = atan(vPosition.y, vPosition.x);
      float t = fract(dist * 1.8 + angle * 0.3);
      
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
      // Color based on position along the curve
      // Create interesting patterns with both distance and angle
      float dist = length(vPosition);
      float angle = atan(vPosition.y, vPosition.x);
      float t = fract(dist * 1.8 + angle * 0.3);
      
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
  // Map 0-200 iterations to 0-15 levels
  // Paper-folding dragon doubles in complexity each iteration, so keep it reasonable
  const iterationLevel = Math.max(0, Math.min(15, Math.floor(params.iterations / 13)));

  // Generate vertices for current iteration level
  const vertices = generateFoldedPaperDragon(iterationLevel);

  // Create UBO-aware shaders
  const vertexShaderSource = createLineFractalVertexShader(useUBO);
  const fragmentShaderSource = createLineFractalFragmentShader(useUBO);

  const drawFoldedPaperDragon = regl({
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
    primitive: 'line strip',
    lineWidth: 1
});

  return drawFoldedPaperDragon;
}

export const is2D = true;

/**
 * Configuration for Folded Paper Dragon fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow-shifted'
},
  initialPosition: {
    zoom: 2,
    offset: { x: -0.3009, y: -0.2052 }
  },
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1
}
};
