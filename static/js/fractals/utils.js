// Palette texture cache
const paletteTextureCache = new Map();
const PALETTE_SIZE = 512; // Number of colors in the palette texture

// Shader compilation cache
// Caches compiled regl draw commands to avoid recompilation
const shaderCache = new Map();
const MAX_SHADER_CACHE_SIZE = 50; // Maximum number of cached shaders

/**
 * Generates a color value for a given t value (0-1) and scheme
 * @param {number} t - Value from 0 to 1
 * @param {number} schemeIndex - Index of the color scheme
 * @returns {Object} RGB color {r, g, b} in range [0, 1]
 */
export function computeColorForScheme(t, schemeIndex) {
  // Clamp t to [0, 1]
  t = Math.max(0, Math.min(1, t));

  switch (schemeIndex) {
    case 1: // fire
      return { r: t, g: t * 0.5, b: 0 };
    case 2: // ocean
      return { r: 0, g: t * 0.5, b: t };
    case 3: // rainbow
      {
        const hue = ((t * 360) % 360) / 360;
        return {
          r: 0.5 + 0.5 * Math.cos(hue * 6.28 + 0.0),
          g: 0.5 + 0.5 * Math.cos(hue * 6.28 + 2.09),
          b: 0.5 + 0.5 * Math.cos(hue * 6.28 + 4.18),
        };
      }
    case 12: // rainbow-pastel
      {
        const hue = ((t * 360) % 360) / 360;
        const sat = 0.6;
        const light = 0.7;
        return {
          r: light + sat * Math.cos(hue * 6.28 + 0.0),
          g: light + sat * Math.cos(hue * 6.28 + 2.09),
          b: light + sat * Math.cos(hue * 6.28 + 4.18),
        };
      }
    case 13: // rainbow-dark
      {
        const hue = ((t * 360) % 360) / 360;
        const sat = 1.0;
        const light = 0.3;
        return {
          r: light + sat * Math.cos(hue * 6.28 + 0.0),
          g: light + sat * Math.cos(hue * 6.28 + 2.09),
          b: light + sat * Math.cos(hue * 6.28 + 4.18),
        };
      }
    case 14: // rainbow-vibrant
      {
        const hue = ((t * 360) % 360) / 360;
        const sat = 1.2;
        const light = 0.4;
        return {
          r: Math.max(0, Math.min(1, light + sat * Math.cos(hue * 6.28 + 0.0))),
          g: Math.max(0, Math.min(1, light + sat * Math.cos(hue * 6.28 + 2.09))),
          b: Math.max(0, Math.min(1, light + sat * Math.cos(hue * 6.28 + 4.18))),
        };
      }
    case 15: // rainbow-double
      {
        const hue = ((t * 720) % 360) / 360;
        return {
          r: 0.5 + 0.5 * Math.cos(hue * 6.28 + 0.0),
          g: 0.5 + 0.5 * Math.cos(hue * 6.28 + 2.09),
          b: 0.5 + 0.5 * Math.cos(hue * 6.28 + 4.18),
        };
      }
    case 16: // rainbow-shifted
      {
        const hue = ((t * 360 + 60) % 360) / 360;
        return {
          r: 0.5 + 0.5 * Math.cos(hue * 6.28 + 0.0),
          g: 0.5 + 0.5 * Math.cos(hue * 6.28 + 2.09),
          b: 0.5 + 0.5 * Math.cos(hue * 6.28 + 4.18),
        };
      }
    case 4: // monochrome
      return { r: t, g: t, b: t };
    case 5: // forest
      return { r: t * 0.3, g: t * 0.8, b: t * 0.4 };
    case 6: // sunset
      return { r: t, g: t * 0.4, b: t * 0.2 };
    case 7: // purple
      return { r: t * 0.6, g: t * 0.3, b: t };
    case 8: // cyan
      return { r: 0, g: t, b: t };
    case 9: // gold
      return { r: t, g: t * 0.8, b: t * 0.2 };
    case 10: // ice
      return { r: t * 0.7, g: t * 0.9, b: t };
    case 11: // neon
      {
        const pulse = Math.sin(t * Math.PI) * 0.5 + 0.5;
        return {
          r: t * 0.2 + pulse * 0.8,
          g: t * 0.8 + pulse * 0.2,
          b: t,
        };
      }
    case 17: // cosmic (replaces white - dark space with bright stars/nebulae)
      {
        // Create a cosmic/galaxy theme: dark purples/blues transitioning to bright cyan/white
        // Use t to create variation: low t = dark space, high t = bright stars
        const darkBase = 0.05; // Very dark base
        const brightPeak = 1.0; // Bright highlights
        
        // Create nebula-like colors: deep purple/blue transitioning to cyan/white
        const phase1 = Math.min(t * 2.0, 1.0); // First half: dark to medium
        const phase2 = Math.max(0.0, (t - 0.5) * 2.0); // Second half: medium to bright
        
        // Purple/blue nebula base
        const r = darkBase + (brightPeak - darkBase) * (phase1 * 0.4 + phase2 * 0.6);
        const g = darkBase + (brightPeak - darkBase) * (phase1 * 0.2 + phase2 * 0.8);
        const b = darkBase + (brightPeak - darkBase) * (phase1 * 0.6 + phase2 * 1.0);
        
        // Add some sparkle/stars with sine waves
        const sparkle = Math.sin(t * Math.PI * 8.0) * 0.1 + 0.9;
        
        return {
          r: Math.min(1.0, r * sparkle),
          g: Math.min(1.0, g * sparkle),
          b: Math.min(1.0, b * sparkle),
        };
      }
    case 18: // aurora - Northern lights (greens, blues, purples)
      {
        // Aurora borealis: green to cyan to purple
        const phase = t * 2.0;
        if (phase < 1.0) {
          // Green to cyan transition
          const p = phase;
          return {
            r: 0.1 + p * 0.2,
            g: 0.3 + p * 0.5,
            b: 0.2 + p * 0.6,
          };
        } else {
          // Cyan to purple transition
          const p = phase - 1.0;
          return {
            r: 0.3 + p * 0.5,
            g: 0.8 - p * 0.3,
            b: 0.8 + p * 0.2,
          };
        }
      }
    case 19: // coral - Coral reef (tropical blues, corals, teals)
      {
        // Tropical coral reef: deep blue to teal to coral pink
        const phase1 = Math.min(t * 3.0, 1.0);
        const phase2 = Math.max(0.0, Math.min((t - 0.33) * 3.0, 1.0));
        const phase3 = Math.max(0.0, (t - 0.66) * 3.0);
        
        return {
          r: phase1 * 0.1 + phase2 * 0.3 + phase3 * 1.0,
          g: phase1 * 0.4 + phase2 * 0.8 + phase3 * 0.6,
          b: phase1 * 0.8 + phase2 * 0.7 + phase3 * 0.5,
        };
      }
    case 20: // autumn - Warm autumn colors (oranges, reds, yellows)
      {
        // Autumn: deep red to orange to golden yellow
        const phase1 = Math.min(t * 2.0, 1.0);
        const phase2 = Math.max(0.0, (t - 0.5) * 2.0);
        
        return {
          r: 0.3 + phase1 * 0.5 + phase2 * 0.2,
          g: 0.1 + phase1 * 0.3 + phase2 * 0.6,
          b: 0.0 + phase1 * 0.1 + phase2 * 0.1,
        };
      }
    case 21: // midnight - Deep blues, purples, magentas
      {
        // Midnight: deep navy to purple to magenta
        const phase1 = Math.min(t * 2.0, 1.0);
        const phase2 = Math.max(0.0, (t - 0.5) * 2.0);
        
        return {
          r: 0.05 + phase1 * 0.3 + phase2 * 0.65,
          g: 0.05 + phase1 * 0.2 + phase2 * 0.3,
          b: 0.2 + phase1 * 0.5 + phase2 * 0.3,
        };
      }
    case 22: // emerald - Rich greens with gold accents
      {
        // Emerald: dark green to bright emerald to gold
        const phase1 = Math.min(t * 2.0, 1.0);
        const phase2 = Math.max(0.0, (t - 0.5) * 2.0);
        
        return {
          r: 0.0 + phase1 * 0.1 + phase2 * 0.8,
          g: 0.2 + phase1 * 0.7 + phase2 * 0.6,
          b: 0.1 + phase1 * 0.4 + phase2 * 0.1,
        };
      }
    case 23: // rosegold - Pink, rose, gold tones
      {
        // Rose gold: soft pink to rose to gold
        const phase1 = Math.min(t * 2.0, 1.0);
        const phase2 = Math.max(0.0, (t - 0.5) * 2.0);
        
        return {
          r: 0.3 + phase1 * 0.5 + phase2 * 0.2,
          g: 0.2 + phase1 * 0.3 + phase2 * 0.5,
          b: 0.2 + phase1 * 0.2 + phase2 * 0.1,
        };
      }
    case 24: // electric - Bright neon colors
      {
        // Electric: vibrant neon colors cycling through spectrum
        const hue = ((t * 360 + 180) % 360) / 360; // Shifted for electric feel
        const sat = 1.0;
        const light = 0.5;
        
        return {
          r: Math.max(0, Math.min(1, light + sat * Math.cos(hue * 6.28 + 0.0) * 1.2)),
          g: Math.max(0, Math.min(1, light + sat * Math.cos(hue * 6.28 + 2.09) * 1.2)),
          b: Math.max(0, Math.min(1, light + sat * Math.cos(hue * 6.28 + 4.18) * 1.2)),
        };
      }
    case 25: // vintage - Muted pastels
      {
        // Vintage: muted pastels with sepia tones
        const hue = ((t * 360 + 30) % 360) / 360; // Warm shift
        const sat = 0.4; // Low saturation
        const light = 0.7; // High lightness
        
        return {
          r: light + sat * Math.cos(hue * 6.28 + 0.0) * 0.5,
          g: light + sat * Math.cos(hue * 6.28 + 2.09) * 0.5,
          b: light + sat * Math.cos(hue * 6.28 + 4.18) * 0.5,
        };
      }
    case 26: // tropical - Bright vibrant colors
      {
        // Tropical: bright cyan, magenta, yellow
        const phase = t * 3.0;
        if (phase < 1.0) {
          // Cyan to magenta
          const p = phase;
          return {
            r: 0.0 + p * 1.0,
            g: 1.0 - p * 0.3,
            b: 1.0 - p * 0.5,
          };
        } else if (phase < 2.0) {
          // Magenta to yellow
          const p = phase - 1.0;
          return {
            r: 1.0,
            g: 0.7 + p * 0.3,
            b: 0.5 - p * 0.5,
          };
        } else {
          // Yellow to cyan
          const p = phase - 2.0;
          return {
            r: 1.0 - p * 1.0,
            g: 1.0,
            b: 0.0 + p * 1.0,
          };
        }
      }
    case 27: // galaxy - Deep space with bright stars (different from cosmic)
      {
        // Galaxy: deep indigo to violet to bright white stars
        const darkBase = 0.02;
        const phase1 = Math.min(t * 2.5, 1.0);
        const phase2 = Math.max(0.0, (t - 0.4) * 1.67);
        
        // Deep indigo/violet base
        const r = darkBase + phase1 * 0.4 + phase2 * 0.6;
        const g = darkBase + phase1 * 0.2 + phase2 * 0.8;
        const b = darkBase + phase1 * 0.6 + phase2 * 1.0;
        
        // Bright star sparkle effect
        const sparkle = Math.sin(t * Math.PI * 12.0) * 0.15 + 0.85;
        
        return {
          r: Math.min(1.0, r * sparkle),
          g: Math.min(1.0, g * sparkle),
          b: Math.min(1.0, b * sparkle),
        };
      }
    default: // classic (scheme == 0)
      return { r: t * 0.5, g: t, b: Math.min(t * 1.5, 1) };
  }
}

