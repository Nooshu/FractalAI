import { Buffer, Texture } from '@luma.gl/core';
import { computeColorForScheme, getColorSchemeIndex } from '../fractals/utils.js';

const PALETTE_SIZE = 512;

function clampByte(x) {
  return Math.max(0, Math.min(255, x | 0));
}

function createPaletteBytes(colorScheme) {
  const scheme =
    typeof colorScheme === 'string' && colorScheme.startsWith('custom:')
      ? colorScheme
      : getColorSchemeIndex(colorScheme);
  const data = new Uint8Array(PALETTE_SIZE * 4);
  const out = new Float32Array(3);
  for (let i = 0; i < PALETTE_SIZE; i++) {
    const t = i / (PALETTE_SIZE - 1);
    const rgb = computeColorForScheme(t, scheme, out);
    const o = i * 4;
    data[o + 0] = clampByte(rgb[0] * 255);
    data[o + 1] = clampByte(rgb[1] * 255);
    data[o + 2] = clampByte(rgb[2] * 255);
    data[o + 3] = 255;
  }
  return data;
}

/**
 * std140 packing helpers.
 *
 * FractalParams layout (std140):
 * - float uIterations (0)
 * - float uZoom (4)
 * - vec2  uOffset (8)
 * - vec2  uJuliaC (16)
 * - vec2  uScale (24)
 * Total: 32 bytes (rounded to 16-byte multiple)
 */
function packFractalParamsStd140(params) {
  const buf = new ArrayBuffer(32);
  const f32 = new Float32Array(buf);
  f32[0] = params.iterations ?? 1;
  f32[1] = params.zoom ?? 1;
  f32[2] = params.offset?.x ?? 0;
  f32[3] = params.offset?.y ?? 0;
  f32[4] = params.juliaC?.x ?? 0;
  f32[5] = params.juliaC?.y ?? 0;
  f32[6] = params.xScale ?? 1;
  f32[7] = params.yScale ?? 1;
  return buf;
}

/**
 * FrameParams layout (std140):
 * - float uTime (0)
 * - float _pad0 (4)
 * - vec2  uResolution (8)
 * Total: 16 bytes
 */
function packFrameParamsStd140(canvas, timeSeconds = 0) {
  const buf = new ArrayBuffer(16);
  const f32 = new Float32Array(buf);
  f32[0] = timeSeconds;
  f32[1] = 0;
  f32[2] = canvas?.width ?? 1;
  f32[3] = canvas?.height ?? 1;
  return buf;
}

export function createLumaFragmentShader(fractalFunction) {
  // WebGL2-only GLSL 300, using uniform buffers for portability with luma.gl.
  return `#version 300 es
  precision mediump float;
  precision lowp sampler2D;

  layout(std140) uniform FrameParams {
    float uTime;
    vec2 uResolution;
  };

  layout(std140) uniform FractalParams {
    float uIterations;
    float uZoom;
    vec2 uOffset;
    vec2 uJuliaC;
    vec2 uScale;
  };

  #define uXScale uScale.x
  #define uYScale uScale.y

  uniform sampler2D uPalette;

  in vec2 vUv;
  out vec4 fragColor;

  const float INV_LOG2 = 1.4426950408889634;
  const float ESCAPE_RADIUS_SQ = 4.0;

  ${fractalFunction}

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    float scale = 4.0 / uZoom;
    vec2 uvCentered = uv - 0.5;
    vec2 c = vec2(
      uvCentered.x * scale * aspect * uScale.x + uOffset.x,
      uvCentered.y * scale * uScale.y + uOffset.y
    );

    float iterations = computeFractal(c);
    float t = clamp(iterations / max(uIterations, 1.0), 0.0, 1.0);
    vec3 color = texture(uPalette, vec2(t, 0.5)).rgb;
    float isInSet = step(uIterations, iterations);
    color = mix(color, vec3(0.0), isInSet);
    fragColor = vec4(color, 1.0);
  }`;
}

export function createLumaVertexShader() {
  return `#version 300 es
  in vec2 position;
  out vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }`;
}

export class LumaFractalRenderer {
  constructor(device) {
    this.device = device;
    this._cache = new Map();
    this._palette = new Map(); // colorScheme -> {texture, sampler}

    // Fullscreen quad (triangle strip)
    this._quadBuffer = device.createBuffer({
      usage: Buffer.VERTEX,
      data: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    });
  }

