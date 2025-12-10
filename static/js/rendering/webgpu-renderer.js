/**
 * WebGPU Renderer
 * Provides WebGPU-based rendering with compute shader support for fractals
 * Falls back to WebGL if WebGPU is not available or disabled
 */

/**
 * Create a WebGPU compute shader for Mandelbrot set computation
 * @param {Object} device - WebGPU device
 * @returns {Object} Compute pipeline and related resources
 */
function createMandelbrotComputePipeline(device) {
  // WebGPU compute shader for Mandelbrot set
  const computeShaderCode = `
    @group(0) @binding(0) var<uniform> params: Params;
    @group(0) @binding(1) var<storage, read_write> output: array<u32>;

    struct Params {
      width: u32,
      height: u32,
      iterations: u32,
      zoom: f32,
      offsetX: f32,
      offsetY: f32,
      xScale: f32,
      yScale: f32,
    };

    @compute @workgroup_size(8, 8)
    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
      let index = global_id.y * params.width + global_id.x;
      
      if (global_id.x >= params.width || global_id.y >= params.height) {
        return;
      }

      // Normalize coordinates
      let x = (f32(global_id.x) / f32(params.width)) * 2.0 - 1.0;
      let y = (f32(global_id.y) / f32(params.height)) * 2.0 - 1.0;
      
      // Apply zoom and offset
      let cx = x * params.xScale / params.zoom + params.offsetX;
      let cy = y * params.yScale / params.zoom + params.offsetY;

      // Mandelbrot iteration
      var zx = 0.0;
      var zy = 0.0;
      var iter = 0u;
      
      for (var i = 0u; i < params.iterations; i++) {
        let zx2 = zx * zx;
        let zy2 = zy * zy;
        
        if (zx2 + zy2 > 4.0) {
          break;
        }
        
        zy = 2.0 * zx * zy + cy;
        zx = zx2 - zy2 + cx;
        iter = i;
      }

      // Store iteration count
      output[index] = iter;
    }
  `;

  // Create shader module
  const shaderModule = device.createShaderModule({
    code: computeShaderCode,
  });

  // Create compute pipeline
  const computePipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: shaderModule,
      entryPoint: 'main',
    },
  });

  return {
    pipeline: computePipeline,
    shaderModule,
  };
}

/**
 * Create a render pipeline for displaying the computed fractal
 * @param {Object} device - WebGPU device
 * @param {Object} format - Texture format (e.g., 'bgra8unorm')
 * @returns {Object} Render pipeline
 */
function createRenderPipeline(device, format) {
  const vertexShaderCode = `
    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
    };

    @vertex
    fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
      var output: VertexOutput;
      let x = f32((vertex_index << 1u) & 2u) * 2.0 - 1.0;
      let y = f32(vertex_index & 2u) * 2.0 - 1.0;
      output.position = vec4<f32>(x, y, 0.0, 1.0);
      output.uv = vec2<f32>(x * 0.5 + 0.5, y * 0.5 + 0.5);
      return output;
    }
  `;

  const fragmentShaderCode = `
    @group(0) @binding(0) var inputTexture: texture_2d<u32>;
    @group(0) @binding(1) var paletteTexture: texture_2d<f32>;
    @group(0) @binding(2) var sampler: sampler;

    @fragment
    fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
      let iterations = textureLoad(inputTexture, vec2<i32>(uv * vec2<f32>(textureDimensions(inputTexture))), 0);
      let t = f32(iterations.x) / 100.0; // Normalize iterations
      let paletteColor = textureSample(paletteTexture, sampler, vec2<f32>(t, 0.5));
      return paletteColor;
    }
  `;

  const vertexModule = device.createShaderModule({ code: vertexShaderCode });
  const fragmentModule = device.createShaderModule({ code: fragmentShaderCode });

  const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: vertexModule,
      entryPoint: 'vs_main',
    },
    fragment: {
      module: fragmentModule,
      entryPoint: 'fs_main',
      targets: [{ format }],
    },
    primitive: {
      topology: 'triangle-strip',
    },
  });

  return renderPipeline;
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

    // Create compute pipeline
    this.computePipeline = createMandelbrotComputePipeline(this.device);
    
    // Create render pipeline
    this.renderPipeline = createRenderPipeline(this.device, this.format);

    // Create bind group layouts
    this.computeBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' },
        },
      ],
    });

    this.renderBindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
      ],
    });
  }

  /**
   * Render fractal using WebGPU compute shaders
   * @param {Object} params - Fractal parameters
   * @param {Object} paletteTexture - Palette texture
   */
  async render(params, _paletteTexture) {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Create output buffer for compute shader
    const outputBufferSize = width * height * 4; // u32 = 4 bytes
    const outputBuffer = this.device.createBuffer({
      size: outputBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    // Create uniform buffer
    const uniformBuffer = this.device.createBuffer({
      size: 32, // 8 floats * 4 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    const uniformData = new Float32Array(uniformBuffer.getMappedRange());
    uniformData.set([
      width,
      height,
      params.iterations || 100,
      params.zoom || 1.0,
      params.offset?.x || 0.0,
      params.offset?.y || 0.0,
      params.xScale || 1.0,
      params.yScale || 1.0,
    ]);
    uniformBuffer.unmap();

    // Create compute bind group
    const computeBindGroup = this.device.createBindGroup({
      layout: this.computeBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
      ],
    });

    // Dispatch compute shader
    const commandEncoder = this.device.createCommandEncoder();
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(this.computePipeline.pipeline);
    computePass.setBindGroup(0, computeBindGroup);
    computePass.dispatchWorkgroups(
      Math.ceil(width / 8),
      Math.ceil(height / 8),
      1
    );
    computePass.end();

    // Create texture from output buffer
    const outputTexture = this.device.createTexture({
      size: [width, height],
      format: 'r32uint',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    // Copy buffer to texture
    commandEncoder.copyBufferToTexture(
      { buffer: outputBuffer, bytesPerRow: width * 4 },
      { texture: outputTexture },
      [width, height]
    );

    // Render to canvas
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: 'clear',
          clearValue: [0, 0, 0, 1],
          storeOp: 'store',
        },
      ],
    });

    renderPass.setPipeline(this.renderPipeline);
    // TODO: Set bind groups for render pass
    renderPass.draw(4, 1, 0, 0);
    renderPass.end();

    // Submit commands
    this.device.queue.submit([commandEncoder.finish()]);

    // Cleanup
    outputBuffer.destroy();
    uniformBuffer.destroy();
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // WebGPU resources are automatically cleaned up when device is lost
    // but we can explicitly clean up if needed
    if (this.device) {
      this.device.destroy();
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
  const { CONFIG } = await import('../core/config.js');
  const { devLog } = await import('../core/logger.js');

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