/**
 * Generates a palette texture for a given color scheme
 * @param {Object} regl - The regl context
 * @param {string} colorScheme - Name of the color scheme
 * @returns {Object} regl texture object
 */
export function generatePaletteTexture(regl, colorScheme) {
  const schemeIndex = getColorSchemeIndex(colorScheme);
  const cacheKey = `${colorScheme}_${PALETTE_SIZE}`;

  // Return cached texture if available
  if (paletteTextureCache.has(cacheKey)) {
    return paletteTextureCache.get(cacheKey);
  }

  // Generate palette data
  const paletteData = new Uint8Array(PALETTE_SIZE * 4); // RGBA

  for (let i = 0; i < PALETTE_SIZE; i++) {
    const t = i / (PALETTE_SIZE - 1);
    const color = computeColorForScheme(t, schemeIndex);

    const offset = i * 4;
    paletteData[offset + 0] = Math.floor(color.r * 255); // R
    paletteData[offset + 1] = Math.floor(color.g * 255); // G
    paletteData[offset + 2] = Math.floor(color.b * 255); // B
    paletteData[offset + 3] = 255; // A (fully opaque)
  }

  // Create 1D texture (using a 1xN 2D texture as WebGL doesn't have true 1D textures)
  const texture = regl.texture({
    width: PALETTE_SIZE,
    height: 1,
    data: paletteData,
    format: 'rgba',
    type: 'uint8',
    min: 'linear',
    mag: 'linear',
    wrap: 'clamp',
  });

  // Cache the texture
  paletteTextureCache.set(cacheKey, texture);

  return texture;
}