  destroy() {
    try {
      this._quadBuffer?.destroy();
    } catch {
      // best-effort
    }
    for (const v of this._cache.values()) {
      try {
        v.vs?.destroy();
        v.fs?.destroy();
        v.pipeline?.destroy?.();
        v.vertexArray?.destroy?.();
        v.fractalParams?.destroy?.();
        v.frameParams?.destroy?.();
      } catch {
        // ignore
      }
    }
    for (const v of this._palette.values()) {
      try {
        v.texture?.destroy();
        v.sampler?.destroy?.();
      } catch {
        // ignore
      }
    }
    this._cache.clear();
    this._palette.clear();
  }

  _getPalette(colorScheme) {
    if (this._palette.has(colorScheme)) return this._palette.get(colorScheme);

    const bytes = createPaletteBytes(colorScheme);
    const texture = this.device.createTexture({
      id: `palette:${String(colorScheme)}`,
      format: 'rgba8unorm',
      width: PALETTE_SIZE,
      height: 1,
      usage: Texture.SAMPLE | Texture.COPY_DST,
    });
    texture.writeData(bytes, { width: PALETTE_SIZE, height: 1, bytesPerRow: PALETTE_SIZE * 4 });

    // Use texture default sampler, but we keep an explicit sampler for binding clarity.
    const sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });

    const entry = { texture, sampler };
    this._palette.set(colorScheme, entry);
    return entry;
  }

  /**
   * Returns a draw function `draw(overrideParams?)`.
   */
  getDrawCommand(cacheKey, fragmentShaderSource, initialParams, canvas) {
    const existing = this._cache.get(cacheKey);
    if (existing) {
      return this._makeDraw(existing, initialParams, canvas);
    }

    const vs = this.device.createShader({
      id: `${cacheKey}:vs`,
      stage: 'vertex',
      language: 'glsl',
      source: createLumaVertexShader(),
    });
    const fs = this.device.createShader({
      id: `${cacheKey}:fs`,
      stage: 'fragment',
      language: 'glsl',
      source: fragmentShaderSource,
    });

    const pipeline = this.device.createRenderPipeline({
      id: `${cacheKey}:pipeline`,
      vs,
      fs,
      topology: 'triangle-strip',
      shaderLayout: {
        attributes: [{ name: 'position', location: 0, type: 'vec2<f32>' }],
        bindings: [
          { name: 'FrameParams', type: 'uniform', group: 0, location: 0 },
          { name: 'FractalParams', type: 'uniform', group: 0, location: 1 },
          { name: 'uPalette', type: 'texture', group: 0, location: 2 },
          { name: 'uPaletteSampler', type: 'sampler', group: 0, location: 3 },
        ],
      },
      bufferLayout: [{ name: 'position', byteStride: 8, attributes: [{ location: 0, format: 'float32x2' }] }],
    });

    const vertexArray = this.device.createVertexArray({ renderPipeline: pipeline });
    vertexArray.setBuffer(0, this._quadBuffer);

    const frameParams = this.device.createBuffer({
      usage: Buffer.UNIFORM,
      byteLength: 16,
    });
    const fractalParams = this.device.createBuffer({
      usage: Buffer.UNIFORM,
      byteLength: 32,
    });

    const record = { vs, fs, pipeline, vertexArray, frameParams, fractalParams };
    this._cache.set(cacheKey, record);
    return this._makeDraw(record, initialParams, canvas);
  }

  _makeDraw(record, initialParams, canvas) {
    let lastParams = initialParams;
    return (overrideParams) => {
      const p = overrideParams ?? lastParams;
      lastParams = p;

      record.fractalParams.write(packFractalParamsStd140(p));
      record.frameParams.write(packFrameParamsStd140(canvas, 0));

      const { texture, sampler } = this._getPalette(p.colorScheme);

      const renderPass = this.device.beginRenderPass({
        clearColor: [0, 0, 0, 1],
      });

      record.pipeline.draw({
        renderPass,
        vertexArray: record.vertexArray,
        vertexCount: 4,
        bindings: {
          FrameParams: record.frameParams,
          FractalParams: record.fractalParams,
          uPalette: texture,
          uPaletteSampler: sampler,
        },
      });

      renderPass.end();
      this.device.submit();
    };
  }
}

