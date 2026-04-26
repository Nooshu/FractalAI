import { createStandardDrawCommand } from '../utils.js';

function createSierpinskiCarpetShader({ useUBO }) {
  // Palette-colored Sierpinski carpet shader:
  // - black holes/background
  // - filled squares sample from uPalette so UI themes work
  // - recursion depth mapped from the iterations slider
  if (useUBO) {
    return `#version 300 es
    precision highp float;
    precision lowp sampler2D;

    uniform float uIterations;
    uniform float uZoom;
    uniform vec2 uOffset;
    uniform vec2 uScale; // xScale, yScale
    uniform float uTime;
    uniform vec2 uResolution;
    uniform sampler2D uPalette;

    in vec2 vUv;
    out vec4 fragColor;

    float carpetLevel(vec2 p, int maxIter) {
        if (p.x < -1.0 || p.x > 1.0 || p.y < -1.0 || p.y > 1.0) {
            return -1.0;
        }

        vec2 pos = p * 0.5 + 0.5; // [-1,1] -> [0,1]
        for (int i = 0; i < 12; i++) {
            if (i >= maxIter) break;
            vec2 scaled = pos * 3.0;
            vec2 cell = floor(scaled);
            if (cell.x == 1.0 && cell.y == 1.0) {
                return -1.0;
            }
            pos = fract(scaled);
        }
        // Subtle, deterministic variation within filled squares so palettes read well.
        // Use the final local position plus recursion depth to pick a palette coordinate.
        float v = fract(pos.x * 0.83 + pos.y * 0.57 + float(maxIter) * 0.11);
        return v;
    }

    void main() {
        float aspect = uResolution.x / uResolution.y;
        float scale = 4.0 / uZoom;
        vec2 uvCentered = vUv - 0.5;
        vec2 c = vec2(
            uvCentered.x * scale * aspect * uScale.x + uOffset.x,
            uvCentered.y * scale * uScale.y + uOffset.y
        );

        // Map the global iterations slider to discrete recursion depth.
        // Matches the app’s general feel: higher iterations => deeper detail.
        int depth = int(clamp(floor(uIterations / 30.0), 1.0, 10.0));

        float lvl = carpetLevel(c, depth);
        if (lvl < 0.0) {
            fragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }

        vec3 color = texture(uPalette, vec2(clamp(lvl, 0.0, 1.0), 0.5)).rgb;
        fragColor = vec4(color, 1.0);
    }`;
  }

  return `
    precision highp float;
    precision lowp sampler2D;

    uniform float uTime;
    uniform float uIterations;
    uniform float uZoom;
    uniform vec2 uOffset;
    uniform vec2 uResolution;
    uniform sampler2D uPalette;
    uniform float uXScale;
    uniform float uYScale;

    varying vec2 vUv;

    float carpetLevel(vec2 p, int maxIter) {
        if (p.x < -1.0 || p.x > 1.0 || p.y < -1.0 || p.y > 1.0) {
            return -1.0;
        }

        vec2 pos = p * 0.5 + 0.5; // [-1,1] -> [0,1]
        for (int i = 0; i < 12; i++) {
            if (i >= maxIter) break;
            vec2 scaled = pos * 3.0;
            vec2 cell = floor(scaled);
            if (cell.x == 1.0 && cell.y == 1.0) {
                return -1.0;
            }
            pos = fract(scaled);
        }
        float v = fract(pos.x * 0.83 + pos.y * 0.57 + float(maxIter) * 0.11);
        return v;
    }

    void main() {
        float aspect = uResolution.x / uResolution.y;
        float scale = 4.0 / uZoom;
        vec2 uvCentered = vUv - 0.5;
        vec2 c = vec2(
            uvCentered.x * scale * aspect * uXScale + uOffset.x,
            uvCentered.y * scale * uYScale + uOffset.y
        );

        int depth = int(clamp(floor(uIterations / 30.0), 1.0, 10.0));

        float lvl = carpetLevel(c, depth);
        if (lvl < 0.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }

        vec3 color = texture2D(uPalette, vec2(clamp(lvl, 0.0, 1.0), 0.5)).rgb;
        gl_FragColor = vec4(color, 1.0);
    }
`;
}

export function render(regl, params, canvas, options = {}) {
  // Check if UBOs should be used (WebGL2 optimization)
  const webglCapabilities = options.webglCapabilities;
  const ubo = options.ubo;
  const useUBO = webglCapabilities?.isWebGL2 && ubo;

  const fragmentShader = createSierpinskiCarpetShader({ useUBO });

  // Use createStandardDrawCommand for UBO support
  return createStandardDrawCommand(regl, params, canvas, fragmentShader, {
    webglCapabilities,
    ubo,
    juliaC: { x: 0, y: 0 }, // Not used for Sierpinski Carpet
  });
}

export const is2D = true;

/**
 * Configuration for Sierpinski Carpet fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'purple',
  },
  initialPosition: {
    zoom: 1.589,
    offset: { x: 0.0619, y: 0.0653 },
  },
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
  // Interesting bounds for "surprise me" - Sierpinski carpet is always interesting
  interestingBounds: {
    offsetX: [-1, 1],
    offsetY: [-1, 1],
    zoom: [0.5, 10],
  },
};
