import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createFractalParamsUBO,
  getFractalParamsShaderCode,
  getScaleAccessCode,
  createUniformsConfig,
  getUniformBlockConfig,
} from '../../static/js/rendering/uniform-buffer.js';

describe('uniform-buffer', () => {
  let mockGl;
  let mockRegl;
  let mockBuffer;
  let mockProgram;

  beforeEach(() => {
    mockBuffer = {};
    mockProgram = {};

    mockGl = {
      createBuffer: vi.fn(() => mockBuffer),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      bufferSubData: vi.fn(),
      deleteBuffer: vi.fn(),
      getUniformBlockIndex: vi.fn(() => 0),
      uniformBlockBinding: vi.fn(),
      bindBufferBase: vi.fn(),
      UNIFORM_BUFFER: 0x8A11,
      DYNAMIC_DRAW: 0x88E8,
      INVALID_INDEX: 0xFFFFFFFF,
    };

    mockRegl = {
      _gl: mockGl,
    };

    // Mock WebGL2RenderingContext - make mockGl an instance of it
    global.WebGL2RenderingContext = function WebGL2RenderingContext() {};
    Object.setPrototypeOf(mockGl, WebGL2RenderingContext.prototype);
  });

  describe('createFractalParamsUBO', () => {
    it('should return null if webglCapabilities is not provided', () => {
      const result = createFractalParamsUBO(mockRegl, null);
      expect(result).toBeNull();
    });

    it('should return null if not WebGL2', () => {
      const webglCapabilities = { isWebGL2: false };
      const result = createFractalParamsUBO(mockRegl, webglCapabilities);
      expect(result).toBeNull();
    });

    it('should return null if gl is not WebGL2RenderingContext', () => {
      const webglCapabilities = { isWebGL2: true };
      mockRegl._gl = {};
      const result = createFractalParamsUBO(mockRegl, webglCapabilities);
      expect(result).toBeNull();
    });

    it('should create UBO when WebGL2 is available', () => {
      const webglCapabilities = { isWebGL2: true };
      // mockGl is already set up as WebGL2RenderingContext instance in beforeEach

      const result = createFractalParamsUBO(mockRegl, webglCapabilities);

      expect(mockGl.createBuffer).toHaveBeenCalled();
      expect(mockGl.bindBuffer).toHaveBeenCalledWith(mockGl.UNIFORM_BUFFER, mockBuffer);
      expect(mockGl.bufferData).toHaveBeenCalledWith(
        mockGl.UNIFORM_BUFFER,
        32, // 8 floats * 4 bytes
        mockGl.DYNAMIC_DRAW
      );
      expect(mockGl.bindBuffer).toHaveBeenCalledWith(mockGl.UNIFORM_BUFFER, null);

      expect(result).toHaveProperty('glBuffer', mockBuffer);
      expect(result).toHaveProperty('gl', mockGl);
      expect(result).toHaveProperty('update');
      expect(result).toHaveProperty('bind');
      expect(result).toHaveProperty('destroy');
    });

    it('should update UBO with correct parameters', () => {
      const webglCapabilities = { isWebGL2: true };

      const ubo = createFractalParamsUBO(mockRegl, webglCapabilities);
      const params = {
        iterations: 100,
        zoom: 2.5,
        offset: { x: 0.1, y: 0.2 },
        juliaC: { x: 0.3, y: 0.4 },
        xScale: 1.5,
        yScale: 2.0,
      };

      ubo.update(params);

      expect(mockGl.bindBuffer).toHaveBeenCalledWith(mockGl.UNIFORM_BUFFER, mockBuffer);
      expect(mockGl.bufferSubData).toHaveBeenCalledWith(
        mockGl.UNIFORM_BUFFER,
        0,
        expect.any(Float32Array)
      );
      expect(mockGl.bufferSubData.mock.calls[0][2]).toEqual(
        new Float32Array([100, 2.5, 0.1, 0.2, 0.3, 0.4, 1.5, 2.0])
      );
      expect(mockGl.bindBuffer).toHaveBeenCalledWith(mockGl.UNIFORM_BUFFER, null);
    });

    it('should handle missing parameters with defaults', () => {
      const webglCapabilities = { isWebGL2: true };

      const ubo = createFractalParamsUBO(mockRegl, webglCapabilities);
      ubo.update({});

      const data = mockGl.bufferSubData.mock.calls[0][2];
      expect(data).toEqual(new Float32Array([0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0]));
    });

    it('should bind UBO to program', () => {
      const webglCapabilities = { isWebGL2: true };

      const ubo = createFractalParamsUBO(mockRegl, webglCapabilities);
      const result = ubo.bind(mockProgram, 'FractalParams', 0);

      expect(mockGl.getUniformBlockIndex).toHaveBeenCalledWith(mockProgram, 'FractalParams');
      expect(mockGl.uniformBlockBinding).toHaveBeenCalledWith(mockProgram, 0, 0);
      expect(mockGl.bindBufferBase).toHaveBeenCalledWith(mockGl.UNIFORM_BUFFER, 0, mockBuffer);
      expect(result).toBe(true);
    });

    it('should return false if uniform block index is invalid', () => {
      const webglCapabilities = { isWebGL2: true };
      mockGl.getUniformBlockIndex.mockReturnValue(mockGl.INVALID_INDEX);

      const ubo = createFractalParamsUBO(mockRegl, webglCapabilities);
      const result = ubo.bind(mockProgram, 'FractalParams', 0);

      expect(result).toBe(false);
      expect(mockGl.uniformBlockBinding).not.toHaveBeenCalled();
      expect(mockGl.bindBufferBase).not.toHaveBeenCalled();
    });

    it('should destroy UBO buffer', () => {
      const webglCapabilities = { isWebGL2: true };

      const ubo = createFractalParamsUBO(mockRegl, webglCapabilities);
      ubo.destroy();

      expect(mockGl.deleteBuffer).toHaveBeenCalledWith(mockBuffer);
    });
  });

  describe('getFractalParamsShaderCode', () => {
    it('should return WebGL2 UBO shader code when useUBO is true', () => {
      const code = getFractalParamsShaderCode(true);
      expect(code).toContain('#version 300 es');
      expect(code).toContain('layout(std140) uniform FractalParams');
      expect(code).toContain('float uIterations');
      expect(code).toContain('vec2 uOffset');
      expect(code).toContain('vec2 uScale');
    });

    it('should return WebGL1 uniform declarations when useUBO is false', () => {
      const code = getFractalParamsShaderCode(false);
      expect(code).toContain('uniform float uIterations');
      expect(code).toContain('uniform vec2 uOffset');
      expect(code).toContain('uniform float uXScale');
      expect(code).toContain('uniform float uYScale');
      expect(code).not.toContain('#version 300 es');
      expect(code).not.toContain('layout(std140)');
    });
  });

  describe('getScaleAccessCode', () => {
    it('should return UBO scale access code when useUBO is true', () => {
      const code = getScaleAccessCode(true);
      expect(code).toBe('uScale.x, uScale.y');
    });

    it('should return regular uniform scale access code when useUBO is false', () => {
      const code = getScaleAccessCode(false);
      expect(code).toBe('uXScale, uYScale');
    });
  });

  describe('createUniformsConfig', () => {
    let mockCanvas;
    let mockPalette;

    beforeEach(() => {
      mockCanvas = {
        width: 800,
        height: 600,
      };
      mockPalette = { destroy: vi.fn() };
    });

    it('should create WebGL1 uniforms when ubo is null', () => {
      const params = {
        iterations: 100,
        zoom: 2.0,
        offset: { x: 0.1, y: 0.2 },
        juliaC: { x: 0.3, y: 0.4 },
        xScale: 1.5,
        yScale: 2.0,
      };

      const uniforms = createUniformsConfig(params, mockCanvas, null, {
        uPalette: mockPalette,
        uTime: 1.5,
      });

      expect(uniforms).toEqual({
        uTime: 1.5,
        uIterations: 100,
        uZoom: 2.0,
        uOffset: [0.1, 0.2],
        uResolution: [800, 600],
        uJuliaC: [0.3, 0.4],
        uPalette: mockPalette,
        uXScale: 1.5,
        uYScale: 2.0,
      });
    });

    it('should use default values for missing WebGL1 parameters', () => {
      const params = {};
      const uniforms = createUniformsConfig(params, mockCanvas, null);

      expect(uniforms.uIterations).toBeUndefined();
      expect(uniforms.uZoom).toBeUndefined();
      expect(uniforms.uOffset).toEqual([0, 0]);
      expect(uniforms.uJuliaC).toEqual([0, 0]);
      expect(uniforms.uXScale).toBe(1.0);
      expect(uniforms.uYScale).toBe(1.0);
      expect(uniforms.uTime).toBe(0);
    });

    it('should update UBO and return minimal uniforms when ubo is provided', () => {
      const webglCapabilities = { isWebGL2: true };

      const ubo = createFractalParamsUBO(mockRegl, webglCapabilities);
      const params = {
        iterations: 100,
        zoom: 2.0,
        offset: { x: 0.1, y: 0.2 },
        juliaC: { x: 0.3, y: 0.4 },
        xScale: 1.5,
        yScale: 2.0,
      };

      const uniforms = createUniformsConfig(params, mockCanvas, ubo, {
        uPalette: mockPalette,
        uTime: 1.5,
      });

      expect(mockGl.bufferSubData).toHaveBeenCalled();
      expect(uniforms).toEqual({
        uTime: 1.5,
        uResolution: [800, 600],
        uPalette: mockPalette,
      });
      expect(uniforms).not.toHaveProperty('uIterations');
      expect(uniforms).not.toHaveProperty('uZoom');
    });

    it('should use options.juliaC when provided', () => {
      const params = {
        juliaC: { x: 0.1, y: 0.2 },
      };

      const uniforms = createUniformsConfig(params, mockCanvas, null, {
        juliaC: { x: 0.5, y: 0.6 },
      });

      expect(uniforms.uJuliaC).toEqual([0.5, 0.6]);
    });

    it('should use default uTime when not provided', () => {
      const uniforms = createUniformsConfig({}, mockCanvas, null);
      expect(uniforms.uTime).toBe(0);
    });
  });

  describe('getUniformBlockConfig', () => {
    it('should return null when ubo is not provided', () => {
      const result = getUniformBlockConfig(null);
      expect(result).toBeNull();
    });

    it('should return uniform block config when ubo is provided', () => {
      const webglCapabilities = { isWebGL2: true };
      const ubo = createFractalParamsUBO(mockRegl, webglCapabilities);
      ubo.buffer = mockBuffer;

      const result = getUniformBlockConfig(ubo, 0);

      expect(result).toEqual({
        uniformBlock: {
          FractalParams: {
            buffer: mockBuffer,
            offset: 0,
            size: 32, // 8 floats * 4 bytes
          },
        },
      });
    });

    it('should use custom binding point', () => {
      const webglCapabilities = { isWebGL2: true };
      const ubo = createFractalParamsUBO(mockRegl, webglCapabilities);
      ubo.buffer = mockBuffer;

      const result = getUniformBlockConfig(ubo, 1);

      expect(result.uniformBlock.FractalParams).toBeDefined();
    });
  });
});

