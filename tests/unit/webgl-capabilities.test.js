import { describe, it, expect, vi } from 'vitest';
import {
  detectWebGLCapabilities,
  formatCapabilities,
} from '../../static/js/rendering/webgl-capabilities.js';

describe('WebGL Capabilities', () => {
  describe('detectWebGLCapabilities', () => {
    it('returns empty capabilities for null gl context', () => {
      const result = detectWebGLCapabilities(null);

      expect(result).toEqual({
        version: 0,
        isWebGL2: false,
        extensions: {},
        limits: {},
        features: {},
      });
    });

    it('returns empty capabilities for undefined gl context', () => {
      const result = detectWebGLCapabilities(undefined);

      expect(result).toEqual({
        version: 0,
        isWebGL2: false,
        extensions: {},
        limits: {},
        features: {},
      });
    });

    it('detects WebGL1 context', () => {
      const paramMap = {
        0x0d33: 4096, // MAX_TEXTURE_SIZE
        0x0d3a: [4096, 4096], // MAX_VIEWPORT_DIMS
        0x8869: 16, // MAX_VERTEX_ATTRIBS
        0x8872: 8, // MAX_TEXTURE_IMAGE_UNITS
        0x8b4d: 8, // MAX_COMBINED_TEXTURE_IMAGE_UNITS
        0x8dfd: 16, // MAX_FRAGMENT_UNIFORM_VECTORS
        0x8dfc: 16, // MAX_VERTEX_UNIFORM_VECTORS
      };

      const mockGL = {
        getSupportedExtensions: vi.fn(() => []),
        getParameter: vi.fn((param) => paramMap[param]),
        getExtension: vi.fn(),
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VIEWPORT_DIMS: 0x0d3a,
        MAX_VERTEX_ATTRIBS: 0x8869,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
        MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
        MAX_VERTEX_UNIFORM_VECTORS: 0x8dfc,
      };

      // Mock WebGL2RenderingContext as undefined to simulate WebGL1
      const originalWebGL2 = global.WebGL2RenderingContext;
      delete global.WebGL2RenderingContext;

      const result = detectWebGLCapabilities(mockGL);

      expect(result.version).toBe(1);
      expect(result.isWebGL2).toBeFalsy();
      expect(result.gl).toBe(mockGL);
      expect(result.limits.maxTextureSize).toBe(4096);
      expect(result.features.uniformBufferObjects).toBeFalsy();
      expect(result.features.multipleRenderTargets).toBeFalsy();

      // Restore
      if (originalWebGL2 !== undefined) {
        global.WebGL2RenderingContext = originalWebGL2;
      }
    });

    it('detects WebGL2 context', () => {
      const paramMap = {
        0x0d33: 8192, // MAX_TEXTURE_SIZE
        0x0d3a: [8192, 8192], // MAX_VIEWPORT_DIMS
        0x8869: 16, // MAX_VERTEX_ATTRIBS
        0x8872: 8, // MAX_TEXTURE_IMAGE_UNITS
        0x8b4d: 8, // MAX_COMBINED_TEXTURE_IMAGE_UNITS
        0x8dfd: 16, // MAX_FRAGMENT_UNIFORM_VECTORS
        0x8dfc: 16, // MAX_VERTEX_UNIFORM_VECTORS
        0x8cdf: 8, // MAX_COLOR_ATTACHMENTS
        0x8824: 8, // MAX_DRAW_BUFFERS
        0x8a2f: 24, // MAX_UNIFORM_BUFFER_BINDINGS
        0x8a30: 16384, // MAX_UNIFORM_BLOCK_SIZE
        0x8a2b: 12, // MAX_VERTEX_UNIFORM_BLOCKS
        0x8a2d: 12, // MAX_FRAGMENT_UNIFORM_BLOCKS
        0x88ff: 256, // MAX_ARRAY_TEXTURE_LAYERS
      };

      const mockGL = {
        getSupportedExtensions: vi.fn(() => []),
        getParameter: vi.fn((param) => paramMap[param]),
        getExtension: vi.fn(),
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VIEWPORT_DIMS: 0x0d3a,
        MAX_VERTEX_ATTRIBS: 0x8869,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
        MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
        MAX_VERTEX_UNIFORM_VECTORS: 0x8dfc,
        MAX_COLOR_ATTACHMENTS: 0x8cdf,
        MAX_DRAW_BUFFERS: 0x8824,
        MAX_UNIFORM_BUFFER_BINDINGS: 0x8a2f,
        MAX_UNIFORM_BLOCK_SIZE: 0x8a30,
        MAX_VERTEX_UNIFORM_BLOCKS: 0x8a2b,
        MAX_FRAGMENT_UNIFORM_BLOCKS: 0x8a2d,
        MAX_ARRAY_TEXTURE_LAYERS: 0x88ff,
        createTextureView: vi.fn(),
      };

      // Mock WebGL2RenderingContext
      class MockWebGL2RenderingContext {}
      global.WebGL2RenderingContext = MockWebGL2RenderingContext;
      Object.setPrototypeOf(mockGL, MockWebGL2RenderingContext.prototype);

      const result = detectWebGLCapabilities(mockGL);

      expect(result.version).toBe(2);
      expect(result.isWebGL2).toBe(true);
      expect(result.gl).toBe(mockGL);
      expect(result.limits.maxTextureSize).toBe(8192);
      expect(result.limits.maxColorAttachments).toBe(8);
      expect(result.limits.maxDrawBuffers).toBe(8);
      expect(result.limits.maxUniformBufferBindings).toBe(24);
      expect(result.features.uniformBufferObjects).toBe(true);
      expect(result.features.multipleRenderTargets).toBe(true);
      expect(result.features.textureArrays).toBe(true);
      expect(result.features.integerTextures).toBe(true);
      expect(result.features.immutableTextures).toBe(true);
      expect(result.features.textureViews).toBe(true);

      delete global.WebGL2RenderingContext;
    });

    it('handles missing getSupportedExtensions method', () => {
      const mockGL = {
        getParameter: vi.fn((param) => {
          const params = {
            MAX_TEXTURE_SIZE: 2048,
            MAX_VIEWPORT_DIMS: [2048, 2048],
            MAX_VERTEX_ATTRIBS: 16,
            MAX_TEXTURE_IMAGE_UNITS: 8,
            MAX_COMBINED_TEXTURE_IMAGE_UNITS: 8,
            MAX_FRAGMENT_UNIFORM_VECTORS: 16,
            MAX_VERTEX_UNIFORM_VECTORS: 16,
          };
          return params[param];
        }),
        getExtension: vi.fn(),
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VIEWPORT_DIMS: 0x0d3a,
        MAX_VERTEX_ATTRIBS: 0x8869,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
        MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
        MAX_VERTEX_UNIFORM_VECTORS: 0x8dfc,
      };

      const originalWebGL2 = global.WebGL2RenderingContext;
      delete global.WebGL2RenderingContext;

      const result = detectWebGLCapabilities(mockGL);

      expect(result.extensions).toEqual({});
      expect(result.version).toBe(1);

      if (originalWebGL2 !== undefined) {
        global.WebGL2RenderingContext = originalWebGL2;
      }
    });

    it('handles getSupportedExtensions throwing an error', () => {
      const mockGL = {
        getSupportedExtensions: vi.fn(() => {
          throw new Error('Not supported');
        }),
        getParameter: vi.fn((param) => {
          const params = {
            MAX_TEXTURE_SIZE: 2048,
            MAX_VIEWPORT_DIMS: [2048, 2048],
            MAX_VERTEX_ATTRIBS: 16,
            MAX_TEXTURE_IMAGE_UNITS: 8,
            MAX_COMBINED_TEXTURE_IMAGE_UNITS: 8,
            MAX_FRAGMENT_UNIFORM_VECTORS: 16,
            MAX_VERTEX_UNIFORM_VECTORS: 16,
          };
          return params[param];
        }),
        getExtension: vi.fn(),
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VIEWPORT_DIMS: 0x0d3a,
        MAX_VERTEX_ATTRIBS: 0x8869,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
        MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
        MAX_VERTEX_UNIFORM_VECTORS: 0x8dfc,
      };

      const originalWebGL2 = global.WebGL2RenderingContext;
      global.WebGL2RenderingContext = undefined;

      const result = detectWebGLCapabilities(mockGL);

      expect(result.extensions).toEqual({});

      global.WebGL2RenderingContext = originalWebGL2;
    });

    it('detects extensions correctly', () => {
      const mockExtension1 = { name: 'EXT1' };
      const mockExtension2 = { name: 'EXT2' };

      const mockGL = {
        getSupportedExtensions: vi.fn(() => [
          'WEBGL_compressed_texture_s3tc',
          'OES_standard_derivatives',
          'EXT_disjoint_timer_query',
        ]),
        getExtension: vi.fn((name) => {
          if (name === 'WEBGL_compressed_texture_s3tc') return mockExtension1;
          if (name === 'OES_standard_derivatives') return mockExtension2;
          return null;
        }),
        getParameter: vi.fn((param) => {
          const params = {
            MAX_TEXTURE_SIZE: 2048,
            MAX_VIEWPORT_DIMS: [2048, 2048],
            MAX_VERTEX_ATTRIBS: 16,
            MAX_TEXTURE_IMAGE_UNITS: 8,
            MAX_COMBINED_TEXTURE_IMAGE_UNITS: 8,
            MAX_FRAGMENT_UNIFORM_VECTORS: 16,
            MAX_VERTEX_UNIFORM_VECTORS: 16,
          };
          return params[param];
        }),
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VIEWPORT_DIMS: 0x0d3a,
        MAX_VERTEX_ATTRIBS: 0x8869,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
        MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
        MAX_VERTEX_UNIFORM_VECTORS: 0x8dfc,
      };

      const originalWebGL2 = global.WebGL2RenderingContext;
      global.WebGL2RenderingContext = undefined;

      const result = detectWebGLCapabilities(mockGL);

      expect(result.extensions['WEBGL_compressed_texture_s3tc']).toBe(mockExtension1);
      expect(result.extensions['OES_standard_derivatives']).toBe(mockExtension2);
      // Extension that returns null is not stored in extensions object
      expect(result.extensions['EXT_disjoint_timer_query']).toBeUndefined();
      expect(result.features.compressedTextures.s3tc).toBe(true);
      expect(result.features.standardDerivatives).toBe(true);
      expect(result.features.timerQuery.webgl1).toBe(false); // Extension returned null

      if (originalWebGL2 !== undefined) {
        global.WebGL2RenderingContext = originalWebGL2;
      }
    });

    it('handles getExtension throwing an error', () => {
      const mockGL = {
        getSupportedExtensions: vi.fn(() => ['TEST_EXTENSION']),
        getExtension: vi.fn(() => {
          throw new Error('Extension error');
        }),
        getParameter: vi.fn((param) => {
          const params = {
            MAX_TEXTURE_SIZE: 2048,
            MAX_VIEWPORT_DIMS: [2048, 2048],
            MAX_VERTEX_ATTRIBS: 16,
            MAX_TEXTURE_IMAGE_UNITS: 8,
            MAX_COMBINED_TEXTURE_IMAGE_UNITS: 8,
            MAX_FRAGMENT_UNIFORM_VECTORS: 16,
            MAX_VERTEX_UNIFORM_VECTORS: 16,
          };
          return params[param];
        }),
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VIEWPORT_DIMS: 0x0d3a,
        MAX_VERTEX_ATTRIBS: 0x8869,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
        MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
        MAX_VERTEX_UNIFORM_VECTORS: 0x8dfc,
      };

      const originalWebGL2 = global.WebGL2RenderingContext;
      global.WebGL2RenderingContext = undefined;

      const result = detectWebGLCapabilities(mockGL);

      expect(result.extensions['TEST_EXTENSION']).toBe(null);

      global.WebGL2RenderingContext = originalWebGL2;
    });

    it('handles missing getExtension method', () => {
      const mockGL = {
        getSupportedExtensions: vi.fn(() => ['TEST_EXTENSION']),
        getParameter: vi.fn((param) => {
          const params = {
            MAX_TEXTURE_SIZE: 2048,
            MAX_VIEWPORT_DIMS: [2048, 2048],
            MAX_VERTEX_ATTRIBS: 16,
            MAX_TEXTURE_IMAGE_UNITS: 8,
            MAX_COMBINED_TEXTURE_IMAGE_UNITS: 8,
            MAX_FRAGMENT_UNIFORM_VECTORS: 16,
            MAX_VERTEX_UNIFORM_VECTORS: 16,
          };
          return params[param];
        }),
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VIEWPORT_DIMS: 0x0d3a,
        MAX_VERTEX_ATTRIBS: 0x8869,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
        MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
        MAX_VERTEX_UNIFORM_VECTORS: 0x8dfc,
      };

      const originalWebGL2 = global.WebGL2RenderingContext;
      global.WebGL2RenderingContext = undefined;

      const result = detectWebGLCapabilities(mockGL);

      expect(result.extensions).toEqual({});

      global.WebGL2RenderingContext = originalWebGL2;
    });

    it('uses fallback values when getParameter is missing', () => {
      const mockGL = {
        getSupportedExtensions: vi.fn(() => []),
        getExtension: vi.fn(),
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VIEWPORT_DIMS: 0x0d3a,
        MAX_VERTEX_ATTRIBS: 0x8869,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
        MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
        MAX_VERTEX_UNIFORM_VECTORS: 0x8dfc,
      };

      const originalWebGL2 = global.WebGL2RenderingContext;
      delete global.WebGL2RenderingContext;

      const result = detectWebGLCapabilities(mockGL);

      expect(result.limits.maxTextureSize).toBe(2048); // Default fallback
      expect(result.limits.maxViewportDims).toEqual([2048, 2048]);
      expect(result.limits.maxVertexAttribs).toBe(16);

      if (originalWebGL2 !== undefined) {
        global.WebGL2RenderingContext = originalWebGL2;
      }
    });

    it('uses fallback values when getParameter throws', () => {
      const mockGL = {
        getSupportedExtensions: vi.fn(() => []),
        getParameter: vi.fn(() => {
          throw new Error('Parameter error');
        }),
        getExtension: vi.fn(),
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VIEWPORT_DIMS: 0x0d3a,
        MAX_VERTEX_ATTRIBS: 0x8869,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
        MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
        MAX_VERTEX_UNIFORM_VECTORS: 0x8dfc,
      };

      const originalWebGL2 = global.WebGL2RenderingContext;
      delete global.WebGL2RenderingContext;

      const result = detectWebGLCapabilities(mockGL);

      expect(result.limits.maxTextureSize).toBe(2048); // Default fallback

      if (originalWebGL2 !== undefined) {
        global.WebGL2RenderingContext = originalWebGL2;
      }
    });

    it('detects all compressed texture formats', () => {
      const mockGL = {
        getSupportedExtensions: vi.fn(() => [
          'WEBGL_compressed_texture_s3tc',
          'WEBGL_compressed_texture_etc1',
          'WEBGL_compressed_texture_etc',
          'WEBGL_compressed_texture_astc',
          'EXT_texture_compression_bptc',
        ]),
        getExtension: vi.fn((name) => ({ name })),
        getParameter: vi.fn((param) => {
          const params = {
            MAX_TEXTURE_SIZE: 2048,
            MAX_VIEWPORT_DIMS: [2048, 2048],
            MAX_VERTEX_ATTRIBS: 16,
            MAX_TEXTURE_IMAGE_UNITS: 8,
            MAX_COMBINED_TEXTURE_IMAGE_UNITS: 8,
            MAX_FRAGMENT_UNIFORM_VECTORS: 16,
            MAX_VERTEX_UNIFORM_VECTORS: 16,
          };
          return params[param];
        }),
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VIEWPORT_DIMS: 0x0d3a,
        MAX_VERTEX_ATTRIBS: 0x8869,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
        MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
        MAX_VERTEX_UNIFORM_VECTORS: 0x8dfc,
      };

      const originalWebGL2 = global.WebGL2RenderingContext;
      delete global.WebGL2RenderingContext;

      const result = detectWebGLCapabilities(mockGL);

      expect(result.features.compressedTextures.s3tc).toBe(true);
      expect(result.features.compressedTextures.etc1).toBe(true);
      expect(result.features.compressedTextures.etc2).toBe(true);
      expect(result.features.compressedTextures.astc).toBe(true);
      expect(result.features.compressedTextures.bptc).toBe(true);

      if (originalWebGL2 !== undefined) {
        global.WebGL2RenderingContext = originalWebGL2;
      }
    });

    it('detects half-float extensions', () => {
      const mockGL = {
        getSupportedExtensions: vi.fn(() => [
          'EXT_color_buffer_half_float',
          'OES_texture_half_float',
          'OES_texture_half_float_linear',
        ]),
        getExtension: vi.fn(() => ({})),
        getParameter: vi.fn((param) => {
          const params = {
            MAX_TEXTURE_SIZE: 2048,
            MAX_VIEWPORT_DIMS: [2048, 2048],
            MAX_VERTEX_ATTRIBS: 16,
            MAX_TEXTURE_IMAGE_UNITS: 8,
            MAX_COMBINED_TEXTURE_IMAGE_UNITS: 8,
            MAX_FRAGMENT_UNIFORM_VECTORS: 16,
            MAX_VERTEX_UNIFORM_VECTORS: 16,
          };
          return params[param];
        }),
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VIEWPORT_DIMS: 0x0d3a,
        MAX_VERTEX_ATTRIBS: 0x8869,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
        MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
        MAX_VERTEX_UNIFORM_VECTORS: 0x8dfc,
      };

      const originalWebGL2 = global.WebGL2RenderingContext;
      delete global.WebGL2RenderingContext;

      const result = detectWebGLCapabilities(mockGL);

      expect(result.features.halfFloat.colorBuffer).toBe(true);
      expect(result.features.halfFloat.texture).toBe(true);
      expect(result.features.halfFloat.linear).toBe(true);

      if (originalWebGL2 !== undefined) {
        global.WebGL2RenderingContext = originalWebGL2;
      }
    });

    it('detects draw buffers extension for WebGL1', () => {
      const mockGL = {
        getSupportedExtensions: vi.fn(() => ['WEBGL_draw_buffers']),
        getExtension: vi.fn(() => ({})),
        getParameter: vi.fn((param) => {
          const params = {
            MAX_TEXTURE_SIZE: 2048,
            MAX_VIEWPORT_DIMS: [2048, 2048],
            MAX_VERTEX_ATTRIBS: 16,
            MAX_TEXTURE_IMAGE_UNITS: 8,
            MAX_COMBINED_TEXTURE_IMAGE_UNITS: 8,
            MAX_FRAGMENT_UNIFORM_VECTORS: 16,
            MAX_VERTEX_UNIFORM_VECTORS: 16,
          };
          return params[param];
        }),
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VIEWPORT_DIMS: 0x0d3a,
        MAX_VERTEX_ATTRIBS: 0x8869,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
        MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
        MAX_VERTEX_UNIFORM_VECTORS: 0x8dfc,
      };

      const originalWebGL2 = global.WebGL2RenderingContext;
      global.WebGL2RenderingContext = undefined;

      const result = detectWebGLCapabilities(mockGL);

      expect(result.features.drawBuffers.webgl1).toBe(true);
      expect(result.features.drawBuffers.webgl2).toBeFalsy();

      if (originalWebGL2 !== undefined) {
        global.WebGL2RenderingContext = originalWebGL2;
      }
    });

    it('handles WebGL2 without MAX_COLOR_ATTACHMENTS constant', () => {
      const mockGL = {
        getSupportedExtensions: vi.fn(() => []),
        getParameter: vi.fn((param) => {
          const params = {
            MAX_TEXTURE_SIZE: 2048,
            MAX_VIEWPORT_DIMS: [2048, 2048],
            MAX_VERTEX_ATTRIBS: 16,
            MAX_TEXTURE_IMAGE_UNITS: 8,
            MAX_COMBINED_TEXTURE_IMAGE_UNITS: 8,
            MAX_FRAGMENT_UNIFORM_VECTORS: 16,
            MAX_VERTEX_UNIFORM_VECTORS: 16,
          };
          return params[param];
        }),
        getExtension: vi.fn(),
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VIEWPORT_DIMS: 0x0d3a,
        MAX_VERTEX_ATTRIBS: 0x8869,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
        MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
        MAX_VERTEX_UNIFORM_VECTORS: 0x8dfc,
        // No MAX_COLOR_ATTACHMENTS
      };

      class MockWebGL2RenderingContext {}
      global.WebGL2RenderingContext = MockWebGL2RenderingContext;
      Object.setPrototypeOf(mockGL, MockWebGL2RenderingContext.prototype);

      const result = detectWebGLCapabilities(mockGL);

      expect(result.isWebGL2).toBe(true);
      expect(result.limits.maxColorAttachments).toBeUndefined();

      delete global.WebGL2RenderingContext;
    });

    it('handles missing createTextureView method', () => {
      const mockGL = {
        getSupportedExtensions: vi.fn(() => []),
        getParameter: vi.fn((param) => {
          const params = {
            MAX_TEXTURE_SIZE: 2048,
            MAX_VIEWPORT_DIMS: [2048, 2048],
            MAX_VERTEX_ATTRIBS: 16,
            MAX_TEXTURE_IMAGE_UNITS: 8,
            MAX_COMBINED_TEXTURE_IMAGE_UNITS: 8,
            MAX_FRAGMENT_UNIFORM_VECTORS: 16,
            MAX_VERTEX_UNIFORM_VECTORS: 16,
            MAX_COLOR_ATTACHMENTS: 4,
            MAX_DRAW_BUFFERS: 4,
            MAX_UNIFORM_BUFFER_BINDINGS: 24,
            MAX_UNIFORM_BLOCK_SIZE: 16384,
            MAX_VERTEX_UNIFORM_BLOCKS: 12,
            MAX_FRAGMENT_UNIFORM_BLOCKS: 12,
            MAX_ARRAY_TEXTURE_LAYERS: 256,
          };
          return params[param];
        }),
        getExtension: vi.fn(),
        MAX_TEXTURE_SIZE: 0x0d33,
        MAX_VIEWPORT_DIMS: 0x0d3a,
        MAX_VERTEX_ATTRIBS: 0x8869,
        MAX_TEXTURE_IMAGE_UNITS: 0x8872,
        MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
        MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
        MAX_VERTEX_UNIFORM_VECTORS: 0x8dfc,
        MAX_COLOR_ATTACHMENTS: 0x8cdf,
        MAX_DRAW_BUFFERS: 0x8824,
        MAX_UNIFORM_BUFFER_BINDINGS: 0x8a2f,
        MAX_UNIFORM_BLOCK_SIZE: 0x8a30,
        MAX_VERTEX_UNIFORM_BLOCKS: 0x8a2b,
        MAX_FRAGMENT_UNIFORM_BLOCKS: 0x8a2d,
        MAX_ARRAY_TEXTURE_LAYERS: 0x88ff,
        // No createTextureView
      };

      class MockWebGL2RenderingContext {}
      global.WebGL2RenderingContext = MockWebGL2RenderingContext;
      Object.setPrototypeOf(mockGL, MockWebGL2RenderingContext.prototype);

      const result = detectWebGLCapabilities(mockGL);

      expect(result.isWebGL2).toBe(true);
      expect(result.features.textureViews).toBe(false);

      delete global.WebGL2RenderingContext;
    });
  });

  describe('formatCapabilities', () => {
    it('formats WebGL1 capabilities without features', () => {
      const capabilities = {
        version: 1,
        isWebGL2: false,
        limits: {
          maxTextureSize: 4096,
          maxViewportDims: [4096, 4096],
          maxTextureImageUnits: 8,
        },
        features: {
          uniformBufferObjects: false,
          multipleRenderTargets: false,
          textureArrays: false,
          integerTextures: false,
          compressedTextures: {
            s3tc: false,
            etc1: false,
            etc2: false,
            astc: false,
            bptc: false,
          },
        },
      };

      const result = formatCapabilities(capabilities);

      expect(result).toContain('WebGL Version: 1 (WebGL1)');
      expect(result).toContain('Max Texture Size: 4096x4096');
      expect(result).toContain('Max Viewport: 4096x4096');
      expect(result).toContain('Max Texture Units: 8');
      expect(result).not.toContain('Max Color Attachments');
      expect(result).not.toContain('Features:');
    });

    it('formats WebGL2 capabilities with features', () => {
      const capabilities = {
        version: 2,
        isWebGL2: true,
        limits: {
          maxTextureSize: 8192,
          maxViewportDims: [8192, 8192],
          maxTextureImageUnits: 16,
          maxColorAttachments: 8,
          maxDrawBuffers: 8,
          maxUniformBufferBindings: 24,
        },
        features: {
          uniformBufferObjects: true,
          multipleRenderTargets: true,
          textureArrays: true,
          integerTextures: true,
          compressedTextures: {
            s3tc: false,
            etc1: false,
            etc2: false,
            astc: false,
            bptc: false,
          },
        },
      };

      const result = formatCapabilities(capabilities);

      expect(result).toContain('WebGL Version: 2 (WebGL2)');
      expect(result).toContain('Max Texture Size: 8192x8192');
      expect(result).toContain('Max Viewport: 8192x8192');
      expect(result).toContain('Max Texture Units: 16');
      expect(result).toContain('Max Color Attachments: 8');
      expect(result).toContain('Max Draw Buffers: 8');
      expect(result).toContain('Max Uniform Buffer Bindings: 24');
      expect(result).toContain('Features: UBOs, MRT, Texture Arrays, Integer Textures');
    });

    it('formats capabilities with compressed textures', () => {
      const capabilities = {
        version: 1,
        isWebGL2: false,
        limits: {
          maxTextureSize: 2048,
          maxViewportDims: [2048, 2048],
          maxTextureImageUnits: 8,
        },
        features: {
          uniformBufferObjects: false,
          multipleRenderTargets: false,
          textureArrays: false,
          integerTextures: false,
          compressedTextures: {
            s3tc: true,
            etc1: true,
            etc2: false,
            astc: false,
            bptc: false,
          },
        },
      };

      const result = formatCapabilities(capabilities);

      expect(result).toContain('Features: Compressed: S3TC, ETC1');
    });

    it('formats capabilities with all compressed texture formats', () => {
      const capabilities = {
        version: 2,
        isWebGL2: true,
        limits: {
          maxTextureSize: 4096,
          maxViewportDims: [4096, 4096],
          maxTextureImageUnits: 8,
          maxColorAttachments: 4,
          maxDrawBuffers: 4,
          maxUniformBufferBindings: 24,
        },
        features: {
          uniformBufferObjects: true,
          multipleRenderTargets: true,
          textureArrays: true,
          integerTextures: true,
          compressedTextures: {
            s3tc: true,
            etc1: true,
            etc2: true,
            astc: true,
            bptc: true,
          },
        },
      };

      const result = formatCapabilities(capabilities);

      expect(result).toContain(
        'Features: UBOs, MRT, Texture Arrays, Integer Textures, Compressed: S3TC, ETC1, ETC2, ASTC, BPTC'
      );
    });

    it('formats WebGL2 capabilities without WebGL2-specific limits', () => {
      const capabilities = {
        version: 2,
        isWebGL2: true,
        limits: {
          maxTextureSize: 2048,
          maxViewportDims: [2048, 2048],
          maxTextureImageUnits: 8,
          // Missing WebGL2-specific limits
        },
        features: {
          uniformBufferObjects: false,
          multipleRenderTargets: false,
          textureArrays: false,
          integerTextures: false,
          compressedTextures: {
            s3tc: false,
            etc1: false,
            etc2: false,
            astc: false,
            bptc: false,
          },
        },
      };

      const result = formatCapabilities(capabilities);

      expect(result).toContain('WebGL Version: 2 (WebGL2)');
      // Should not throw when accessing undefined limits
      expect(result).toBeTruthy();
    });

    it('formats capabilities with only some features enabled', () => {
      const capabilities = {
        version: 2,
        isWebGL2: true,
        limits: {
          maxTextureSize: 4096,
          maxViewportDims: [4096, 4096],
          maxTextureImageUnits: 8,
          maxColorAttachments: 4,
          maxDrawBuffers: 4,
          maxUniformBufferBindings: 24,
        },
        features: {
          uniformBufferObjects: true,
          multipleRenderTargets: false,
          textureArrays: true,
          integerTextures: false,
          compressedTextures: {
            s3tc: false,
            etc1: false,
            etc2: false,
            astc: false,
            bptc: false,
          },
        },
      };

      const result = formatCapabilities(capabilities);

      expect(result).toContain('Features: UBOs, Texture Arrays');
      expect(result).not.toContain('MRT');
      expect(result).not.toContain('Integer Textures');
    });
  });
});
