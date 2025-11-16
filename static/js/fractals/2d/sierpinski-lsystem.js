import regl from 'regl';
import { generatePaletteTexture } from '../utils.js';

// Generate vertices for the Sierpinski Arrowhead Curve using L-system
// L-system rules:
// Axiom: A
// Rules: A → B-A-B, B → A+B+A
// Angle: 60 degrees
function generateSierpinskiLSystem(iterations, angle = 60) {
  const angleRad = (angle * Math.PI) / 180;
  
  // L-system rules
  // Axiom: A
  // A → B-A-B
  // B → A+B+A
  let lsystemString = 'A';
  
  // Iteratively apply the rules
  for (let i = 0; i < iterations; i++) {
    let newString = '';
    for (let j = 0; j < lsystemString.length; j++) {
      const char = lsystemString[j];
      switch (char) {
        case 'A':
          newString += 'B-A-B';
          break;
        case 'B':
          newString += 'A+B+A';
          break;
        default:
          newString += char;
          break;
      }
    }
    lsystemString = newString;
  }
  
  // Now interpret the L-system string to generate vertices
  const vertices = [];
  let x = 0;
  let y = -0.5; // Start at bottom
  let currentAngle = Math.PI / 2; // Start facing up
  
  // Use a fixed step length - we'll scale the entire curve to fit later
  const stepLength = 1.0;
  
  vertices.push(x, y);
  
  // Process each character in the L-system string
  for (let i = 0; i < lsystemString.length; i++) {
    const char = lsystemString[i];
    
    switch (char) {
      case 'A':
      case 'B':
        // Move forward (both A and B represent forward movement)
        x += Math.cos(currentAngle) * stepLength;
        y += Math.sin(currentAngle) * stepLength;
        vertices.push(x, y);
        break;
      case '+':
        // Turn right (clockwise)
        currentAngle += angleRad;
        break;
      case '-':
        // Turn left (counter-clockwise)
        currentAngle -= angleRad;
        break;
    }
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
  // Use a larger scale factor to make it clearly visible
  const scale = maxSize > 0 ? 2.5 / maxSize : 1.0;
  const scaledVertices = new Float32Array(vertices.length);
  for (let i = 0; i < vertices.length; i += 2) {
    scaledVertices[i] = (vertices[i] - centerX) * scale;
    scaledVertices[i + 1] = (vertices[i + 1] - centerY) * scale;
  }
  
  return scaledVertices;
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
    float dist = length(vPosition);
    float angle = atan(vPosition.y, vPosition.x);
    float t = fract(dist * 2.0 + angle * 0.3);
    
    vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function render(regl, params, canvas) {
  // Generate palette texture for the current color scheme
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  // Calculate iteration level based on params.iterations
  // Map 0-200 iterations to 0-8 levels
  const iterationLevel = Math.max(0, Math.min(8, Math.floor(params.iterations / 25)));
  // Use xScale to control turn angle (45-75 degrees)
  const angle = 45 + params.xScale * 30;
  
  // Generate vertices for current iteration level
  const vertices = generateSierpinskiLSystem(iterationLevel, angle);
  const vertexCount = vertices.length / 2;

  const drawSierpinski = regl({
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
    count: vertexCount,
    primitive: 'line strip',
    lineWidth: 1,
  });

  return drawSierpinski;
}

export const is2D = true;