/**
 * Clears the palette texture cache
 * Call this when cleaning up resources
 */
export function clearPaletteCache() {
  for (const texture of paletteTextureCache.values()) {
    texture.destroy();
  }
  paletteTextureCache.clear();
}

/**
 * Generates a cache key for shader compilation
 * @param {string} fractalType - Type of fractal
 * @param {string} fragmentShader - Fragment shader source code
 * @returns {string} Cache key
 */
function generateShaderCacheKey(fractalType, fragmentShader) {
  // Use a simple hash of the shader source for the key
  // This ensures we cache based on actual shader code, not just fractal type
  let hash = 0;
  const str = fractalType + fragmentShader;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `${fractalType}_${hash}`;
}

/**
 * Creates a cached regl draw command with dynamic uniforms
 * This caches the shader compilation but allows uniforms to be updated
 * @param {Object} regl - The regl context
 * @param {string} fractalType - Type of fractal
 * @param {string} vertexShader - Vertex shader source
 * @param {string} fragmentShader - Fragment shader source
 * @param {Object} staticConfig - Static configuration (attributes, viewport, etc.)
 * @returns {Function} regl draw command factory that accepts uniforms
 */
export function createCachedShaderDrawCommand(regl, fractalType, vertexShader, fragmentShader, staticConfig) {
  const cacheKey = generateShaderCacheKey(fractalType, fragmentShader);
  
  // Check cache first
  if (shaderCache.has(cacheKey)) {
    // Return the cached factory function
    return shaderCache.get(cacheKey);
  }
  
  // Create and cache the factory function
  const factory = (uniforms) => {
    return regl({
      vert: vertexShader,
      frag: fragmentShader,
      ...staticConfig,
      uniforms: uniforms,
    });
  };
  
  // Cache it (with size limit)
  if (shaderCache.size >= MAX_SHADER_CACHE_SIZE) {
    // Remove oldest entry (simple FIFO)
    const firstKey = shaderCache.keys().next().value;
    shaderCache.delete(firstKey);
  }
  
  shaderCache.set(cacheKey, factory);
  return factory;
}

