import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createOptimizedFramebuffer } from '../../static/js/rendering/framebuffer-utils.js';

describe('framebuffer-utils', () => {
  let mockRegl;
  let mockGl;
  let mockFramebuffer;
  let mockTexture;

  beforeEach(() => {
    mockTexture = {
      destroy: vi.fn(),
    };

    mockFramebuffer = {
      color: mockTexture,
      destroy: vi.fn(),
    };

    mockGl = {
      getExtension: vi.fn(),
    };

    mockRegl = {
      _gl: mockGl,
      framebuffer: vi.fn(() => mockFramebuffer),
      texture: vi.fn(() => mockTexture),
    };
  });

  describe('createOptimizedFramebuffer', () => {
    it('should create framebuffer with uint8 texture when half-float not supported', () => {
      mockGl.getExtension.mockReturnValue(null);

      const result = createOptimizedFramebuffer(mockRegl, 800, 600);

      expect(mockRegl.framebuffer).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        color: expect.any(Object),
        depth: false,
        stencil: false,
      });

      expect(mockRegl.texture).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        type: 'uint8',
        min: 'linear',
        mag: 'linear',
      });

      expect(result).toBe(mockFramebuffer);
    });

    it('should create framebuffer with uint8 texture (half-float disabled)', () => {
      // Note: Half-float support is currently disabled in the implementation
      // The function always uses uint8 textures for reliability
      const mockHalfFloatExt = {};
      mockGl.getExtension.mockImplementation((name) => {
        if (name === 'EXT_color_buffer_half_float') return mockHalfFloatExt;
        if (name === 'OES_texture_half_float_linear') return {};
        return null;
      });

      const result = createOptimizedFramebuffer(mockRegl, 1024, 768);

      // Implementation always uses uint8, regardless of extensions
      expect(mockRegl.texture).toHaveBeenCalledWith({
        width: 1024,
        height: 768,
        type: 'uint8',
        min: 'linear',
        mag: 'linear',
      });

      expect(result).toBe(mockFramebuffer);
    });

    it('should use uint8 texture even when half-float extensions are available', () => {
      // Implementation always uses uint8 for reliability
      const mockHalfFloatExt = {};
      mockGl.getExtension.mockImplementation((name) => {
        if (name === 'EXT_color_buffer_half_float') return mockHalfFloatExt;
        if (name === 'OES_texture_half_float_linear') return null;
        return null;
      });

      createOptimizedFramebuffer(mockRegl, 800, 600);

      expect(mockRegl.texture).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        type: 'uint8',
        min: 'linear',
        mag: 'linear',
      });
    });

    it('should use uint8 texture even when webglCapabilities indicate half-float support', () => {
      // Implementation always uses uint8 for reliability
      const webglCapabilities = {
        features: {
          halfFloat: {
            colorBuffer: true,
            linear: true,
          },
        },
      };

      createOptimizedFramebuffer(mockRegl, 800, 600, webglCapabilities);

      // Implementation ignores capabilities and always uses uint8
      expect(mockRegl.texture).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        type: 'uint8',
        min: 'linear',
        mag: 'linear',
      });
    });

    it('should use uint8 texture when capabilities indicate no linear support', () => {
      // Implementation always uses uint8 for reliability
      const webglCapabilities = {
        features: {
          halfFloat: {
            colorBuffer: true,
            linear: false,
          },
        },
      };

      createOptimizedFramebuffer(mockRegl, 800, 600, webglCapabilities);

      expect(mockRegl.texture).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        type: 'uint8',
        min: 'linear',
        mag: 'linear',
      });
    });

    it('should fallback to uint8 when capabilities indicate no half-float support', () => {
      const webglCapabilities = {
        features: {
          halfFloat: {
            colorBuffer: false,
            linear: false,
          },
        },
      };

      createOptimizedFramebuffer(mockRegl, 800, 600, webglCapabilities);

      expect(mockRegl.texture).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        type: 'uint8',
        min: 'linear',
        mag: 'linear',
      });
    });

    it('should handle missing webglCapabilities features gracefully', () => {
      // Implementation always uses uint8, regardless of capabilities
      const webglCapabilities = {
        features: {},
      };

      mockGl.getExtension.mockReturnValue(null);

      createOptimizedFramebuffer(mockRegl, 800, 600, webglCapabilities);

      // Implementation doesn't check extensions, always uses uint8
      expect(mockRegl.texture).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        type: 'uint8',
        min: 'linear',
        mag: 'linear',
      });
    });

    it('should handle null webglCapabilities', () => {
      // Implementation always uses uint8, regardless of capabilities
      mockGl.getExtension.mockReturnValue(null);

      createOptimizedFramebuffer(mockRegl, 800, 600, null);

      // Implementation doesn't check extensions, always uses uint8
      expect(mockRegl.texture).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        type: 'uint8',
        min: 'linear',
        mag: 'linear',
      });
    });
  });
});

