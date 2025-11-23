import { generatePaletteTexture } from '../utils.js';

// Generate vertices for the Hilbert space-filling curve
// The Hilbert curve fills a square by recursively dividing it into 4 sub-squares (2x2 grid)
// and connecting them in a specific pattern with rotations
function generateHilbertCurve(iterations) {
  const vertices = [];
  
  // Helper function to generate a Hilbert curve segment
  // The curve fills a square from (x1, y1) to (x2, y2)
  // rot: rotation type (0, 1, 2, 3) determines how the pattern is oriented
  function hilbert(x1, y1, x2, y2, depth, rot) {
    if (depth >= iterations) {
      // At maximum depth, add the endpoint
      vertices.push(x2, y2);
      return;
    }
    
    // Calculate the size of the square
    const width = x2 - x1;
    const height = y2 - y1;
    
    // Divide into 4 sub-squares (2x2 grid)
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    // Define the 4 sub-squares in a 2x2 grid
    // Each square is defined by its top-left and bottom-right corners
    const squares = [
      [x1, y1, x1 + halfWidth, y1 + halfHeight],                    // Top-left (0)
      [x1, y1 + halfHeight, x1 + halfWidth, y1 + halfHeight * 2], // Bottom-left (1)
      [x1 + halfWidth, y1 + halfHeight, x1 + halfWidth * 2, y1 + halfHeight * 2], // Bottom-right (2)
      [x1 + halfWidth, y1, x1 + halfWidth * 2, y1 + halfHeight],   // Top-right (3)
    ];
    
    // Hilbert curve pattern based on rotation
    // The pattern determines the order of visiting the 4 quadrants
    // and how each sub-curve is rotated
    let pattern, rotations;
    
    if (rot === 0) {
      // Standard orientation: top-left -> bottom-left -> bottom-right -> top-right
      pattern = [0, 1, 2, 3];
      rotations = [1, 0, 0, 3]; // Rotation for each sub-square
    } else if (rot === 1) {
      // Rotated 90° clockwise: top-right -> top-left -> bottom-left -> bottom-right
      pattern = [3, 0, 1, 2];
      rotations = [0, 1, 1, 2];
    } else if (rot === 2) {
      // Rotated 180°: bottom-right -> top-right -> top-left -> bottom-left
      pattern = [2, 3, 0, 1];
      rotations = [3, 2, 2, 1];
    } else { // rot === 3
      // Rotated 90° counter-clockwise: bottom-left -> bottom-right -> top-right -> top-left
      pattern = [1, 2, 3, 0];
      rotations = [2, 3, 3, 0];
    }
    
    for (let i = 0; i < pattern.length; i++) {
      const idx = pattern[i];
      const [sqX1, sqY1, sqX2, sqY2] = squares[idx];
      const nextRot = rotations[i];
      
      // Recursively generate the curve for this sub-square
      hilbert(sqX1, sqY1, sqX2, sqY2, depth + 1, nextRot);
    }
  }
  
  // Start from top-left corner, fill the square from (-0.5, -0.5) to (0.5, 0.5)
  vertices.push(-0.5, -0.5);
  hilbert(-0.5, -0.5, 0.5, 0.5, 0, 0);
  
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
    float t = fract(dist * 1.9 + angle * 0.28);
    
    vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function render(regl, params, canvas) {
  // Generate palette texture for the current color scheme
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  // Calculate iteration level based on params.iterations
  // Map 0-200 iterations to 0-6 levels
  // Hilbert curve grows as 4^n, so keep it reasonable
  const iterationLevel = Math.max(0, Math.min(6, Math.floor(params.iterations / 33)));
  
  // Generate vertices for current iteration level
  const vertices = generateHilbertCurve(iterationLevel);

  const drawHilbertCurve = regl({
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

  return drawHilbertCurve;
}

export const is2D = true;

/**
 * Configuration for Hilbert Curve fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'ice',
  },
  initialPosition: {
    zoom: 3.015,
    offset: { x: -0.006, y: 0.0693 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1 }, // Full Hilbert curve view
    { x: 0, y: 0, zoom: 2 }, // Center detail
    { x: 0.2, y: 0.2, zoom: 3 }, // Upper right quadrant
    { x: -0.2, y: 0.2, zoom: 3 }, // Upper left quadrant
    { x: 0.2, y: -0.2, zoom: 3 }, // Lower right quadrant
    { x: -0.2, y: -0.2, zoom: 3 }, // Lower left quadrant
    { x: 0.15, y: 0.15, zoom: 4 }, // Deep zoom upper right
    { x: -0.15, y: 0.15, zoom: 4 }, // Deep zoom upper left
    { x: 0.15, y: -0.15, zoom: 4 }, // Deep zoom lower right
    { x: 0, y: 0, zoom: 1.5 }, // Medium zoom center
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};