/**
 * Clears the shader cache
 * Call this when cleaning up resources
 */
export function clearShaderCache() {
  for (const drawCommand of shaderCache.values()) {
    if (drawCommand && drawCommand.destroy) {
      drawCommand.destroy();
    }
  }
  shaderCache.clear();
}

/**
 * Helper function to check if a fractal type is a Julia variant
 * @param {string} fractalType - The fractal type name
 * @returns {boolean} True if it's a Julia variant
 */
export function isJuliaType(fractalType) {
  const juliaTypes = [
    'julia',
    'julia-snakes',
    'multibrot-julia',
    'burning-ship-julia',
    'tricorn-julia',
    'phoenix-julia',
    'lambda-julia',
    'hybrid-julia',
    'magnet',
  ];
  return juliaTypes.includes(fractalType);
}

/**
 * Creates a standard regl draw command for 2D shader-based fractals
 * Reduces code duplication across fractal files
 * @param {Object} regl - The regl context
 * @param {Object} params - Render parameters
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {string} fragmentShader - The fragment shader source
 * @param {Object} options - Optional overrides (vertexShader, juliaC, etc.)
 * @returns {Function} regl draw command
 */
export function createStandardDrawCommand(regl, params, canvas, fragmentShader, options = {}) {
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);
  const vertexShaderSource = options.vertexShader || vertexShader;
  const juliaC = options.juliaC !== undefined 
    ? [options.juliaC.x, options.juliaC.y] 
    : (isJuliaType(options.fractalType || '') 
        ? [params.juliaC.x, params.juliaC.y] 
        : [0, 0]);

  return regl({
    vert: vertexShaderSource,
    frag: fragmentShader,
    attributes: {
      position: [-1, -1, 1, -1, -1, 1, 1, 1], // Full-screen quad
    },
    uniforms: {
      uTime: options.uTime ?? 0,
      uIterations: params.iterations,
      uZoom: params.zoom,
      uOffset: [params.offset.x, params.offset.y],
      uResolution: [canvas.width, canvas.height],
      uJuliaC: juliaC,
      uPalette: paletteTexture,
      uXScale: params.xScale,
      uYScale: params.yScale,
    },
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    },
    count: 4,
    primitive: 'triangle strip',
  });
}

