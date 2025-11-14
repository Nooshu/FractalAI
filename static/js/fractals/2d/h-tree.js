import regl from 'regl';

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
      x1: leftX, y1: bottomY,
      x2: leftX, y2: topY
    });
    
    // Horizontal middle line
    segments.push({
      x1: leftX, y1: cy,
      x2: rightX, y2: cy
    });
    
    // Right vertical line
    segments.push({
      x1: rightX, y1: bottomY,
      x2: rightX, y2: topY
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
    
    // Apply zoom and offset
    vec2 transformed = position;
    transformed *= 4.0 / uZoom;
    transformed.x *= aspect * uXScale;
    transformed.y *= uYScale;
    transformed += uOffset;
    
    // Map back to clip space
    vec2 clipSpace = transformed / 2.0;
    clipSpace.x /= aspect;
    
    gl_Position = vec4(clipSpace, 0.0, 1.0);
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
  // Generate palette texture
  const paletteData = new Uint8Array(256 * 3);
  const scheme = params.colorScheme || 'classic';
  
  // Generate palette based on color scheme
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    if (scheme === 'classic') {
      paletteData[i * 3] = Math.floor(Math.sin(t * Math.PI * 2) * 127 + 128);
      paletteData[i * 3 + 1] = Math.floor(Math.sin(t * Math.PI * 2 + Math.PI / 2) * 127 + 128);
      paletteData[i * 3 + 2] = Math.floor(Math.sin(t * Math.PI * 2 + Math.PI) * 127 + 128);
    } else if (scheme === 'fire') {
      paletteData[i * 3] = Math.floor(t * 255);
      paletteData[i * 3 + 1] = Math.floor(t * t * 255);
      paletteData[i * 3 + 2] = Math.floor(t * t * t * 128);
    } else if (scheme === 'ocean') {
      paletteData[i * 3] = Math.floor(t * 128);
      paletteData[i * 3 + 1] = Math.floor(t * 200);
      paletteData[i * 3 + 2] = Math.floor(200 + t * 55);
    } else {
      // Default rainbow
      paletteData[i * 3] = Math.floor(Math.sin(t * Math.PI * 2) * 127 + 128);
      paletteData[i * 3 + 1] = Math.floor(Math.sin(t * Math.PI * 2 + 2) * 127 + 128);
      paletteData[i * 3 + 2] = Math.floor(Math.sin(t * Math.PI * 2 + 4) * 127 + 128);
    }
  }

  const paletteTexture = regl.texture({
    data: paletteData,
    width: 256,
    height: 1,
    format: 'rgb',
    wrap: 'repeat',
  });

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

