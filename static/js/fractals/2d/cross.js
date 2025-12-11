import {
  generatePaletteTexture,
  createFragmentShader,
  getVertexShader
} from '../utils.js';

const fractalFunction = `
// Cross Fractal (T-Square Fractal)
// Recursively subdivides squares and removes specific quadrants

bool isInCrossFractal(vec2 p, int maxIter) {
    // Normalize to [0, 1] range
    vec2 pos = p * 0.5 + 0.5;

    // Check if we're outside the base square [-1, 1]
    if (p.x < -1.0 || p.x > 1.0 || p.y < -1.0 || p.y > 1.0) {
        return false;
    }

    // Iteratively check each level
    // At each level, we divide into 4 quadrants and remove the top-right one
    vec2 currentPos = pos;
    float currentScale = 1.0;

    for (int i = 0; i < 10; i++) {
        if (i >= maxIter) break;

        // Normalize to [0, 1] within current square
        vec2 localPos = currentPos / currentScale;

        // Determine which quadrant we're in
        vec2 quadrant = floor(localPos * 2.0);

        // Check if we're in the top-right quadrant (1, 1)
        if (quadrant.x == 1.0 && quadrant.y == 1.0) {
            return false; // In removed quadrant
        }

        // Move to next level - focus on the current quadrant
        currentScale /= 2.0;
        currentPos = fract(localPos * 2.0) * currentScale;
    }

    return true;
}

float computeFractal(vec2 c) {
    int iterations = int(clamp(uIterations / 15.0, 1.0, 8.0));

    // c is already transformed by zoom/offset in utils.js
    // Check if point is in the Cross fractal
    if (!isInCrossFractal(c, iterations)) {
        // Point is in a removed square - return 0 for black
        return 0.0;
    }

    // Point is in the fractal - calculate depth for interesting coloring
    float depth = 0.0;
    vec2 pos = c * 0.5 + 0.5;
    vec2 currentPos = pos;
    float currentScale = 1.0;

    for (int i = 0; i < 10; i++) {
        if (i >= iterations) break;

        // Normalize to [0, 1] within current square
        vec2 localPos = currentPos / currentScale;

        // Determine which quadrant we're in
        vec2 quadrant = floor(localPos * 2.0);

        // Color based on which quadrant (bottom-left=0, bottom-right=1, top-left=2)
        if (quadrant.x == 0.0 && quadrant.y == 0.0) {
            depth += 10.0; // Bottom-left
        } else if (quadrant.x == 1.0 && quadrant.y == 0.0) {
            depth += 7.0; // Bottom-right
        } else if (quadrant.x == 0.0 && quadrant.y == 1.0) {
            depth += 5.0; // Top-left
        }

        // Add distance-based variation
        vec2 center = (quadrant + 0.5) / 2.0;
        float distFromCenter = length(localPos - center);
        depth += distFromCenter * 3.0;

        // Move to next level
        currentScale /= 2.0;
        currentPos = fract(localPos * 2.0) * currentScale;
    }

    // Return color intensity based on depth - must be less than uIterations to be colored
    return mod(depth * 6.0, uIterations * 0.9);
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
      : {}),
    primitive: 'triangle strip',
    count: 4,
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height
}
});

  return drawFractal;
}

export const is2D = true;

/**
 * Configuration for Cross fractal
 */
export const config = {
  initialSettings: {
    iterations: 240,
    xScale: 1.0,
    yScale: 1.0,
    colorScheme: 'coral'
},
  initialPosition: {
    zoom: 1.357,
    offset: { x: -0.1595, y: 0.0074 }
  },
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1
},
  // Interesting bounds for "surprise me" - Cross fractal is always interesting
  interestingBounds: {
    offsetX: [-1, 1],
    offsetY: [-1, 1],
    zoom: [0.5, 10],
  }
};
