import {
  generatePaletteTexture,
  createFragmentShader,
  getVertexShader
} from '../utils.js';

const fractalFunction = `
// Pinwheel Tiling
// An aperiodic tiling using right triangles with substitution rules
// The tiling uses triangles with sides in ratio 1:2:√5

const float PI = 3.14159265359;
const float SQRT5 = 2.23606797749979; // sqrt(5)

// Check if a point is inside a right triangle using barycentric coordinates
bool isInsideTriangle(vec2 p, vec2 v0, vec2 v1, vec2 v2) {
    vec2 v0v1 = v1 - v0;
    vec2 v0v2 = v2 - v0;
    vec2 v0p = p - v0;

    float dot00 = dot(v0v2, v0v2);
    float dot01 = dot(v0v2, v0v1);
    float dot02 = dot(v0v2, v0p);
    float dot11 = dot(v0v1, v0v1);
    float dot12 = dot(v0v1, v0p);

    float invDenom = 1.0 / (dot00 * dot11 - dot01 * dot01);
    float u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    float v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return (u >= 0.0) && (v >= 0.0) && (u + v <= 1.0);
}

// Pinwheel substitution system
// Each triangle is subdivided into 5 smaller triangles
float computeFractal(vec2 c) {
    int iterations = int(clamp(uIterations / 20.0, 1.0, 6.0));

    // Normalize coordinates to [0, 1] range
    vec2 pos = c * 0.5 + 0.5;
    pos = clamp(pos, 0.0, 1.0);

    // Start with a base right triangle covering the unit square
    // Right triangle: vertices at (0,0), (1,0), (0,2) scaled to fit
    float baseSize = 1.0;
    vec2 v0 = vec2(0.0, 0.0);
    vec2 v1 = vec2(baseSize, 0.0);
    vec2 v2 = vec2(0.0, baseSize * 2.0);

    // Transform point to triangle space
    // Map square [0,1]x[0,1] to triangle
    vec2 trianglePos = vec2(
        pos.x * baseSize,
        pos.y * baseSize * 2.0 * (1.0 - pos.x * 0.5)
    );

    // Check if inside base triangle
    if (!isInsideTriangle(trianglePos, v0, v1, v2)) {
        return 0.0;
    }

    // Apply substitution rules iteratively
    float depth = 0.0;
    vec2 currentPos = trianglePos;
    vec2 currentV0 = v0;
    vec2 currentV1 = v1;
    vec2 currentV2 = v2;

    for (int i = 0; i < 6; i++) {
        if (i >= iterations) break;

        // Calculate midpoints for subdivision
        vec2 mid01 = (currentV0 + currentV1) * 0.5;
        vec2 mid02 = (currentV0 + currentV2) * 0.5;
        vec2 mid12 = (currentV1 + currentV2) * 0.5;

        // Pinwheel substitution creates 5 triangles
        // Check which triangle contains the point
        bool found = false;

        // Triangle 1: v0, mid01, mid02
        if (isInsideTriangle(currentPos, currentV0, mid01, mid02)) {
            currentV0 = currentV0;
            currentV1 = mid01;
            currentV2 = mid02;
            depth += 1.0;
            found = true;
        }
        // Triangle 2: mid01, v1, mid12
        else if (isInsideTriangle(currentPos, mid01, currentV1, mid12)) {
            currentV0 = mid01;
            currentV1 = currentV1;
            currentV2 = mid12;
            depth += 2.0;
            found = true;
        }
        // Triangle 3: mid02, mid12, v2
        else if (isInsideTriangle(currentPos, mid02, mid12, currentV2)) {
            currentV0 = mid02;
            currentV1 = mid12;
            currentV2 = currentV2;
            depth += 3.0;
            found = true;
        }
        // Triangle 4: mid01, mid02, mid12 (center)
        else if (isInsideTriangle(currentPos, mid01, mid02, mid12)) {
            currentV0 = mid01;
            currentV1 = mid02;
            currentV2 = mid12;
            depth += 4.0;
            found = true;
        }
        // Triangle 5: Alternative center triangle
        else if (isInsideTriangle(currentPos, mid02, mid01, mid12)) {
            currentV0 = mid02;
            currentV1 = mid01;
            currentV2 = mid12;
            depth += 5.0;
            found = true;
        }

        if (!found) {
            return depth * 20.0;
        }
    }

    // Return depth for coloring
    return depth * 12.0 + float(iterations) * 8.0;
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
 * Configuration for Pinwheel Tiling fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow-shifted'
},
  initialPosition: {
    zoom: 0.637,
    offset: { x: -2.2096, y: -1.3394 }
},
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
  // Interesting bounds for "surprise me" - Pinwheel tiling has specific viewing area
  interestingBounds: {
    offsetX: [-3, 3],
    offsetY: [-2, 2],
    zoom: [0.5, 10],
  }
};
