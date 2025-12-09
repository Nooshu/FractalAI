import {
  createFragmentShader,
  createStandardDrawCommand,
} from '../utils.js';

const fractalFunction = `
// Weierstrass Function
// Continuous everywhere but differentiable nowhere
// W(x) = Σ(a^n * cos(b^n * π * x))
// Classic example: a = 0.5, b = 3 (odd integer)

const float PI = 3.14159265359;
const float A = 0.5; // Base parameter (0 < a < 1)
const float B = 3.0; // Frequency multiplier (odd integer)

// Weierstrass function computation
float weierstrass(float x) {
    float sum = 0.0;
    // Use iterations to control number of terms
    int maxTerms = int(clamp(uIterations / 8.0, 8.0, 16.0));
    
    for (int n = 0; n < 16; n++) {
        if (n >= maxTerms) break;
        
        float a_n = pow(A, float(n));
        float b_n = pow(B, float(n));
        
        // Compute a^n * cos(b^n * π * x)
        float angle = b_n * PI * x;
        float term = a_n * cos(angle);
        
        // Safety check
        if (!(term > -1000.0 && term < 1000.0)) {
            break;
        }
        
        sum += term;
    }
    
    return sum;
}

float computeFractal(vec2 c) {
    float x = c.x;
    float y = c.y;
    
    // Compute Weierstrass function value
    float w = weierstrass(x);
    
    // The Weierstrass function with a=0.5, b=3 typically ranges from about -1.5 to 1.5
    // Scale it appropriately for visibility
    float scale = 0.5 + uYScale * 0.5; // 0.5 to 1.0
    float functionY = w * 0.4 * scale;
    
    // Calculate distance from current point to the function curve
    float dist = abs(y - functionY);
    
    // Adaptive curve width - wider at low zoom, narrower at high zoom
    float baseWidth = 0.12;
    float minWidth = 0.03;
    float curveWidth = max(baseWidth / max(uZoom * 0.4, 0.4), minWidth);
    
    // Create smooth falloff for the curve
    float intensity = 1.0 - smoothstep(0.0, curveWidth, dist);
    
    // Scale by iterations for coloring
    float result = intensity * (uIterations / 8.0);
    
    // Add subtle texture detail
    float detail = fract(sin(x * 30.0) * 43758.5453) * 0.15;
    
    return result + detail;
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
    juliaC: { x: 0, y: 0 }, // Not used for Weierstrass function
  });
}

export const is2D = true;

/**
 * Configuration for Weierstrass fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'coral',
    iterations: 100, // Ensure enough iterations for visible detail
  },
  initialPosition: {
    zoom: 1,
    offset: { x: 0, y: 0 },
  },
  interestingPoints: [
    { x: 0, y: 0, zoom: 1 }, // Full overview
    { x: 0, y: 0, zoom: 2 }, // Medium zoom
    { x: 0, y: 0, zoom: 5 }, // High detail
    { x: 0.5, y: 0, zoom: 3 }, // Right side
    { x: -0.5, y: 0, zoom: 3 }, // Left side
  ],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};
