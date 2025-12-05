import {
  generatePaletteTexture,
  createFragmentShader,
  getVertexShader,
  createStandardDrawCommand,
} from '../utils.js';

const fractalFunction = `
// Takagi Function (Takagi-Landsberg Function)
// Continuous everywhere but differentiable nowhere
// T(x) = Σ(2^(-n) * d(2^n * x, Z))
// where d(x, Z) is the distance from x to the nearest integer

const float PI = 3.14159265359;

// Distance from x to nearest integer
float distToNearestInt(float x) {
    float fractional = fract(x);
    return min(fractional, 1.0 - fractional);
}

// Takagi function computation
float takagi(float x) {
    float sum = 0.0;
    int maxTerms = int(clamp(uIterations / 10.0, 5.0, 30.0));
    
    for (int n = 0; n < 30; n++) {
        if (n >= maxTerms) break;
        
        float two_n = pow(2.0, float(n));
        float two_neg_n = pow(2.0, -float(n));
        
        // Compute 2^(-n) * d(2^n * x, Z)
        float dist = distToNearestInt(two_n * x);
        sum += two_neg_n * dist;
    }
    
    return sum;
}

float computeFractal(vec2 c) {
    // Map x coordinate to domain [0, 1] for Takagi function
    // Takagi is typically defined on [0, 1]
    float x = (c.x + 2.0) / 4.0; // Map from [-2, 2] to [0, 1]
    
    // Clamp x to [0, 1] range
    if (x < 0.0 || x > 1.0) {
        return 0.0;
    }
    
    // Compute Takagi function value
    float t = takagi(x);
    
    // Scale and center vertically
    // Takagi function ranges from 0 to approximately 0.5
    float scale = 0.8 + uYScale * 0.4; // 0.8 to 1.2
    float centerY = 0.0;
    
    // Check if y coordinate is near the function value
    float y = c.y;
    float dist = abs(y - (t * scale + centerY));
    
    // Create a curve by checking proximity to the function
    // Use a narrow band for the curve
    float curveWidth = 0.02 / uZoom; // Adaptive width based on zoom
    float intensity = 1.0 - smoothstep(0.0, curveWidth, dist);
    
    // Add some detail based on the function's fractal nature
    // The Takagi function has detail at all scales
    float detail = fract(sin(x * 200.0) * 43758.5453) * 0.1;
    
    return intensity * (uIterations / 20.0) + detail;
}
`;

export function render(regl, params, canvas, options = {}) {
  // Check if UBOs should be used (WebGL2 optimization)
  const webglCapabilities = options.webglCapabilities;
  const ubo = options.ubo;
  const useUBO = webglCapabilities?.isWebGL2 && ubo;

  // Create fragment shader with UBO support if available
  const fragmentShader = createFragmentShader(fractalFunction, useUBO);

  // Use createStandardDrawCommand for UBO support
  return createStandardDrawCommand(regl, params, canvas, fragmentShader, {
    webglCapabilities,
    ubo,
    juliaC: { x: 0, y: 0 }, // Not used for Takagi function
  });
}

export const is2D = true;

/**
 * Configuration for Takagi fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'cosmic',
  },
  initialPosition: {
    zoom: 1,
    offset: { x: 0, y: 0 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1 }, // Full overview
    { x: 0, y: 0, zoom: 2 }, // Medium zoom
    { x: 0, y: 0, zoom: 5 }, // High detail
    { x: 0.3, y: 0, zoom: 3 }, // Right side
    { x: -0.3, y: 0, zoom: 3 }, // Left side
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};

