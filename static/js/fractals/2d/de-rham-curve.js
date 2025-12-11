import {
  generatePaletteTexture
} from '../utils.js';

// Generate vertices for the De Rham curve
// The De Rham curve is a family of self-similar curves defined by contraction mappings
// It uses two mappings: d₀(z) = az and d₁(z) = a + (1-a)z
// where a is a complex parameter. We use a = (1 + i√3) / 4 for a classic variant
// This creates a continuous, nowhere-differentiable curve with intricate detail
function generateDeRhamCurve(iterations) {
  const vertices = [];

  // Classic De Rham curve parameter: a = (1 + i√3) / 4
  // This creates a well-known intricate pattern
  const sqrt3 = 1.7320508075688772;
  const aReal = 0.25; // 1/4
  const aImag = sqrt3 * 0.25; // √3/4

  // The curve maps the interval [0,1] to the complex plane
  // We recursively apply the two contraction mappings

  // Helper function to compute a point on the curve using binary expansion
  // Each bit in the binary expansion of t determines which mapping to apply
  // The binary expansion t = 0.b₁b₂b₃... determines the sequence of mappings
  function computePoint(t, maxDepth) {
    // Start with z = 0
    let zReal = 0;
    let zImag = 0;

    // Apply mappings based on binary expansion of t
    // We need to read bits from most significant to least significant
    for (let depth = 0; depth < maxDepth; depth++) {
      // Extract the (depth+1)-th bit from binary expansion
      // For t in [0,1], bit k is: floor(t * 2^(k+1)) mod 2
      const bitValue = Math.floor(t * Math.pow(2, depth + 1)) % 2;

      if (bitValue === 0) {
        // Apply d₀: z -> az (complex multiplication)
        const newReal = aReal * zReal - aImag * zImag;
        const newImag = aReal * zImag + aImag * zReal;
        zReal = newReal;
        zImag = newImag;
      } else {
        // Apply d₁: z -> a + (1-a)z
        // where (1-a) = 1 - a = (3 - i√3) / 4
        const oneMinusAReal = 1 - aReal; // 3/4
        const oneMinusAImag = -aImag; // -√3/4
        const newReal = aReal + (oneMinusAReal * zReal - oneMinusAImag * zImag);
        const newImag = aImag + (oneMinusAReal * zImag + oneMinusAImag * zReal);
        zReal = newReal;
        zImag = newImag;
      }
    }

    return { x: zReal, y: zImag };
  }

  // Generate the curve by sampling points
  // Use enough points to show the intricate detail
  const numPoints = Math.min(20000, Math.pow(2, Math.min(iterations + 2, 14)));

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const point = computePoint(t, iterations);
    vertices.push(point.x, point.y);
  }

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
  const scale = maxSize > 0 ? 2.5 / maxSize : 1.0;
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
      float t = fract(dist * 2.5 + angle * 0.5);

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
      float t = fract(dist * 2.5 + angle * 0.5);

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
  // De Rham curve grows as 3^n, so keep it reasonable
  const iterationLevel = Math.max(0, Math.min(10, Math.floor(params.iterations / 20)));

  // Generate vertices for current iteration level
  const vertices = generateDeRhamCurve(iterationLevel);
  const vertexCount = vertices.length / 2;

  // Create UBO-aware shaders
  const vertexShaderSource = createLineFractalVertexShader(useUBO);
  const fragmentShaderSource = createLineFractalFragmentShader(useUBO);

  const drawDeRham = regl({
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
    count: vertexCount,
    primitive: 'line strip',
    lineWidth: 1
});

  return drawDeRham;
}

export const is2D = true;

/**
 * Configuration for De Rham Curve fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'aurora'
},
  initialPosition: {
    zoom: 1.796,
    offset: { x: 0.0287, y: 0.0888 }
  },
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1
},
  // Interesting bounds for "surprise me" - De Rham curve is always interesting
  interestingBounds: {
    offsetX: [-1, 1],
    offsetY: [-1, 1],
    zoom: [0.5, 10],
  }
};

