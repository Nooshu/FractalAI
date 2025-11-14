import regl from 'regl';

// Generate vertices for the Twindragon curve
// The twindragon is formed by two Heighway dragons arranged to tile the plane
function generateTwindragon(iterations) {
  // Generate the dragon curve sequence
  let sequence = [1]; // 1 = right turn, -1 = left turn
  
  for (let iter = 0; iter < iterations; iter++) {
    const newSequence = [...sequence];
    newSequence.push(1); // Add a right turn in the middle
    
    // Append the reverse of the sequence with alternating signs
    for (let i = sequence.length - 1; i >= 0; i--) {
      newSequence.push(-sequence[i]);
    }
    
    sequence = newSequence;
  }
  
  const stepLength = 1.0 / Math.pow(Math.sqrt(2), iterations);
  
  // Generate first dragon (starting from origin, facing right)
  const dragon1 = generateDragonPath(sequence, 0, 0, 0, stepLength);
  
  // Generate second dragon (starting from (stepLength, 0), facing up-left at 135°)
  // This is rotated 90 degrees and reflected to tile with the first dragon
  const dragon2 = generateDragonPath(sequence, stepLength, 0, Math.PI * 3 / 4, stepLength);
  
  // Combine both dragons
  const allVertices = [...dragon1, ...dragon2];
  
  return new Float32Array(allVertices);
}

function generateDragonPath(sequence, startX, startY, startAngle, stepLength) {
  let x = startX;
  let y = startY;
  let angle = startAngle;
  
  const vertices = [];
  vertices.push(x, y);
  
  // Draw each segment
  for (let i = 0; i < sequence.length; i++) {
    // Move forward
    x += Math.cos(angle) * stepLength;
    y += Math.sin(angle) * stepLength;
    vertices.push(x, y);
    
    // Turn based on the sequence value
    angle += sequence[i] * Math.PI / 2;
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
    // Fragment shader: c = (uv - 0.5) * scale * aspect * xScale + offset
    // So for vertices in fractal coordinate space 'c', we need to convert to clip space:
    // 1. Subtract offset to get relative position
    vec2 fractalCoord = position;
    vec2 relative = fractalCoord - uOffset;
    
    // 2. Convert to UV space (inverse of fragment shader transformation)
    vec2 uv = vec2(
      relative.x / (scale * aspect * uXScale) + 0.5,
      relative.y / (scale * uYScale) + 0.5
    );
    
    // 3. Convert UV (0-1) to clip space (-1 to 1)
    vec2 clipSpace = (uv - 0.5) * 2.0;
    
    // 4. The fragment shader's aspect is already in the x coordinate,
    //    so we need to divide by aspect to get proper clip space
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
    // Color based on position along the curve
    // Create interesting patterns with both distance and angle
    float dist = length(vPosition);
    float angle = atan(vPosition.y, vPosition.x);
    float t = fract(dist * 2.0 + angle * 0.3);
    
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
  const iterationLevel = Math.max(0, Math.min(15, Math.floor(params.iterations / 13)));
  
  // Generate vertices for current iteration level
  const vertices = generateTwindragon(iterationLevel);

  const drawTwindragon = regl({
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

  return drawTwindragon;
}

export const is2D = true;

