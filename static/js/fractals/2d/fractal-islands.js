import {
  generatePaletteTexture,
  createFragmentShader,
  getVertexShader
} from '../utils.js';

const fractalFunction = `
// Fractal Islands
// Recursively subdivides squares and keeps only corner regions, creating isolated islands

bool isInFractalIslands(vec2 p, int maxIter) {
    // Normalize to [0, 1] range
    // Map coordinates to [0, 1] range for the fractal algorithm
    // Use a scaling that works well at default zoom
    vec2 pos = p * 0.5 + 0.5;

    // Clamp to valid range to handle any coordinate
    pos = clamp(pos, 0.0, 1.0);

    // Iteratively check each level
    // At each level, divide into 3x3 grid (9 squares) and keep only the 4 corners
    // Remove center square and all 4 edge squares
    for (int i = 0; i < 10; i++) {
        if (i >= maxIter) break;

        // Scale position to check which of the 9 squares we're in
        vec2 scaled = pos * 3.0;
        vec2 cell = floor(scaled);

        // Keep only corner squares: (0,0), (2,0), (0,2), (2,2)
        // Remove: center (1,1) and edges: (0,1), (1,0), (1,2), (2,1)
        if ((cell.x == 1.0 && cell.y == 1.0) ||  // Center
            (cell.x == 0.0 && cell.y == 1.0) ||  // Left middle
            (cell.x == 1.0 && cell.y == 0.0) ||  // Bottom middle
            (cell.x == 1.0 && cell.y == 2.0) ||  // Top middle
            (cell.x == 2.0 && cell.y == 1.0)) {  // Right middle
            return false; // In a removed square
        }

        // Move to next level - focus on the current corner cell
        pos = fract(scaled);
    }

    return true;
}

float computeFractal(vec2 c) {
    int iterations = int(clamp(uIterations / 15.0, 1.0, 8.0));

    // c is already transformed by zoom/offset in utils.js
    // Check if point is in the Fractal Islands
    if (!isInFractalIslands(c, iterations)) {
        // Point is in a removed square - return 0 for black
        return 0.0;
    }

    // Point is in the fractal - calculate depth for interesting coloring
    float depth = 0.0;
    vec2 pos = c * 0.5 + 0.5;

    for (int i = 0; i < 10; i++) {
        if (i >= iterations) break;

        vec2 scaled = pos * 3.0;
        vec2 cell = floor(scaled);

        // Color based on which corner we're in
        if (cell.x == 0.0 && cell.y == 0.0) {
            depth += 10.0; // Bottom-left corner
        } else if (cell.x == 2.0 && cell.y == 0.0) {
            depth += 8.0; // Bottom-right corner
        } else if (cell.x == 0.0 && cell.y == 2.0) {
            depth += 6.0; // Top-left corner
        } else if (cell.x == 2.0 && cell.y == 2.0) {
            depth += 4.0; // Top-right corner
        }

        // Add distance-based variation within the corner
        vec2 cellCenter = (cell + 0.5) / 3.0;
        float distFromCenter = length(pos - cellCenter);
        depth += distFromCenter * 3.0;

        // Add iteration-based variation
        depth += float(i) * 2.0;

        pos = fract(scaled);
    }

    // Return color intensity based on depth - must be less than uIterations to be colored
    return mod(depth * 7.0, uIterations * 0.9);
}
`;

export function render(regl, params, canvas, options = {}) {
  // Check if UBOs should be used (WebGL2 optimization)
  const webglCapabilities = options.webglCapabilities;
  const ubo = options.ubo;
  const useUBO = webglCapabilities?.isWebGL2 && ubo;

  // Create fragment shader with UBO support if available
  const fragmentShader = createFragmentShader(fractalFunction, useUBO);

  // Use standard vertex shader (getVertexShader handles UBO mode)
  const vertexShaderSource = getVertexShader(useUBO);

  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  const drawFractal = regl({
    frag: fragmentShader,
    vert: vertexShaderSource,
    attributes: {
      position: [-1, -1, 1, -1, -1, 1, 1, 1]
},
    uniforms: useUBO
      ? {
          uTime: 0,
          uResolution: [canvas.width, canvas.height],
          uPalette: paletteTexture
}
      : {
          uTime: 0,
          uIterations: params.iterations,
          uZoom: params.zoom,
          uOffset: [params.offset.x, params.offset.y],
          uResolution: [canvas.width, canvas.height],
          uJuliaC: [0, 0],
          uPalette: paletteTexture,
          uXScale: params.xScale,
          uYScale: params.yScale
},
    primitive: 'triangle strip',
    count: 4,
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height
},
    // Bind UBO if available
    ...(useUBO && ubo?.glBuffer && ubo?.bind
      ? {
          context: { ubo: ubo },
          before: function bindUBO(context) {
            const gl = regl._gl;
            const program = gl.getParameter(gl.CURRENT_PROGRAM);
            if (program && context.ubo) {
              context.ubo.update({
                iterations: params.iterations,
                zoom: params.zoom,
                offset: params.offset,
                juliaC: { x: 0, y: 0 },
                xScale: params.xScale,
                yScale: params.yScale
});
              context.ubo.bind(program);
            }
          }
}
      : {})
});

  return drawFractal;
}

export const is2D = true;

/**
 * Configuration for Fractal Islands fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'midnight'
},
  initialPosition: {
    zoom: 0.619,
    offset: { x: 0.2327, y: -0.0014 }
},
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
  // Interesting bounds for "surprise me" - Fractal islands are always interesting
  interestingBounds: {
    offsetX: [-1, 1],
    offsetY: [-1, 1],
    zoom: [0.5, 10],
  }
};
