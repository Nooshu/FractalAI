import {
  createFragmentShader,
  createStandardDrawCommand,
} from '../utils.js';

const fractalFunction = `
// Blancmange Curve (Takagi Curve)
// Continuous everywhere but differentiable nowhere
// B(x) = Σ(s(2^n * x) / 4^n)
// where s(x) is the distance from x to the nearest integer

const float PI = 3.14159265359;

// Distance from x to nearest integer
float distToNearestInt(float x) {
    float fractional = fract(x);
    return min(fractional, 1.0 - fractional);
}

// Blancmange function computation
float blancmange(float x) {
    float sum = 0.0;
    int maxTerms = int(clamp(uIterations / 10.0, 5.0, 30.0));
    
    for (int n = 0; n < 30; n++) {
        if (n >= maxTerms) break;
        
        float two_n = pow(2.0, float(n));
        float four_n = pow(4.0, float(n));
        
        // Compute s(2^n * x) / 4^n
        float dist = distToNearestInt(two_n * x);
        sum += dist / four_n;
    }
    
    return sum;
}

float computeFractal(vec2 c) {
    // Use x coordinate directly - blancmange can be extended beyond [0,1]
    // by using the periodic nature of the distance function
    float x = c.x;
    
    // Compute Blancmange function value
    // The function is periodic with period 1, so we can use mod to extend it
    float xNormalized = mod(x, 1.0);
    if (xNormalized < 0.0) xNormalized += 1.0;
    
    float b = blancmange(xNormalized);
    
    // Blancmange function ranges from 0 to approximately 0.5 on [0, 1]
    // Scale it vertically for better visibility
    float verticalScale = 1.5 + uYScale * 1.5; // 1.5 to 3.0
    float functionY = b * verticalScale;
    
    // Check if y coordinate is near the function value
    float y = c.y;
    float dist = abs(y - functionY);
    
    // Adaptive curve width - wider at low zoom, narrower at high zoom
    // This allows seeing the curve at all zoom levels
    float baseWidth = 0.15;
    float minWidth = 0.02;
    float curveWidth = max(baseWidth / max(uZoom * 0.5, 0.5), minWidth);
    
    // Create smooth falloff for the curve
    float intensity = 1.0 - smoothstep(0.0, curveWidth, dist);
    
    // Enhance the fractal detail by using the function's self-similarity
    // The blancmange curve has detail at all scales, so we add subtle texture
    // based on the function's structure
    float detailScale = uZoom * 0.1;
    float detail = fract(sin(xNormalized * 100.0 * detailScale) * 43758.5453) * 0.08;
    
    // Scale by iterations for coloring
    float result = intensity * (uIterations / 15.0) + detail;
    
    return result;
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
    juliaC: { x: 0, y: 0 }, // Not used for Blancmange curve
  });
}

export const is2D = true;

/**
 * Configuration for Blancmange fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow-pastel',
  },
  initialPosition: {
    zoom: 1,
    offset: { x: -0.0015, y: 0.7649 },
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

