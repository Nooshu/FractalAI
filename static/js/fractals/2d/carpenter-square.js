import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Carpenter Square Fractal (Pythagorean Tree)
// Recursively places squares at right angles to form a tree-like structure
// Based on the Pythagorean theorem

const float PI = 3.14159265359;

// Check if point is inside a rotated square
bool isInsideRotatedSquare(vec2 p, vec2 center, float size, float angle) {
    // Transform point to square's local coordinate system
    vec2 rel = p - center;
    float cosA = cos(-angle);
    float sinA = sin(-angle);
    vec2 local = vec2(
        rel.x * cosA - rel.y * sinA,
        rel.x * sinA + rel.y * cosA
    );

    // Check if in axis-aligned square in local coordinates
    float halfSize = size * 0.5;
    return abs(local.x) <= halfSize && abs(local.y) <= halfSize;
}

float computeFractal(vec2 c) {
    int iterations = int(clamp(uIterations / 20.0, 1.0, 7.0));

    // Start with a base square at the bottom
    // Base square: centered at (0, -0.6), size 2.5, horizontal
    // Positioned lower so the center of the entire tree structure is near (0, 0)
    vec2 baseCenter = vec2(0.0, -0.6);
    float baseSize = 2.5;
    float baseAngle = 0.0;

    // Check if point is in base square
    if (isInsideRotatedSquare(c, baseCenter, baseSize, baseAngle)) {
        return 1.0;
    }

    // Apply recursive square placement iteratively
    float depth = 0.0;
    vec2 currentCenter = baseCenter;
    float currentSize = baseSize;
    float currentAngle = baseAngle;

    // Use xScale to control the angle of the squares (30-60 degrees)
    float branchAngle = PI / 6.0 + (uXScale - 0.5) * PI / 6.0; // 30-60 degrees
    // Use yScale to control the size ratio of child squares
    float sizeRatio = 0.65 + (uYScale - 0.5) * 0.15; // 0.65-0.8

    for (int i = 0; i < 7; i++) {
        if (i >= iterations) break;

        // Check if still in current square
        if (isInsideRotatedSquare(c, currentCenter, currentSize, currentAngle)) {
            return depth * 15.0 + 1.0;
        }

        // Place two smaller squares on top of the current square
        // They form a right triangle on top of the current square
        float childSize = currentSize * sizeRatio;

        // Calculate the top edge center of current square in local coordinates
        float halfSize = currentSize * 0.5;
        vec2 topLocal = vec2(0.0, halfSize);

        // Rotate to world coordinates
        float cosA = cos(currentAngle);
        float sinA = sin(currentAngle);
        vec2 topWorld = currentCenter + vec2(
            topLocal.x * cosA - topLocal.y * sinA,
            topLocal.x * sinA + topLocal.y * cosA
        );

        // Calculate positions for the two child squares
        // They form a right triangle on top
        // Distance from top edge center to child square centers
        float offset = (currentSize - childSize) * 0.5;

        // Left child square center (in local coordinates of current square)
        vec2 leftLocal = vec2(-offset, halfSize + childSize * 0.5);
        vec2 leftWorld = currentCenter + vec2(
            leftLocal.x * cosA - leftLocal.y * sinA,
            leftLocal.x * sinA + leftLocal.y * cosA
        );

        // Right child square center
        vec2 rightLocal = vec2(offset, halfSize + childSize * 0.5);
        vec2 rightWorld = currentCenter + vec2(
            rightLocal.x * cosA - rightLocal.y * sinA,
            rightLocal.x * sinA + rightLocal.y * cosA
        );

        // Check which child square contains the point
        bool found = false;

        float leftAngle = currentAngle - branchAngle;
        float rightAngle = currentAngle + branchAngle;

        if (isInsideRotatedSquare(c, leftWorld, childSize, leftAngle)) {
            currentCenter = leftWorld;
            currentSize = childSize;
            currentAngle = leftAngle;
            depth += 1.0;
            found = true;
        } else if (isInsideRotatedSquare(c, rightWorld, childSize, rightAngle)) {
            currentCenter = rightWorld;
            currentSize = childSize;
            currentAngle = rightAngle;
            depth += 2.0;
            found = true;
        }

        if (!found) {
            // Point is not in any child square
            return depth * 15.0;
        }
    }

    // Return depth for coloring
    return depth * 10.0 + float(iterations) * 5.0;
}
`;

const fragmentShader = createFragmentShader(fractalFunction);

export function render(regl, params, canvas) {
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  const drawFractal = regl({
    frag: fragmentShader,
    vert: `
      precision mediump float;
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position;
        gl_Position = vec4(position, 0, 1);
      }
    `,
    attributes: {
      position: [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ],
    },
    uniforms: {
      uResolution: [canvas.width, canvas.height],
      uZoom: params.zoom,
      uOffset: [params.offset.x, params.offset.y],
      uIterations: params.iterations,
      uPalette: paletteTexture,
      uXScale: params.xScale,
      uYScale: params.yScale,
    },
    primitive: 'triangle strip',
    count: 4,
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    },
  });

  return drawFractal;
}

export const is2D = true;

/**
 * Configuration for Carpenter Square fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow-double',
    iterations: 25,
  },
  initialPosition: {
    zoom: 1,
    offset: { x: 2.9559, y: 2.7137 },
  },
  interestingPoints: [],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};

