import { vertexShader, createFragmentShader, createStandardDrawCommand } from '../utils.js';

const fractalFunction = `
    float computeFractal(vec2 c) {
        // Rose curve (Rhodonea curve)
        // r = cos(k * theta) or r = sin(k * theta)
        // Creates beautiful flower-like patterns
        
        // Convert to polar coordinates
        float r = length(c);
        float theta = atan(c.y, c.x);
        
        // Rose parameters - can be varied for different patterns
        float k = 5.0; // Number of petals (if odd: k petals, if even: 2k petals)
        
        // Calculate rose curve distance
        float roseRadius = abs(cos(k * theta));
        
        // Distance from point to rose curve
        float dist = abs(r - roseRadius);
        
        // Create multiple layers of roses for fractal-like effect
        float layerValue = 0.0;
        float totalWeight = 0.0;
        
        for (int i = 0; i < 200; i++) {
            if (i >= int(uIterations)) break;
            
            float layer = float(i + 1);
            float layerK = k + float(i) * 0.5; // Vary k for each layer
            float layerScale = 1.0 / (layer * 0.3 + 1.0); // Scale factor for each layer
            
            // Calculate rose for this layer
            float layerRoseRadius = abs(cos(layerK * theta)) * layerScale;
            float layerDist = abs(r - layerRoseRadius);
            
            // Thickness of each petal layer
            float thickness = 0.02 / (layer * 0.5 + 1.0);
            
            // Check if point is within this layer
            if (layerDist < thickness) {
                float weight = 1.0 - (layerDist / thickness);
                layerValue += layer * weight;
                totalWeight += weight;
            }
            
            // Add variations with sine waves for more complexity
            float variation = sin(theta * layerK * 2.0 + layer) * 0.01;
            float varDist = abs(r - (layerRoseRadius + variation));
            
            if (varDist < thickness * 1.5) {
                float weight = 1.0 - (varDist / (thickness * 1.5));
                layerValue += layer * weight * 0.5;
                totalWeight += weight * 0.5;
            }
        }
        
        // Normalize the result
        if (totalWeight > 0.0) {
            return layerValue / totalWeight;
        }
        
        // For points not on any petal, create radial gradient
        float radialPattern = mod(theta * k * 2.0, 1.0);
        float distancePattern = mod(r * 10.0, 1.0);
        return (radialPattern + distancePattern) * uIterations * 0.5;
    }
`;

const fragmentShader = createFragmentShader(fractalFunction);

export function render(regl, params, canvas) {
  // Use the optimized standard draw command with dynamic uniforms
  return createStandardDrawCommand(regl, params, canvas, fragmentShader, {
    fractalType: 'rose',
    juliaC: [0, 0], // Not used for Rose
  });
}

export const is2D = true;

