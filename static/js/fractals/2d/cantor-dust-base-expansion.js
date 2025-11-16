import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Cantor Dust from Base Expansion
// Generates Cantor dust patterns using base expansion (e.g., base-3, base-4)
// Excludes certain digits to create fractal patterns

const float PI = 3.14159265359;

// Convert number to base-n representation and check if it contains excluded digits
bool isInCantorDust(float x, float y, int base, int excludedDigit) {
    // x and y are already in [0, 1] range
    // Clamp to valid range
    if (x < 0.0 || x >= 1.0 || y < 0.0 || y >= 1.0) {
        return false;
    }
    
    // Check base expansion for both x and y coordinates
    // For each coordinate, expand in base-n and check if any digit equals excludedDigit
    int maxIterations = 20;
    
    float xRemainder = x;
    float yRemainder = y;
    
    for (int i = 0; i < 20; i++) {
        if (i >= maxIterations) break;
        
        // Multiply by base to get next digit
        xRemainder *= float(base);
        yRemainder *= float(base);
        
        // Extract integer part (the digit)
        int xDigit = int(floor(xRemainder));
        int yDigit = int(floor(yRemainder));
        
        // If either digit equals the excluded digit, point is not in Cantor dust
        if (xDigit == excludedDigit || yDigit == excludedDigit) {
            return false;
        }
        
        // Remove integer part to get remainder for next iteration
        xRemainder = fract(xRemainder);
        yRemainder = fract(yRemainder);
        
        // Early exit if remainder is zero (no more digits)
        if (xRemainder < 0.0001 && yRemainder < 0.0001) {
            break;
        }
    }
    
    return true;
}

// Compute fractal value based on base expansion
float computeFractal(vec2 c) {
    // c is already in transformed coordinate space from utils.js
    // Map to [0, 1] range for base expansion
    vec2 p = (c + 1.0) * 0.5;
    
    // Base and excluded digit controlled by parameters
    // X Scale controls base (3 to 10)
    int base = int(clamp(3.0 + uXScale * 7.0, 3.0, 10.0));
    
    // Y Scale controls excluded digit (0 to base-1)
    int excludedDigit = int(clamp(uYScale * float(base), 0.0, float(base - 1)));
    
    // Number of iterations for base expansion
    int maxIterations = int(clamp(uIterations / 10.0, 5.0, 20.0));
    
    // Check if point is in Cantor dust
    bool inSet = isInCantorDust(p.x, p.y, base, excludedDigit);
    
    if (inSet) {
        // Point is in the set - calculate depth for coloring
        float depth = 0.0;
        float xRemainder = p.x;
        float yRemainder = p.y;
        
        for (int i = 0; i < 20; i++) {
            if (i >= maxIterations) break;
            
            xRemainder *= float(base);
            yRemainder *= float(base);
            
            int xDigit = int(floor(xRemainder));
            int yDigit = int(floor(yRemainder));
            
            if (xDigit == excludedDigit || yDigit == excludedDigit) {
                break;
            }
            
            depth += 1.0;
            
            xRemainder = fract(xRemainder);
            yRemainder = fract(yRemainder);
            
            if (xRemainder < 0.0001 && yRemainder < 0.0001) {
                break;
            }
        }
        
        // Return depth value for coloring
        return depth * 10.0;
    } else {
        // Point is not in the set
        return 0.0;
    }
}
`;

const fragmentShader = createFragmentShader(fractalFunction);

export function render(regl, params, canvas) {
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);
  
  const frag = createFragmentShader(fractalFunction);
  
  const drawFractal = regl({
    frag,
    vert: `
      precision mediump float;
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position;
        gl_Position = vec4(position, 0, 1);
      }
    `,
    attributes: {
      position: [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ],
    },
    uniforms: {
      uResolution: [canvas.width, canvas.height],
      uZoom: params.zoom,
      uOffset: [params.offset.x, params.offset.y],
      uIterations: params.iterations,
      uPalette: paletteTexture,
      uXScale: params.xScale,
      uYScale: params.yScale,
    },
    primitive: 'triangle strip',
    count: 4,
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    },
  });

  return drawFractal;
}

export const is2D = true;

