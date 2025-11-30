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

    it('should create framebuffer with half-float texture when extension is available', () => {
      const mockHalfFloatExt = {};
      mockGl.getExtension.mockImplementation((name) => {
        if (name === 'EXT_color_buffer_half_float') return mockHalfFloatExt;
        if (name === 'OES_texture_half_float_linear') return {};
        return null;
      });

      const result = createOptimizedFramebuffer(mockRegl, 1024, 768);

      expect(mockGl.getExtension).toHaveBeenCalledWith('EXT_color_buffer_half_float');
      expect(mockGl.getExtension).toHaveBeenCalledWith('OES_texture_half_float_linear');

      expect(mockRegl.texture).toHaveBeenCalledWith({
        width: 1024,
        height: 768,
        type: 'half float',
        min: 'linear',
        mag: 'linear',
      });

      expect(result).toBe(mockFramebuffer);
    });

    it('should use nearest filtering when half-float supported but linear filtering not available', () => {
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
        type: 'half float',
        min: 'nearest',
        mag: 'nearest',
      });
    });

    it('should use webglCapabilities when provided', () => {
      const webglCapabilities = {
        features: {
          halfFloat: {
            colorBuffer: true,
            linear: true,
          },
        },
      };

      createOptimizedFramebuffer(mockRegl, 800, 600, webglCapabilities);

      // Should not call getExtension when capabilities are provided
      expect(mockGl.getExtension).not.toHaveBeenCalled();

      expect(mockRegl.texture).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        type: 'half float',
        min: 'linear',
        mag: 'linear',
      });
    });

    it('should use nearest filtering when capabilities indicate no linear support', () => {
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
        type: 'half float',
        min: 'nearest',
        mag: 'nearest',
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
      const webglCapabilities = {
        features: {},
      };

      mockGl.getExtension.mockReturnValue(null);

      createOptimizedFramebuffer(mockRegl, 800, 600, webglCapabilities);

      // Should fallback to extension checking
      expect(mockGl.getExtension).toHaveBeenCalled();
      expect(mockRegl.texture).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        type: 'uint8',
        min: 'linear',
        mag: 'linear',
      });
    });

    it('should handle null webglCapabilities', () => {
      mockGl.getExtension.mockReturnValue(null);

      createOptimizedFramebuffer(mockRegl, 800, 600, null);

      expect(mockGl.getExtension).toHaveBeenCalled();
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

