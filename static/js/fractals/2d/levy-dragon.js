import {
  generatePaletteTexture,
} from '../utils.js';

// Generate vertices for the Lévy Dragon curve
// The Lévy Dragon is constructed using a recursive replacement pattern
// similar to the Lévy C curve, but arranged as a dragon curve
// It uses 45-degree turns instead of 90-degree turns, creating a different shape
function generateLevyDragon(iterations) {
  // The Lévy dragon uses a recursive construction similar to Lévy C curve
  // Each line segment is replaced by two segments forming a right angle
  // but arranged in a dragon-like pattern with 45-degree turns
  
  const vertices = [];
  
  // Recursive function to generate the Lévy dragon
  // Each segment is replaced by two segments at 45 degrees (not 90 like Heighway)
  function levyDragon(x1, y1, x2, y2, depth, turnDirection) {
    if (depth >= iterations) {
      // At maximum depth, add the endpoint
      if (depth === iterations) {
        vertices.push(x2, y2);
      }
      return;
    }
    
    // Calculate the midpoint
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    
    // Calculate the direction vector
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // For Lévy dragon, we create a corner point at 45 degrees
    // The perpendicular vector rotated 45 degrees
    const perpX = -dy;
    const perpY = dx;
    const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
    
    // Normalize and scale for 45-degree angle
    // For a 45-degree turn, we use sqrt(2)/2 scaling
    const sqrt2_2 = 0.7071067811865476;
    const offset = (Math.sqrt(dx * dx + dy * dy) / 2) * sqrt2_2;
    
    const normalizedPerpX = perpLength > 0 ? (perpX / perpLength) * offset : 0;
    const normalizedPerpY = perpLength > 0 ? (perpY / perpLength) * offset : 0;
    
    // The corner point (alternating direction creates dragon pattern)
    const cornerX = midX + normalizedPerpX * turnDirection;
    const cornerY = midY + normalizedPerpY * turnDirection;
    
    // Recursively generate the two segments
    // First segment: (x1, y1) -> corner
    levyDragon(x1, y1, cornerX, cornerY, depth + 1, turnDirection);
    
    // Second segment: corner -> (x2, y2)
    // Alternate turn direction for dragon pattern
    levyDragon(cornerX, cornerY, x2, y2, depth + 1, -turnDirection);
  }
  
  // Start with a base line from left to right
  vertices.push(-0.5, 0);
  levyDragon(-0.5, 0, 0.5, 0, 0, 1);
  
  // Calculate bounding box and scale to fit
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
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
  const scale = maxSize > 0 ? 2.0 / maxSize : 1.0;
  const scaledVertices = new Float32Array(vertices.length);
  for (let i = 0; i < vertices.length; i += 2) {
    scaledVertices[i] = (vertices[i] - centerX) * scale;
    scaledVertices[i + 1] = (vertices[i + 1] - centerY) * scale;
  }
  
  return scaledVertices;
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
      float dist = length(vPosition);
      float angle = atan(vPosition.y, vPosition.x);
      float t = fract(dist * 1.8 + angle * 0.4);
      
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
      float dist = length(vPosition);
      float angle = atan(vPosition.y, vPosition.x);
      float t = fract(dist * 1.8 + angle * 0.4);
      
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
  // Lévy dragon doubles in complexity each iteration, so keep it reasonable
  const iterationLevel = Math.max(0, Math.min(15, Math.floor(params.iterations / 13)));

  // Generate vertices for current iteration level
  const vertices = generateLevyDragon(iterationLevel);

  // Create UBO-aware shaders
  const vertexShaderSource = createLineFractalVertexShader(useUBO);
  const fragmentShaderSource = createLineFractalFragmentShader(useUBO);

  const drawLevyDragon = regl({
    vert: vertexShaderSource,
    frag: fragmentShaderSource,
    attributes: {
      position: vertices,
    },
    uniforms: useUBO
      ? {
          uZoom: params.zoom,
          uOffset: [params.offset.x, params.offset.y],
          uResolution: [canvas.width, canvas.height],
          uPalette: paletteTexture,
          uIterations: params.iterations,
          uScale: [params.xScale, params.yScale],
        }
      : {
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

  return drawLevyDragon;
}

export const is2D = true;

/**
 * Configuration for Lévy Dragon fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'electric',
  },
  initialPosition: {
    zoom: 1.509,
    offset: { x: -0.0253, y: -0.0453 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1 }, // Full dragon view
    { x: 0, y: 0, zoom: 2 }, // Center detail
    { x: 0.2, y: 0, zoom: 3 }, // Right side of dragon
    { x: -0.2, y: 0, zoom: 3 }, // Left side of dragon
    { x: 0.1, y: 0.1, zoom: 4 }, // Upper right quadrant
    { x: -0.1, y: 0.1, zoom: 4 }, // Upper left quadrant
    { x: 0.1, y: -0.1, zoom: 4 }, // Lower right quadrant
    { x: -0.1, y: -0.1, zoom: 4 }, // Lower left quadrant
    { x: 0.15, y: 0.05, zoom: 6 }, // Deep zoom right
    { x: 0, y: 0, zoom: 1.5 }, // Medium zoom center
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};

