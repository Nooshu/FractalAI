import { generatePaletteTexture } from '../utils.js';

// Buffer cache for reuse
let cachedBuffer = null;
let cachedVertexCount = 0;

// Generate Lévy flight path
function generateLevyFlight(params) {
  const vertices = [];
  const colorValues = [];
  
  const numSteps = Math.floor(params.iterations * 20); // Scale with iterations
  const alpha = 0.5 + params.xScale * 1.5; // Lévy distribution parameter (0.5 to 2.0)
  const beta = params.yScale; // Skewness parameter (0 to 1)
  
  let x = 0;
  let y = 0;
  
  // Generate Lévy flight path
  for (let i = 0; i < numSteps; i++) {
    const prevX = x;
    const prevY = y;
    
    // Generate step length using power-law distribution (Lévy distribution approximation)
    // For Lévy flights, step lengths follow a power-law: P(l) ~ l^(-alpha-1)
    const u = Math.random();
    const stepLength = Math.pow(1.0 - u, -1.0 / alpha) * 0.02;
    
    // Generate step direction (uniform random)
    const angle = Math.random() * Math.PI * 2;
    
    // Apply step
    x += Math.cos(angle) * stepLength;
    y += Math.sin(angle) * stepLength;
    
    // Add line segment
    vertices.push(prevX, prevY);
    vertices.push(x, y);
    
    // Color based on step number (distance along path)
    const colorValue = Math.min(i / numSteps, 1.0);
    colorValues.push(colorValue);
    colorValues.push(colorValue);
  }
  
  return { vertices, colorValues };
}

export function render(regl, params, canvas) {
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);
  
  // Generate Lévy flight path
  const { vertices, colorValues } = generateLevyFlight(params);
  const vertexCount = vertices.length / 2;
  
  // Calculate bounding box for scaling
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (let i = 0; i < vertices.length; i += 2) {
    minX = Math.min(minX, vertices[i]);
    maxX = Math.max(maxX, vertices[i]);
    minY = Math.min(minY, vertices[i + 1]);
    maxY = Math.max(maxY, vertices[i + 1]);
  }
  
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  // Scale to fit viewport
  const scale = Math.min(8.0 / width, 8.0 / height);
  
  // Convert to Float32Array
  const positions = new Float32Array(vertices);
  const colors = new Float32Array(colorValues);
  
  // Reuse buffer if possible, otherwise create new one
  if (!cachedBuffer || cachedVertexCount !== vertexCount) {
    if (cachedBuffer) {
      cachedBuffer.destroy();
    }
    cachedBuffer = regl.buffer(positions);
    cachedVertexCount = vertexCount;
  } else {
    // Buffer exists with same size, just update the data
    cachedBuffer.subdata(positions);
  }
  
  // Create color buffer
  const colorBuffer = regl.buffer(colors);
  
  // Vertex shader
  const vertexShader = `
    precision mediump float;
    attribute vec2 position;
    attribute float colorValue;
    uniform float uZoom;
    uniform vec2 uOffset;
    uniform float uScale;
    uniform vec2 uCenter;
    uniform vec2 uResolution;
    uniform float uXScale;
    uniform float uYScale;
    uniform sampler2D uPalette;
    varying vec4 vColor;

    void main() {
      float aspect = uResolution.x / uResolution.y;
      
      // Transform vertex position
      vec2 pos = position;
      pos -= uCenter;
      pos *= uScale;
      
      // Apply user scale
      pos.x *= uXScale;
      pos.y *= uYScale;
      
      // Apply zoom and offset
      pos = pos * uZoom + uOffset;
      
      // Apply aspect ratio correction
      pos.x /= aspect;
      
      // Convert to clip space
      gl_Position = vec4(pos, 0, 1);
      
      // Look up color from palette
      float t = clamp(colorValue, 0.0, 1.0);
      vColor = texture2D(uPalette, vec2(t, 0.5));
    }
  `;
  
  // Fragment shader
  const fragmentShader = `
    precision mediump float;
    varying vec4 vColor;
    
    void main() {
      gl_FragColor = vColor;
    }
  `;
  
  const drawLevyFlight = regl({
    frag: fragmentShader,
    vert: vertexShader,
    attributes: {
      position: {
        buffer: cachedBuffer,
        stride: 8,
      },
      colorValue: {
        buffer: colorBuffer,
        stride: 4,
      },
    },
    uniforms: {
      uZoom: params.zoom,
      uOffset: [params.offset.x, params.offset.y],
      uScale: scale,
      uCenter: [centerX, centerY],
      uXScale: params.xScale,
      uYScale: params.yScale,
      uResolution: [canvas.width, canvas.height],
      uPalette: paletteTexture,
    },
    primitive: 'lines',
    count: vertexCount,
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    },
  });
  
  return drawLevyFlight;
}

export const is2D = true;

