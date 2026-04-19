/**
 * WebGPU Renderer
 * WebGPU-first renderer for the Mandelbrot family (Mandelbrot / Julia / Multibrot).
 */

import { CONFIG } from '../core/config.js';
import { devLog } from '../core/logger.js';
import { computeColorForScheme } from '../fractals/utils.js';
import { isWebGPUFirstFractalType } from './webgpu-fractals.js';

const WORKGROUP_SIZE = 8;
const PALETTE_SIZE = 512;
const PARAMS_SIZE_BYTES = 48;

function clampByte(x) {
  return Math.max(0, Math.min(255, x | 0));
}

function createPaletteBytes(colorScheme) {
  const data = new Uint8Array(PALETTE_SIZE * 4);
  const out = new Float32Array(3);
  for (let i = 0; i < PALETTE_SIZE; i++) {
    const t = i / (PALETTE_SIZE - 1);
    const rgb = computeColorForScheme(t, colorScheme, out);
    const o = i * 4;
    data[o + 0] = clampByte(rgb[0] * 255);
    data[o + 1] = clampByte(rgb[1] * 255);
    data[o + 2] = clampByte(rgb[2] * 255);
    data[o + 3] = 255;
  }
  return data;
}

function createPipelines(device, presentationFormat) {
  const computeShaderCode = `
struct Params {
  width: u32,
  height: u32,
  iterations: u32,
  mode: u32, /* 0=mandelbrot, 1=julia */
  zoom: f32,
  offsetX: f32,
  offsetY: f32,
  order: f32, /* multibrot order (2..10) */
  xScale: f32,
  yScale: f32,
  juliaCX: f32,
  juliaCY: f32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var paletteTex: texture_2d<f32>;
@group(0) @binding(2) var paletteSampler: sampler;
@group(0) @binding(3) var outTex: texture_storage_2d<rgba8unorm, write>;

fn complexPow(z: vec2<f32>, n: f32) -> vec2<f32> {
  if (abs(n - 2.0) < 0.0001) {
    return vec2<f32>(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
  }
  let r = length(z);
  if (r < 0.000001) {
    return vec2<f32>(0.0, 0.0);
  }
  let theta = atan2(z.y, z.x);
  let rn = pow(r, n);
  let nt = n * theta;
  return vec2<f32>(rn * cos(nt), rn * sin(nt));
}

@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.width || gid.y >= params.height) {
    return;
  }

  let w = f32(params.width);
  let h = f32(params.height);
  let uv = (vec2<f32>(f32(gid.x) + 0.5, f32(gid.y) + 0.5) / vec2<f32>(w, h));

  let aspect = w / h;
  let scale = 4.0 / params.zoom;

  // Coordinate transform matches our WebGL shaders: xScale usually 1.0; yScale can stretch.
  let c = vec2<f32>(
    (uv.x - 0.5) * scale * aspect + params.offsetX,
    (uv.y - 0.5) * scale * params.yScale + params.offsetY
  );

  var z = vec2<f32>(0.0, 0.0);
  var cc = c;
  if (params.mode == 1u) {
    z = c;
    cc = vec2<f32>(params.juliaCX, params.juliaCY);
  }

  let maxIter = max(1u, params.iterations);
  let order = clamp(params.order, 2.0, 10.0);

  var i: u32 = 0u;
  loop {
    if (i >= maxIter) { break; }
    if (dot(z, z) > 4.0) { break; }
    z = complexPow(z, order) + cc;
    i = i + 1u;
  }

  var color: vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 1.0);
  if (i < maxIter) {
    let t = clamp(f32(i) / f32(maxIter), 0.0, 1.0);
    color = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(t, 0.5), 0.0);
    color.a = 1.0;
  }

  textureStore(outTex, vec2<i32>(i32(gid.x), i32(gid.y)), color);
}
`;

  const renderShaderCode = `
struct VSOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  var out: VSOut;
  let x = f32((vid << 1u) & 2u) * 2.0 - 1.0;
  let y = f32(vid & 2u) * 2.0 - 1.0;
  out.pos = vec4<f32>(x, y, 0.0, 1.0);
  out.uv = vec2<f32>(x * 0.5 + 0.5, y * 0.5 + 0.5);
  return out;
}

@group(0) @binding(0) var img: texture_2d<f32>;
@group(0) @binding(1) var imgSampler: sampler;

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  return textureSample(img, imgSampler, uv);
}
`;

  const computeModule = device.createShaderModule({ code: computeShaderCode });
  const renderModule = device.createShaderModule({ code: renderShaderCode });

  const computePipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module: computeModule, entryPoint: 'main' },
  });

  const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: renderModule, entryPoint: 'vs_main' },
    fragment: { module: renderModule, entryPoint: 'fs_main', targets: [{ format: presentationFormat }] },
    primitive: { topology: 'triangle-strip' },
  });

  return { computePipeline, renderPipeline };
}

/**
 * WebGPU Renderer class
 */
