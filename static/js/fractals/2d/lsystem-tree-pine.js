import {
  generatePaletteTexture
} from '../utils.js';

// Generate vertices for pine tree using L-system
// Pine tree L-system: narrow, upward-pointing structure
function generatePineTreeLSystem(iterations, angle = 20) {
  const angleRad = (angle * Math.PI) / 180;
  const segments = [];

  // L-system rules for pine tree
  // Axiom: F
  // Rules: F → F[+F]F[-F] (simpler branching than oak)
  let lsystemString = 'F';

  // Iteratively apply the rules
  for (let i = 0; i < iterations; i++) {
    let newString = '';
    for (let j = 0; j < lsystemString.length; j++) {
      const char = lsystemString[j];
      switch (char) {
        case 'F':
          newString += 'F[+F]F[-F]';
          break;
        default:
          newString += char;
          break;
      }
    }
    lsystemString = newString;
  }

  // Interpret the L-system string to generate vertices
  const stack = [];
  let x = 0;
  let y = -0.8;
  let currentAngle = Math.PI / 2; // Start facing up
  const stepLength = 0.2;

  // Process each character in the L-system string
  for (let i = 0; i < lsystemString.length; i++) {
    const char = lsystemString[i];

    switch (char) {
      case 'F': {
        // Move forward and draw line
        const newX = x + Math.cos(currentAngle) * stepLength;
        const newY = y + Math.sin(currentAngle) * stepLength;
        segments.push({
          x1: x,
          y1: y,
          x2: newX,
          y2: newY
});
        x = newX;
        y = newY;
        break;
      }
      case '+':
        // Turn right (clockwise)
        currentAngle += angleRad;
        break;
      case '-':
        // Turn left (counter-clockwise)
        currentAngle -= angleRad;
        break;
      case '[':
        // Save current state (push onto stack)
        stack.push({ x, y, angle: currentAngle });
        break;
      case ']':
        // Restore previous state (pop from stack)
        if (stack.length > 0) {
          const state = stack.pop();
          x = state.x;
          y = state.y;
          currentAngle = state.angle;
        }
        break;
    }
  }

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
  // Map 0-200 iterations to 0-6 levels
  const iterationLevel = Math.max(0, Math.min(6, Math.floor(params.iterations / 33)));

  // Use uXScale to control branch angle (15-35 degrees for pine)
  const angle = 15 + params.xScale * 20;

  // Generate vertices for current iteration level
  const vertices = generatePineTreeLSystem(iterationLevel, angle);

  // Create UBO-aware shaders
  const vertexShaderSource = createLineFractalVertexShader(useUBO);
  const fragmentShaderSource = createLineFractalFragmentShader(useUBO);

  const drawPineTree = regl({
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

  return drawPineTree;
}

export const is2D = true;

/**
 * Configuration for Pine Tree L-System
 */
export const config = {
  initialSettings: {
    colorScheme: 'coral'
},
  initialPosition: {
    zoom: 2,
    offset: { x: 0.0026, y: 0.1865 }
  },
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 2
}
};

