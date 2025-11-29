import { generatePaletteTexture } from '../utils.js';

// Generate vertices for the Gosper curve (flowsnake)
// The Gosper curve is a space-filling curve based on a hexagonal grid
// It uses 7 sub-hexagons arranged in a specific pattern
function generateGosperCurve(iterations) {
  const vertices = [];

  // Helper function to generate a Gosper curve segment
  // The curve fills a hexagon from center with a given size and orientation
  // rot: rotation type (0-5) determines how the pattern is oriented
  function gosper(cx, cy, size, depth, rot) {
    if (depth >= iterations) {
      // At maximum depth, add the center point
      vertices.push(cx, cy);
      return;
    }

    // Calculate the positions of 7 sub-hexagons
    // The Gosper curve uses 7 hexagons: 1 center + 6 around it
    // Scale factor for Gosper: sqrt(7)
    const subSize = size / Math.sqrt(7);
    const angle60 = Math.PI / 3;

    // Center hexagon
    const centers = [
      [cx, cy], // Center (0)
    ];

    // 6 surrounding hexagons arranged in a hexagon pattern
    // Distance from center to surrounding hexagons
    const distance = (size * 2.0) / Math.sqrt(7);
    for (let i = 0; i < 6; i++) {
      const angle = rot * angle60 + i * angle60;
      centers.push([cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance]);
    }

    // Gosper curve pattern: visit all 7 hexagons in a specific order
    // The pattern determines the order of visiting the hexagons
    // and how each sub-curve is rotated
    // Standard Gosper pattern visits: center, then surrounding hexagons in order
    const pattern = [0, 1, 2, 3, 4, 5, 6];

    // Rotations for each sub-hexagon to create the space-filling pattern
    const rotations = [
      (rot + 0) % 6, // Center - no rotation change
      (rot + 1) % 6, // Hex 1 - rotate 60°
      (rot + 2) % 6, // Hex 2 - rotate 120°
      (rot + 3) % 6, // Hex 3 - rotate 180°
      (rot + 4) % 6, // Hex 4 - rotate 240°
      (rot + 5) % 6, // Hex 5 - rotate 300°
      (rot + 0) % 6, // Hex 6 - back to original
    ];

    for (let i = 0; i < pattern.length; i++) {
      const idx = pattern[i];
      const [subCx, subCy] = centers[idx];
      const nextRot = rotations[i];

      // Recursively generate the curve for this sub-hexagon
      gosper(subCx, subCy, subSize, depth + 1, nextRot);
    }
  }

  // Start from center, fill a hexagon centered at (0, 0) with size 0.8
  gosper(0, 0, 0.8, 0, 0);

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
    float t = fract(dist * 2.1 + angle * 0.32);
    
    vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function render(regl, params, canvas) {
  // Generate palette texture for the current color scheme
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  // Calculate iteration level based on params.iterations
  // Map 0-200 iterations to 0-5 levels
  // Gosper curve grows as 7^n, so keep it reasonable
  const iterationLevel = Math.max(0, Math.min(5, Math.floor(params.iterations / 40)));

  // Generate vertices for current iteration level
  const vertices = generateGosperCurve(iterationLevel);

  const drawGosperCurve = regl({
    vert: vertexShader,
    frag: fragmentShader,
    attributes: {
      position: vertices,
    },
    uniforms: {
      uZoom: params.zoom,
      uOffset: [params.offset.x, params.offset.y],
      uResolution: () => [canvas.width, canvas.height], // Use function to read current canvas dimensions,
      uPalette: paletteTexture,
      uIterations: params.iterations,
      uXScale: () => params.xScale, // Use function to read current value
      uYScale: () => params.yScale, // Use function to read current value
    },
    viewport: {
      x: 0,
      y: 0,
      width: () => canvas.width, // Use function to read current canvas width,
      height: () => canvas.height, // Use function to read current canvas height,
    },
    count: vertices.length / 2,
    primitive: 'line strip',
    lineWidth: 1,
  });

  return drawGosperCurve;
}

export const is2D = true;

/**
 * Configuration for Gosper Curve fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow-dark',
  },
  initialPosition: {
    zoom: 2,
    offset: { x: 0.0723, y: 0.0598 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1 }, // Full Gosper curve view
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
