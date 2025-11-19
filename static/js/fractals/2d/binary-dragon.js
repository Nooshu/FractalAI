import { generatePaletteTexture } from '../utils.js';

// Generate vertices for the Binary Dragon curve
// The binary dragon uses binary representation to determine turn directions
// For step n, the turn is determined by the parity of 1s in the binary representation of n
function generateBinaryDragon(iterations) {
  // Calculate the number of steps based on iterations
  // Binary dragon grows exponentially: 2^iterations steps
  const numSteps = Math.pow(2, iterations);
  
  // Starting position and direction
  let x = -0.5;
  let y = 0;
  let angle = 0; // Start facing right
  
  // Calculate step size to fit the curve in view
  const stepLength = 1.0 / Math.pow(Math.sqrt(2), iterations);
  
  const vertices = [];
  vertices.push(x, y);
  
  // Generate the binary dragon curve
  for (let n = 0; n < numSteps; n++) {
    // Count the number of 1s in the binary representation of n
    let onesCount = 0;
    let temp = n;
    while (temp > 0) {
      if (temp & 1) onesCount++;
      temp >>= 1;
    }
    
    // Turn direction: if odd number of 1s, turn right (1), else turn left (-1)
    const turn = (onesCount % 2 === 1) ? 1 : -1;
    
    // Move forward
    x += Math.cos(angle) * stepLength;
    y += Math.sin(angle) * stepLength;
    vertices.push(x, y);
    
    // Turn based on binary pattern
    angle += turn * Math.PI / 2;
  }
  
  return new Float32Array(vertices);
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
  varying vec2 vPosition;

  void main() {
    // Color based on position along the curve
    // Create interesting patterns with both distance and angle
    float dist = length(vPosition);
    float angle = atan(vPosition.y, vPosition.x);
    float t = fract(dist * 2.2 + angle * 0.35);
    
    vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function render(regl, params, canvas) {
  // Generate palette texture for the current color scheme
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  // Calculate iteration level based on params.iterations
  // Map 0-200 iterations to 0-15 levels
  // Binary dragon grows as 2^n, so keep it reasonable
  const iterationLevel = Math.max(0, Math.min(15, Math.floor(params.iterations / 13)));
  
  // Generate vertices for current iteration level
  const vertices = generateBinaryDragon(iterationLevel);

  const drawBinaryDragon = regl({
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
    primitive: 'line strip',
    lineWidth: 1,
  });

  return drawBinaryDragon;
}

export const is2D = true;