// Color schemes (for CPU-side color calculations if needed)
export function getColor(iterations, maxIterations, scheme) {
  if (iterations >= maxIterations) return { r: 0, g: 0, b: 0 };

  const t = iterations / maxIterations;
  const schemeIndex = getColorSchemeIndex(scheme);
  return computeColorForScheme(t, schemeIndex);
}

export function getColorSchemeIndex(scheme) {
  const schemes = [
    'classic',
    'fire',
    'ocean',
    'rainbow',
    'monochrome',
    'forest',
    'sunset',
    'purple',
    'cyan',
    'gold',
    'ice',
    'neon',
    'rainbow-pastel',
    'rainbow-dark',
    'rainbow-vibrant',
    'rainbow-double',
    'rainbow-shifted',
    'cosmic',
    'aurora',
    'coral',
    'autumn',
    'midnight',
    'emerald',
    'rosegold',
    'electric',
    'vintage',
    'tropical',
    'galaxy',
  ];
  return schemes.indexOf(scheme);
}

// Vertex shader for 2D fractals (regl uses a full-screen quad)
export const vertexShader = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0, 1);
    }
`;

// Base fragment shader template for 2D fractals
// Optimized for performance: uses mediump precision, precomputed constants
export function createFragmentShader(fractalFunction) {
  return `
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
    
    // Precomputed constants for better performance
    const float LOG2 = 0.6931471805599453; // log(2.0)
    const float INV_LOG2 = 1.4426950408889634; // 1.0 / log(2.0)
    const float ESCAPE_RADIUS_SQ = 4.0; // Escape radius squared (2.0^2)
    
    ${fractalFunction}
    
    void main() {
        vec2 uv = vUv;
        
        // Precompute aspect ratio and scale once
        float aspect = uResolution.x / uResolution.y;
        float scale = 4.0 / uZoom;
        
        // Optimize coordinate calculation
        vec2 uvCentered = uv - 0.5;
        vec2 c = vec2(
            uvCentered.x * scale * aspect * uXScale + uOffset.x,
            uvCentered.y * scale * uYScale + uOffset.y
        );
        
        float iterations = computeFractal(c);
        
        // Normalized iteration value for color lookup
        // Use multiplication instead of division where possible
        float invIterations = 1.0 / uIterations;
        float t = clamp(iterations * invIterations, 0.0, 1.0);
        
        // Texture-based palette lookup (much faster than computed colors)
        vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
        
        // Points in the set are black - use step() to avoid branch
        float isInSet = step(uIterations, iterations);
        color = mix(color, vec3(0.0), isInSet);
        
        gl_FragColor = vec4(color, 1.0);
    }
`;
}
