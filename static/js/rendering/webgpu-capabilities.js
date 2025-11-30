/**
 * WebGPU Capabilities Detection
 * Detects WebGPU support and available features
 */

/**
 * Detect WebGPU capabilities
 * @returns {Object|null} WebGPU capabilities object or null if not supported
 */
export function detectWebGPUCapabilities() {
  // Check if WebGPU is available
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    return null;
  }

  const capabilities = {
    supported: false,
    adapter: null,
    device: null,
    features: [],
    limits: {},
    error: null,
  };

  // WebGPU is available, but we need to request adapter and device asynchronously
  // This function returns a promise-based detection
  return capabilities;
}

/**
 * Initialize WebGPU adapter and device
 * @param {Object} options - Initialization options
 * @param {string} options.powerPreference - 'high-performance' or 'low-power'
 * @returns {Promise<Object>} Promise resolving to WebGPU capabilities with adapter and device
 */
export async function initWebGPU(options = {}) {
  const { powerPreference = 'high-performance' } = options;

  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    return {
      supported: false,
      error: 'WebGPU not available in this browser',
    };
  }

  try {
    // Request adapter
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference,
    });

    if (!adapter) {
      return {
        supported: false,
        error: 'No WebGPU adapter available',
      };
    }

    // Request device
    const device = await adapter.requestDevice();

    // Get adapter info (if available)
    let adapterInfo = null;
    if (adapter.info) {
      adapterInfo = adapter.info;
    }

    // Get features and limits
    const features = Array.from(device.features);
    const limits = {
      maxTextureDimension1D: device.limits.maxTextureDimension1D,
      maxTextureDimension2D: device.limits.maxTextureDimension2D,
      maxTextureDimension3D: device.limits.maxTextureDimension3D,
      maxTextureArrayLayers: device.limits.maxTextureArrayLayers,
      maxBindGroups: device.limits.maxBindGroups,
      maxComputeWorkgroupStorageSize: device.limits.maxComputeWorkgroupStorageSize,
      maxComputeInvocationsPerWorkgroup: device.limits.maxComputeInvocationsPerWorkgroup,
      maxComputeWorkgroupSizeX: device.limits.maxComputeWorkgroupSizeX,
      maxComputeWorkgroupSizeY: device.limits.maxComputeWorkgroupSizeY,
      maxComputeWorkgroupSizeZ: device.limits.maxComputeWorkgroupSizeZ,
    };

    return {
      supported: true,
      adapter,
      device,
      adapterInfo,
      features,
      limits,
      error: null,
    };
  } catch (error) {
    return {
      supported: false,
      error: error.message || 'Failed to initialize WebGPU',
    };
  }
}

/**
 * Format WebGPU capabilities for logging
 * @param {Object} capabilities - WebGPU capabilities object
 * @returns {string} Formatted capabilities string
 */
export function formatWebGPUCapabilities(capabilities) {
  if (!capabilities || !capabilities.supported) {
    return 'WebGPU: Not Supported';
  }

  const lines = ['WebGPU: Supported'];
  
  if (capabilities.adapterInfo) {
    lines.push(`  Adapter: ${capabilities.adapterInfo.vendor || 'Unknown'} ${capabilities.adapterInfo.architecture || ''}`);
  }
  
  if (capabilities.features && capabilities.features.length > 0) {
    lines.push(`  Features: ${capabilities.features.join(', ')}`);
  }
  
  if (capabilities.limits) {
    lines.push(`  Max Texture 2D: ${capabilities.limits.maxTextureDimension2D}x${capabilities.limits.maxTextureDimension2D}`);
    lines.push(`  Max Compute Workgroup Size: ${capabilities.limits.maxComputeWorkgroupSizeX}x${capabilities.limits.maxComputeWorkgroupSizeY}x${capabilities.limits.maxComputeWorkgroupSizeZ}`);
  }

  return lines.join('\n');
}

