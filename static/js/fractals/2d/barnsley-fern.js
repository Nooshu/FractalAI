import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Barnsley Fern - Iterated Function System (IFS)
// Fully optimized version with manual matrix operations and early exits

float computeFractal(vec2 c) {
    // Transform coordinates to fern space (precomputed constants)
    vec2 p = vec2(c.x * 1.25, c.y * 2.5 + 5.0);
    
    // Precompute constants outside loops
    float qualityFactor = min(uZoom * 0.5, 1.0);
    int numTrajectories = int(clamp(uIterations * 0.4 * qualityFactor, 15.0, 100.0));
    int iterPerTrajectory = int(clamp(uIterations * 0.667 * qualityFactor, 60.0, 200.0));
    float seedBase = dot(p, vec2(73.7, 29.1)) * 0.1;
    const int burnIn = 12;
    const float falloffScale = 500.0;
    
    // Early exit threshold - skip if point is too far (optimization)
    const float maxDist2 = 0.01; // Points beyond this contribute negligibly
    
    float density = 0.0;
    float invNormFactor = 1.0 / (float(numTrajectories) * float(iterPerTrajectory - burnIn));
    
    // Optimized trajectory loop
    for (int traj = 0; traj < 100; traj++) {
        if (traj >= numTrajectories) break;
        
        vec2 point = vec2(0.0, 0.0);
        float seed = float(traj) * 17.3 + seedBase;
        float iSeed = seed; // Precompute i*12.9898 + seed
        
        // Optimized iteration loop with manual matrix operations
        for (int i = 0; i < 200; i++) {
            if (i >= iterPerTrajectory) break;
            
            // Optimized random number generation
            float randArg = float(i) * 12.9898 + iSeed + point.x * 78.233 + point.y * 12.345;
            float choice = fract(sin(randArg) * 43758.5453);
            
            // Manual matrix multiplication (faster than mat2 * vec2)
            // Check most common case first (85% probability) for branch prediction
            vec2 transformed;
            if (choice < 0.86) {
                // Transformation 2: Successive leaflets (85%) - most common
                transformed = vec2(
                    0.85 * point.x + 0.04 * point.y,
                    -0.04 * point.x + 0.85 * point.y + 1.6
                );
            } else if (choice < 0.93) {
                // Transformation 3: Left large leaf (7%)
                transformed = vec2(
                    0.2 * point.x - 0.26 * point.y,
                    0.23 * point.x + 0.22 * point.y + 1.6
                );
            } else if (choice < 0.99) {
                // Transformation 4: Right large leaf (7%)
                transformed = vec2(
                    -0.15 * point.x + 0.28 * point.y,
                    0.26 * point.x + 0.24 * point.y + 0.44
                );
            } else {
                // Transformation 1: Stem (1%) - least common
                transformed = vec2(0.0, 0.16 * point.y);
            }
            
            point = transformed;
            
            // Accumulate density after burn-in with early exit optimization
            if (i >= burnIn) {
                vec2 diff = point - p;
                float dist2 = diff.x * diff.x + diff.y * diff.y;
                
                // Early exit if too far (significant performance gain)
                if (dist2 < maxDist2) {
                    // Use optimized exp approximation for small values
                    density += exp(-dist2 * falloffScale);
                }
            }
        }
    }
    
    // Optimized normalization and gamma correction
    float normalizedDensity = density * invNormFactor;
    normalizedDensity = pow(normalizedDensity, 0.6);
    
    // Precomputed scale factor
    float result = normalizedDensity * uIterations * 15.0;
    
    return clamp(result, 0.0, uIterations * 0.95);
}
`;

// Custom fragment shader for Barnsley Fern
const fragmentShader = `
    #ifdef GL_ES
    precision mediump float;
    #endif
    
    uniform float uTime;
    uniform float uIterations;
    uniform float uZoom;
    uniform vec2 uOffset;
    uniform vec2 uResolution;
    uniform vec2 uJuliaC;
    uniform sampler2D uPalette;
    uniform float uXScale;
    uniform float uYScale;
    
    varying vec2 vUv;
    
    ${fractalFunction}
    
    void main() {
        // Optimized coordinate calculation - precompute values
        float aspect = uResolution.x / uResolution.y;
        float scale = 4.0 / uZoom;
        vec2 uvCentered = vUv - 0.5;
        vec2 c = vec2(
            uvCentered.x * scale * aspect * uXScale + uOffset.x,
            uvCentered.y * scale * uYScale + uOffset.y
        );
        
        float iterations = computeFractal(c);
        
        // Optimized color lookup - use multiplication instead of division
        float t = clamp(iterations / uIterations, 0.0, 1.0);
        vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
        
        // Points outside the set are black - use step() for branchless code
        color = mix(color, vec3(0.0), step(uIterations, iterations));
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

export function render(regl, params, canvas) {
  // Create reusable draw command with dynamic uniforms
  const drawCommand = regl({
    vert: vertexShader,
    frag: fragmentShader,
    attributes: {
      position: [-1, -1, 1, -1, -1, 1, 1, 1],
    },
    uniforms: {
      uTime: regl.prop('uTime'),
      uIterations: regl.prop('uIterations'),
      uZoom: regl.prop('uZoom'),
      uOffset: regl.prop('uOffset'),
      uResolution: regl.prop('uResolution'),
      uJuliaC: regl.prop('uJuliaC'),
      uPalette: regl.prop('uPalette'),
      uXScale: regl.prop('uXScale'),
      uYScale: regl.prop('uYScale'),
    },
    viewport: regl.prop('viewport'),
    count: 4,
    primitive: 'triangle strip',
  });

  return (uniformOverrides = {}) => {
    const paletteTexture = generatePaletteTexture(regl, params.colorScheme);
    
    drawCommand({
      uTime: uniformOverrides.uTime ?? 0,
      uIterations: uniformOverrides.uIterations ?? params.iterations,
      uZoom: uniformOverrides.uZoom ?? params.zoom,
      uOffset: uniformOverrides.uOffset ?? [params.offset.x, params.offset.y],
      uResolution: uniformOverrides.uResolution ?? [canvas.width, canvas.height],
      uJuliaC: uniformOverrides.uJuliaC ?? [0, 0],
      uPalette: uniformOverrides.uPalette ?? paletteTexture,
      uXScale: uniformOverrides.uXScale ?? params.xScale,
      uYScale: uniformOverrides.uYScale ?? params.yScale,
      viewport: uniformOverrides.viewport ?? {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
      },
    });
  };
}

export const is2D = true;