export class WebGPURenderer {
  /**
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} capabilities - WebGPU capabilities
   */
  constructor(canvas, capabilities) {
    this.canvas = canvas;
    this.device = capabilities.device;
    this.adapter = capabilities.adapter;
    this.format = capabilities.format || 'bgra8unorm';

    // Initialize context
    this.context = canvas.getContext('webgpu');
    if (!this.context) {
      throw new Error('WebGPU context not available');
    }

    // Configure context
    this.context.configure({
      device: this.device,
      format: this.format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });

    const presentationFormat = this.format;
    const { computePipeline, renderPipeline } = createPipelines(this.device, presentationFormat);
    this.computePipeline = computePipeline;
    this.renderPipeline = renderPipeline;

    this.paramsBuffer = this.device.createBuffer({
      size: PARAMS_SIZE_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.paletteSampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });

    this.imageSampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });

    this.paletteTexture = null;
    this.paletteColorScheme = null;
    this.outputTexture = null;
    this.outputView = null;
    this.outputWidth = 0;
    this.outputHeight = 0;
  }

  /**
   * Render fractal using WebGPU compute shaders
   * @param {Object} params - Fractal parameters
   * @param {Object} paletteTexture - Palette texture
   */
  async render(fractalType, params) {
    if (!isWebGPUFirstFractalType(fractalType)) return;

    const width = Math.max(1, this.canvas.width | 0);
    const height = Math.max(1, this.canvas.height | 0);

    if (this.outputTexture === null || this.outputWidth !== width || this.outputHeight !== height) {
      if (this.outputTexture) {
        this.outputTexture.destroy();
      }
      this.outputTexture = this.device.createTexture({
        size: [width, height],
        format: 'rgba8unorm',
        usage:
          GPUTextureUsage.STORAGE_BINDING |
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_SRC,
      });
      this.outputView = this.outputTexture.createView();
      this.outputWidth = width;
      this.outputHeight = height;
    }

    if (this.paletteTexture === null || this.paletteColorScheme !== params.colorScheme) {
      const bytes = createPaletteBytes(params.colorScheme);
      if (this.paletteTexture) this.paletteTexture.destroy();
      this.paletteTexture = this.device.createTexture({
        size: [PALETTE_SIZE, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      });
      this.device.queue.writeTexture(
        { texture: this.paletteTexture },
        bytes,
        { bytesPerRow: PALETTE_SIZE * 4, rowsPerImage: 1 },
        { width: PALETTE_SIZE, height: 1, depthOrArrayLayers: 1 }
      );
      this.paletteColorScheme = params.colorScheme;
    }

    const mode = fractalType.includes('julia') || fractalType === 'julia' ? 1 : 0;
    const isMultibrot = fractalType === 'multibrot' || fractalType === 'multibrot-julia';
    const order = isMultibrot ? 2.0 + (params.xScale ?? 0) * 8.0 : 2.0;

    const buf = new ArrayBuffer(PARAMS_SIZE_BYTES);
    const u32 = new Uint32Array(buf, 0, 4);
    const f32 = new Float32Array(buf, 16);

    u32[0] = width;
    u32[1] = height;
    u32[2] = Math.max(1, params.iterations | 0);
    u32[3] = mode;

    f32[0] = params.zoom ?? 1.0;
    f32[1] = params.offset?.x ?? 0.0;
    f32[2] = params.offset?.y ?? 0.0;
    f32[3] = Math.max(2.0, Math.min(10.0, order));
    f32[4] = params.xScale ?? 1.0;
    f32[5] = params.yScale ?? 1.0;
    f32[6] = params.juliaC?.x ?? 0.0;
    f32[7] = params.juliaC?.y ?? 0.0;

    this.device.queue.writeBuffer(this.paramsBuffer, 0, buf);

    const computeBindGroup = this.device.createBindGroup({
      layout: this.computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.paramsBuffer } },
        { binding: 1, resource: this.paletteTexture.createView() },
        { binding: 2, resource: this.paletteSampler },
        { binding: 3, resource: this.outputView },
      ],
    });

    const renderBindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.outputView },
        { binding: 1, resource: this.imageSampler },
      ],
    });

    const encoder = this.device.createCommandEncoder();

    const computePass = encoder.beginComputePass();
    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, computeBindGroup);
    computePass.dispatchWorkgroups(
      Math.ceil(width / WORKGROUP_SIZE),
      Math.ceil(height / WORKGROUP_SIZE),
      1
    );
    computePass.end();

    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: 'clear',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          storeOp: 'store',
        },
      ],
    });
    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, renderBindGroup);
    renderPass.draw(4, 1, 0, 0);
    renderPass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    try {
      if (this.outputTexture) this.outputTexture.destroy();
      if (this.paletteTexture) this.paletteTexture.destroy();
    } catch {
      // best-effort
    }
  }
}

/**
 * Initialize WebGPU renderer
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} options - Initialization options
 * @returns {Promise<Object>} Promise resolving to renderer or null if not available
 */
export async function initWebGPURenderer(canvas, options = {}) {
  const { initWebGPU, formatWebGPUCapabilities } = await import('./webgpu-capabilities.js');

  // Check if WebGPU is enabled
  if (!CONFIG.features.webgpu) {
    return null;
  }

  // Initialize WebGPU
  const capabilities = await initWebGPU({
    powerPreference: options.powerPreference || 'high-performance',
  });

  if (!capabilities.supported) {
    if (import.meta.env?.DEV) {
      console.warn(
        `%c[WebGPU]%c ${capabilities.error || 'Not supported'}`,
        'color: #FF9800; font-weight: bold;',
        'color: inherit;'
      );
    }
    return null;
  }

  // Log capabilities in development
  devLog.log(
    `%c[WebGPU Capabilities]%c\n${formatWebGPUCapabilities(capabilities)}`,
    'color: #9C27B0; font-weight: bold;',
    'color: inherit; font-family: monospace; font-size: 11px;'
  );

  try {
    const renderer = new WebGPURenderer(canvas, {
      ...capabilities,
      format: 'bgra8unorm',
    });
    return renderer;
  } catch (error) {
    console.error('Failed to create WebGPU renderer:', error);
    return null;
  }
}
