import { generatePaletteTexture } from '../utils.js';

// Generate vertices for the Peano space-filling curve
// The Peano curve fills a square by recursively dividing it into 9 sub-squares
// and connecting them in a specific pattern
function generatePeanoCurve(iterations) {
  const vertices = [];
  
  // Helper function to generate a Peano curve segment
  // The curve fills a square from (x1, y1) to (x2, y2)
  // direction: 1 = forward, -1 = reverse
  function peano(x1, y1, x2, y2, depth, direction) {
    if (depth >= iterations) {
      // At maximum depth, add the endpoint
      vertices.push(x2, y2);
      return;
    }
    
    // Calculate the size of the square
    const width = x2 - x1;
    const height = y2 - y1;
    
    // Divide into 9 sub-squares (3x3 grid)
    const thirdWidth = width / 3;
    const thirdHeight = height / 3;
    
    // Define the 9 sub-squares in a 3x3 grid
    // Each square is defined by its top-left and bottom-right corners
    const squares = [
      // Row 1 (top)
      [x1, y1, x1 + thirdWidth, y1 + thirdHeight],                    // Top-left
      [x1 + thirdWidth, y1, x1 + thirdWidth * 2, y1 + thirdHeight], // Top-center
      [x1 + thirdWidth * 2, y1, x1 + thirdWidth * 3, y1 + thirdHeight], // Top-right
      // Row 2 (middle)
      [x1, y1 + thirdHeight, x1 + thirdWidth, y1 + thirdHeight * 2], // Middle-left
      [x1 + thirdWidth, y1 + thirdHeight, x1 + thirdWidth * 2, y1 + thirdHeight * 2], // Middle-center
      [x1 + thirdWidth * 2, y1 + thirdHeight, x1 + thirdWidth * 3, y1 + thirdHeight * 2], // Middle-right
      // Row 3 (bottom)
      [x1, y1 + thirdHeight * 2, x1 + thirdWidth, y1 + thirdHeight * 3], // Bottom-left
      [x1 + thirdWidth, y1 + thirdHeight * 2, x1 + thirdWidth * 2, y1 + thirdHeight * 3], // Bottom-center
      [x1 + thirdWidth * 2, y1 + thirdHeight * 2, x1 + thirdWidth * 3, y1 + thirdHeight * 3], // Bottom-right
    ];
    
    // Peano curve pattern: visit all 9 squares in a specific order
    // The pattern alternates direction based on depth to create the space-filling curve
    const forwardPattern = [0, 1, 2, 5, 4, 3, 6, 7, 8]; // Forward traversal
    const reversePattern = [8, 7, 6, 3, 4, 5, 2, 1, 0]; // Reverse traversal
    const pattern = direction === 1 ? forwardPattern : reversePattern;
    
    for (let i = 0; i < pattern.length; i++) {
      const idx = pattern[i];
      const [sqX1, sqY1, sqX2, sqY2] = squares[idx];
      
      // Alternate direction for next level to create the Peano pattern
      const nextDirection = (i % 2 === 0) ? direction : -direction;
      
      // Recursively generate the curve for this sub-square
      peano(sqX1, sqY1, sqX2, sqY2, depth + 1, nextDirection);
    }
  }
  
  // Start from top-left corner, fill the square from (-0.5, -0.5) to (0.5, 0.5)
  vertices.push(-0.5, -0.5);
  peano(-0.5, -0.5, 0.5, 0.5, 0, 1);
  
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
    float t = fract(dist * 2.0 + angle * 0.25);
    
    vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function render(regl, params, canvas) {
  // Generate palette texture for the current color scheme
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  // Calculate iteration level based on params.iterations
  // Map 0-200 iterations to 0-5 levels
  // Peano curve grows as 9^n, so keep it reasonable
  const iterationLevel = Math.max(0, Math.min(5, Math.floor(params.iterations / 40)));
  
  // Generate vertices for current iteration level
  const vertices = generatePeanoCurve(iterationLevel);

  const drawPeanoCurve = regl({
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

  return drawPeanoCurve;
}

export const is2D = true;

/**
 * Configuration for Peano Curve fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'classic',
  },
  initialPosition: {
    zoom: 2.969,
    offset: { x: -0.003, y: 0.0713 },
  },
  interestingPoints: [],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};

