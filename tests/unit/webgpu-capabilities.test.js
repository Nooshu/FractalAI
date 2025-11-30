import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  detectWebGPUCapabilities,
  initWebGPU,
  formatWebGPUCapabilities,
} from '../../static/js/rendering/webgpu-capabilities.js';

describe('webgpu-capabilities', () => {
  let originalNavigator;
  let mockNavigator;

  beforeEach(() => {
    originalNavigator = global.navigator;
    mockNavigator = {
      gpu: null,
    };
    global.navigator = mockNavigator;
  });

  afterEach(() => {
    global.navigator = originalNavigator;
    vi.clearAllMocks();
  });

  describe('detectWebGPUCapabilities', () => {
    it('should return null if navigator is undefined', () => {
      global.navigator = undefined;
      const result = detectWebGPUCapabilities();
      expect(result).toBeNull();
    });

    it('should return null if gpu is not in navigator', () => {
      delete mockNavigator.gpu;
      const result = detectWebGPUCapabilities();
      expect(result).toBeNull();
    });

    it('should return capabilities object structure when gpu is available', () => {
      mockNavigator.gpu = {};
      const result = detectWebGPUCapabilities();
      
      expect(result).toHaveProperty('supported', false);
      expect(result).toHaveProperty('adapter', null);
      expect(result).toHaveProperty('device', null);
      expect(result).toHaveProperty('features', []);
      expect(result).toHaveProperty('limits', {});
      expect(result).toHaveProperty('error', null);
    });
  });

  describe('initWebGPU', () => {
    it('should return unsupported if navigator is undefined', async () => {
      global.navigator = undefined;
      const result = await initWebGPU();
      
      expect(result.supported).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('should return unsupported if gpu is not in navigator', async () => {
      delete mockNavigator.gpu;
      const result = await initWebGPU();
      
      expect(result.supported).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('should return unsupported if adapter request fails', async () => {
      mockNavigator.gpu = {
        requestAdapter: vi.fn().mockResolvedValue(null),
      };

      const result = await initWebGPU();
      
      expect(result.supported).toBe(false);
      expect(result.error).toContain('No WebGPU adapter');
      expect(mockNavigator.gpu.requestAdapter).toHaveBeenCalledWith({
        powerPreference: 'high-performance',
      });
    });

    it('should return unsupported if device request fails', async () => {
      const mockAdapter = {
        info: {
          vendor: 'Test Vendor',
          architecture: 'Test Arch',
        },
        requestDevice: vi.fn().mockRejectedValue(new Error('Device creation failed')),
      };

      mockNavigator.gpu = {
        requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
      };

      const result = await initWebGPU();
      
      expect(result.supported).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toBe('Device creation failed');
    });

    it('should return capabilities when WebGPU is available', async () => {
      const mockDevice = {
        features: new Set(['test-feature']),
        limits: {
          maxTextureDimension2D: 8192,
          maxComputeWorkgroupSizeX: 256,
          maxComputeWorkgroupSizeY: 256,
          maxComputeWorkgroupSizeZ: 256,
          maxComputeInvocationsPerWorkgroup: 1024,
          maxComputeWorkgroupStorageSize: 16384,
          maxTextureDimension1D: 8192,
          maxTextureDimension3D: 2048,
          maxTextureArrayLayers: 256,
          maxBindGroups: 4,
        },
      };

      const mockAdapter = {
        info: {
          vendor: 'Test Vendor',
          architecture: 'Test Arch',
        },
        requestDevice: vi.fn().mockResolvedValue(mockDevice),
      };

      mockNavigator.gpu = {
        requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
      };

      const result = await initWebGPU();
      
      expect(result.supported).toBe(true);
      expect(result.adapter).toBe(mockAdapter);
      expect(result.device).toBe(mockDevice);
      expect(result.adapterInfo).toEqual(mockAdapter.info);
      expect(result.features).toEqual(['test-feature']);
      expect(result.limits).toEqual(mockDevice.limits);
      expect(result.error).toBeNull();
    });

    it('should use custom powerPreference', async () => {
      const mockAdapter = {
        requestDevice: vi.fn().mockResolvedValue({
          features: new Set(),
          limits: {},
        }),
      };

      mockNavigator.gpu = {
        requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
      };

      await initWebGPU({ powerPreference: 'low-power' });
      
      expect(mockNavigator.gpu.requestAdapter).toHaveBeenCalledWith({
        powerPreference: 'low-power',
      });
    });

    it('should handle adapter without info property', async () => {
      const mockDevice = {
        features: new Set(),
        limits: {},
      };

      const mockAdapter = {
        requestDevice: vi.fn().mockResolvedValue(mockDevice),
      };

      mockNavigator.gpu = {
        requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
      };

      const result = await initWebGPU();
      
      expect(result.supported).toBe(true);
      expect(result.adapterInfo).toBeNull();
    });
  });

  describe('formatWebGPUCapabilities', () => {
    it('should return "Not Supported" for null capabilities', () => {
      const result = formatWebGPUCapabilities(null);
      expect(result).toBe('WebGPU: Not Supported');
    });

    it('should return "Not Supported" for unsupported capabilities', () => {
      const result = formatWebGPUCapabilities({ supported: false });
      expect(result).toBe('WebGPU: Not Supported');
    });

    it('should format supported capabilities', () => {
      const capabilities = {
        supported: true,
        adapterInfo: {
          vendor: 'Test Vendor',
          architecture: 'Test Arch',
        },
        features: ['feature1', 'feature2'],
        limits: {
          maxTextureDimension2D: 8192,
          maxComputeWorkgroupSizeX: 256,
          maxComputeWorkgroupSizeY: 128,
          maxComputeWorkgroupSizeZ: 64,
        },
      };

      const result = formatWebGPUCapabilities(capabilities);
      
      expect(result).toContain('WebGPU: Supported');
      expect(result).toContain('Test Vendor');
      expect(result).toContain('feature1, feature2');
      expect(result).toContain('8192x8192');
      expect(result).toContain('256x128x64');
    });

    it('should handle capabilities without adapterInfo', () => {
      const capabilities = {
        supported: true,
        features: [],
        limits: {
          maxTextureDimension2D: 4096,
          maxComputeWorkgroupSizeX: 128,
          maxComputeWorkgroupSizeY: 128,
          maxComputeWorkgroupSizeZ: 128,
        },
      };

      const result = formatWebGPUCapabilities(capabilities);
      
      expect(result).toContain('WebGPU: Supported');
      expect(result).not.toContain('Adapter:');
    });

    it('should handle capabilities without features', () => {
      const capabilities = {
        supported: true,
        limits: {
          maxTextureDimension2D: 4096,
          maxComputeWorkgroupSizeX: 128,
          maxComputeWorkgroupSizeY: 128,
          maxComputeWorkgroupSizeZ: 128,
        },
      };

      const result = formatWebGPUCapabilities(capabilities);
      
      expect(result).toContain('WebGPU: Supported');
      expect(result).not.toContain('Features:');
    });
  });
});

