import { generatePaletteTexture, createFragmentShader } from '../utils.js';

const fractalFunction = `
// Barnsley Fern - Iterated Function System (IFS)
// Uses four affine transformations with probabilities
// Creates a fern-like fractal pattern

float computeFractal(vec2 c) {
    // Scale and center coordinates for Barnsley Fern
    // The fern typically spans from y=0 to y=10, centered around x=0
    // Note: c is already transformed by zoom/offset in utils.js template
    // The standard Barnsley Fern parameters work in a coordinate system where:
    // - x ranges roughly from -2.5 to 2.5
    // - y ranges from 0 to 10
    // We need to map our coordinate space to this
    
    // Adjust scale based on zoom and xScale parameter
    float baseScale = 0.3 + uXScale * 0.2; // 0.3 to 0.5
    // Transform coordinates: center vertically, scale appropriately
    // The fern grows upward from (0,0), so we shift y to be positive
    vec2 p = vec2(c.x * baseScale, (c.y + 2.0) * baseScale * 0.5);
    
    // IFS parameters for Barnsley Fern (standard parameters)
    // Transformation 1: Stem (1% probability)
    mat2 m1 = mat2(0.0, 0.0, 0.0, 0.16);
    vec2 t1 = vec2(0.0, 0.0);
    
    // Transformation 2: Smallest left leaflet (85% probability)
    mat2 m2 = mat2(0.85, 0.04, -0.04, 0.85);
    vec2 t2 = vec2(0.0, 1.6);
    
    // Transformation 3: Largest left leaflet (7% probability)
    mat2 m3 = mat2(0.2, -0.26, 0.23, 0.22);
    vec2 t3 = vec2(0.0, 1.6);
    
    // Transformation 4: Right leaflet (7% probability)
    mat2 m4 = mat2(-0.15, 0.28, 0.26, 0.24);
    vec2 t4 = vec2(0.0, 0.44);
    
    // Use density-based approach (similar to fractal-flame)
    // Start from origin and iterate forward, building density
    vec2 point = vec2(0.0, 0.0);
    float density = 0.0;
    int maxIter = int(clamp(uIterations / 15.0, 20.0, 80.0));
    
    // Forward iteration to build density map
    for (int i = 0; i < 80; i++) {
        if (i >= maxIter) break;
        
        // Deterministic pseudo-random choice based on iteration and position
        // This creates a deterministic pattern while maintaining IFS structure
        float choice = fract(sin(float(i) * 12.9898 + dot(point, vec2(78.233, 12.345))) * 43758.5453);
        
        vec2 transformed;
        if (choice < 0.01) {
            // Transformation 1: Stem (1%)
            transformed = m1 * point + t1;
        } else if (choice < 0.86) {
            // Transformation 2: Smallest left leaflet (85%)
            transformed = m2 * point + t2;
        } else if (choice < 0.93) {
            // Transformation 3: Largest left leaflet (7%)
            transformed = m3 * point + t3;
        } else {
            // Transformation 4: Right leaflet (7%)
            transformed = m4 * point + t4;
        }
        
        point = transformed;
        
        // Check if point is near the query point p
        vec2 diff = point - p;
        float dist2 = dot(diff, diff);
        
        // Accumulate density based on distance to query point
        // Use a wider influence radius for better coverage
        density += 1.0 / (1.0 + dist2 * 50.0);
    }
    
    // Also do reverse iteration from query point for better coverage
    point = p;
    for (int i = 0; i < 40; i++) {
        if (i >= maxIter / 2) break;
        
        float choice = fract(sin(float(i) * 12.9898 + dot(point, vec2(78.233, 12.345))) * 43758.5453);
        
        vec2 transformed;
        if (choice < 0.01) {
            transformed = m1 * point + t1;
        } else if (choice < 0.86) {
            transformed = m2 * point + t2;
        } else if (choice < 0.93) {
            transformed = m3 * point + t3;
        } else {
            transformed = m4 * point + t4;
        }
        
        point = transformed;
        
        // Check distance from origin (fern grows from origin)
        float dist2 = dot(point, point);
        density += 1.0 / (1.0 + dist2 * 30.0);
    }
    
    // Normalize and scale for coloring
    // The density should be normalized by iterations and scaled appropriately
    float normalizedDensity = density / float(maxIter);
    
    // Apply gamma correction for better contrast
    normalizedDensity = pow(normalizedDensity, 0.3);
    
    // Scale to work with color palette (similar to iteration count)
    // Return value should be in range [0, uIterations] for proper color mapping
    // Use a multiplier to ensure we get visible colors (not all black)
    float result = normalizedDensity * uIterations * 2.5;
    
    // Ensure we return a value that will produce colors (not black)
    // Values >= uIterations are rendered as black, so keep it below
    return clamp(result, 0.5, uIterations * 0.9);
}
`;

const fragmentShader = createFragmentShader(fractalFunction);

// Track last logged parameters to avoid excessive logging during progressive rendering
let lastLoggedParams = null;

export function render(regl, params, canvas) {
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);
  
  // Add debugging: log parameters to console (only for first render or significant changes)
  // Progressive rendering calls this multiple times with increasing iterations (20, 35, 50, etc.)
  // So we only log when there's a significant change to avoid console spam
  const shouldLog = !lastLoggedParams || 
      Math.abs(lastLoggedParams.iterations - params.iterations) > 50 ||
      lastLoggedParams.zoom !== params.zoom ||
      lastLoggedParams.xScale !== params.xScale ||
      lastLoggedParams.colorScheme !== params.colorScheme;
  
  if (shouldLog) {
    console.log('[Barnsley Fern Debug]', {
      iterations: params.iterations,
      zoom: params.zoom,
      offset: params.offset,
      xScale: params.xScale,
      yScale: params.yScale,
      colorScheme: params.colorScheme,
      canvasSize: { width: canvas.width, height: canvas.height },
      note: 'Progressive rendering will increase iterations gradually'
    });
    lastLoggedParams = { 
      iterations: params.iterations,
      zoom: params.zoom,
      xScale: params.xScale,
      colorScheme: params.colorScheme
    };
  }
  
  const drawFractal = regl({
    frag: fragmentShader,
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
      // Debug uniform - can be used to visualize intermediate values
      uDebug: 0.0, // 0 = normal, 1 = show density, 2 = show coordinates
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

