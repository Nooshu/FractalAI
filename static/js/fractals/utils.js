// Palette texture cache
const paletteTextureCache = new Map();
const PALETTE_SIZE = 512; // Number of colors in the palette texture

// Shader compilation cache
// Caches compiled regl draw commands to avoid recompilation
const shaderCache = new Map();
const MAX_SHADER_CACHE_SIZE = 50; // Maximum number of cached shaders

/**
 * Generates a color value for a given t value (0-1) and scheme
 * Optimized version that writes to out array to avoid allocations
 * @param {number} t - Value from 0 to 1
 * @param {number} schemeIndex - Index of the color scheme
 * @param {Float32Array|Array} out - Output array [r, g, b] (optional, creates new array if not provided)
 * @returns {Float32Array|Array} RGB color [r, g, b] in range [0, 1]
 */
export function computeColorForScheme(t, schemeIndex, out = null) {
  // Clamp t to [0, 1]
  t = Math.max(0, Math.min(1, t));

  // Reuse output array if provided, otherwise create new one
  if (!out) {
    out = new Float32Array(3);
  }

  switch (schemeIndex) {
    case 1: // fire
      out[0] = t;
      out[1] = t * 0.5;
      out[2] = 0;
      return out;
    case 2: // ocean
      out[0] = 0;
      out[1] = t * 0.5;
      out[2] = t;
      return out;
    case 3: {
      // rainbow
      const hue = ((t * 360) % 360) / 360;
      out[0] = 0.5 + 0.5 * Math.cos(hue * 6.28 + 0.0);
      out[1] = 0.5 + 0.5 * Math.cos(hue * 6.28 + 2.09);
      out[2] = 0.5 + 0.5 * Math.cos(hue * 6.28 + 4.18);
      return out;
    }
    case 12: {
      // rainbow-pastel
      const hue = ((t * 360) % 360) / 360;
      const sat = 0.6;
      const light = 0.7;
      out[0] = light + sat * Math.cos(hue * 6.28 + 0.0);
      out[1] = light + sat * Math.cos(hue * 6.28 + 2.09);
      out[2] = light + sat * Math.cos(hue * 6.28 + 4.18);
      return out;
    }
    case 13: {
      // rainbow-dark
      const hue = ((t * 360) % 360) / 360;
      const sat = 1.0;
      const light = 0.3;
      out[0] = light + sat * Math.cos(hue * 6.28 + 0.0);
      out[1] = light + sat * Math.cos(hue * 6.28 + 2.09);
      out[2] = light + sat * Math.cos(hue * 6.28 + 4.18);
      return out;
    }
    case 14: {
      // rainbow-vibrant
      const hue = ((t * 360) % 360) / 360;
      const sat = 1.2;
      const light = 0.4;
      out[0] = Math.max(0, Math.min(1, light + sat * Math.cos(hue * 6.28 + 0.0)));
      out[1] = Math.max(0, Math.min(1, light + sat * Math.cos(hue * 6.28 + 2.09)));
      out[2] = Math.max(0, Math.min(1, light + sat * Math.cos(hue * 6.28 + 4.18)));
      return out;
    }
    case 15: {
      // rainbow-double
      const hue = ((t * 720) % 360) / 360;
      out[0] = 0.5 + 0.5 * Math.cos(hue * 6.28 + 0.0);
      out[1] = 0.5 + 0.5 * Math.cos(hue * 6.28 + 2.09);
      out[2] = 0.5 + 0.5 * Math.cos(hue * 6.28 + 4.18);
      return out;
    }
    case 16: {
      // rainbow-shifted
      const hue = ((t * 360 + 60) % 360) / 360;
      out[0] = 0.5 + 0.5 * Math.cos(hue * 6.28 + 0.0);
      out[1] = 0.5 + 0.5 * Math.cos(hue * 6.28 + 2.09);
      out[2] = 0.5 + 0.5 * Math.cos(hue * 6.28 + 4.18);
      return out;
    }
    case 4: // monochrome
      out[0] = t;
      out[1] = t;
      out[2] = t;
      return out;
    case 5: // forest
      out[0] = t * 0.3;
      out[1] = t * 0.8;
      out[2] = t * 0.4;
      return out;
    case 6: // sunset
      out[0] = t;
      out[1] = t * 0.4;
      out[2] = t * 0.2;
      return out;
    case 7: // purple
      out[0] = t * 0.6;
      out[1] = t * 0.3;
      out[2] = t;
      return out;
    case 8: // cyan
      out[0] = 0;
      out[1] = t;
      out[2] = t;
      return out;
    case 9: // gold
      out[0] = t;
      out[1] = t * 0.8;
      out[2] = t * 0.2;
      return out;
    case 10: // ice
      out[0] = t * 0.7;
      out[1] = t * 0.9;
      out[2] = t;
      return out;
    case 11: {
      // neon
      const pulse = Math.sin(t * Math.PI) * 0.5 + 0.5;
      out[0] = t * 0.2 + pulse * 0.8;
      out[1] = t * 0.8 + pulse * 0.2;
      out[2] = t;
      return out;
    }
    case 17: {
      // cosmic (replaces white - dark space with bright stars/nebulae)
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

      out[0] = Math.min(1.0, r * sparkle);
      out[1] = Math.min(1.0, g * sparkle);
      out[2] = Math.min(1.0, b * sparkle);
      return out;
    }
    case 18: {
      // aurora - Northern lights (greens, blues, purples)
      // Aurora borealis: green to cyan to purple
      const phase = t * 2.0;
      if (phase < 1.0) {
        // Green to cyan transition
        const p = phase;
        out[0] = 0.1 + p * 0.2;
        out[1] = 0.3 + p * 0.5;
        out[2] = 0.2 + p * 0.6;
      } else {
        // Cyan to purple transition
        const p = phase - 1.0;
        out[0] = 0.3 + p * 0.5;
        out[1] = 0.8 - p * 0.3;
        out[2] = 0.8 + p * 0.2;
      }
      return out;
    }
    case 19: {
      // coral - Coral reef (tropical blues, corals, teals)
      // Tropical coral reef: deep blue to teal to coral pink
      const phase1 = Math.min(t * 3.0, 1.0);
      const phase2 = Math.max(0.0, Math.min((t - 0.33) * 3.0, 1.0));
      const phase3 = Math.max(0.0, (t - 0.66) * 3.0);

      out[0] = phase1 * 0.1 + phase2 * 0.3 + phase3 * 1.0;
      out[1] = phase1 * 0.4 + phase2 * 0.8 + phase3 * 0.6;
      out[2] = phase1 * 0.8 + phase2 * 0.7 + phase3 * 0.5;
      return out;
    }
    case 20: {
      // autumn - Warm autumn colors (oranges, reds, yellows)
      // Autumn: deep red to orange to golden yellow
      const phase1 = Math.min(t * 2.0, 1.0);
      const phase2 = Math.max(0.0, (t - 0.5) * 2.0);

      out[0] = 0.3 + phase1 * 0.5 + phase2 * 0.2;
      out[1] = 0.1 + phase1 * 0.3 + phase2 * 0.6;
      out[2] = 0.0 + phase1 * 0.1 + phase2 * 0.1;
      return out;
    }
    case 21: {
      // midnight - Deep blues, purples, magentas
      // Midnight: deep navy to purple to magenta
      const phase1 = Math.min(t * 2.0, 1.0);
      const phase2 = Math.max(0.0, (t - 0.5) * 2.0);

      out[0] = 0.05 + phase1 * 0.3 + phase2 * 0.65;
      out[1] = 0.05 + phase1 * 0.2 + phase2 * 0.3;
      out[2] = 0.2 + phase1 * 0.5 + phase2 * 0.3;
      return out;
    }
    case 22: {
      // emerald - Rich greens with gold accents
      // Emerald: dark green to bright emerald to gold
      const phase1 = Math.min(t * 2.0, 1.0);
      const phase2 = Math.max(0.0, (t - 0.5) * 2.0);

      out[0] = 0.0 + phase1 * 0.1 + phase2 * 0.8;
      out[1] = 0.2 + phase1 * 0.7 + phase2 * 0.6;
      out[2] = 0.1 + phase1 * 0.4 + phase2 * 0.1;
      return out;
    }
    case 23: {
      // rosegold - Pink, rose, gold tones
      // Rose gold: soft pink to rose to gold
      const phase1 = Math.min(t * 2.0, 1.0);
      const phase2 = Math.max(0.0, (t - 0.5) * 2.0);

      out[0] = 0.3 + phase1 * 0.5 + phase2 * 0.2;
      out[1] = 0.2 + phase1 * 0.3 + phase2 * 0.5;
      out[2] = 0.2 + phase1 * 0.2 + phase2 * 0.1;
      return out;
    }
    case 24: {
      // electric - Bright neon colors
      // Electric: vibrant neon colors cycling through spectrum
      const hue = ((t * 360 + 180) % 360) / 360; // Shifted for electric feel
      const sat = 1.0;
      const light = 0.5;

      out[0] = Math.max(0, Math.min(1, light + sat * Math.cos(hue * 6.28 + 0.0) * 1.2));
      out[1] = Math.max(0, Math.min(1, light + sat * Math.cos(hue * 6.28 + 2.09) * 1.2));
      out[2] = Math.max(0, Math.min(1, light + sat * Math.cos(hue * 6.28 + 4.18) * 1.2));
      return out;
    }
    case 25: {
      // vintage - Muted pastels
      // Vintage: muted pastels with sepia tones
      const hue = ((t * 360 + 30) % 360) / 360; // Warm shift
      const sat = 0.4; // Low saturation
      const light = 0.7; // High lightness

      out[0] = light + sat * Math.cos(hue * 6.28 + 0.0) * 0.5;
      out[1] = light + sat * Math.cos(hue * 6.28 + 2.09) * 0.5;
      out[2] = light + sat * Math.cos(hue * 6.28 + 4.18) * 0.5;
      return out;
    }
    case 26: {
      // tropical - Bright vibrant colors
      // Tropical: bright cyan, magenta, yellow
      const phase = t * 3.0;
      if (phase < 1.0) {
        // Cyan to magenta
        const p = phase;
        out[0] = 0.0 + p * 1.0;
        out[1] = 1.0 - p * 0.3;
        out[2] = 1.0 - p * 0.5;
      } else if (phase < 2.0) {
        // Magenta to yellow
        const p = phase - 1.0;
        out[0] = 1.0;
        out[1] = 0.7 + p * 0.3;
        out[2] = 0.5 - p * 0.5;
      } else {
        // Yellow to cyan
        const p = phase - 2.0;
        out[0] = 1.0 - p * 1.0;
        out[1] = 1.0;
        out[2] = 0.0 + p * 1.0;
      }
      return out;
    }
    case 27: {
      // galaxy - Deep space with bright stars (different from cosmic)
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

      out[0] = Math.min(1.0, r * sparkle);
      out[1] = Math.min(1.0, g * sparkle);
      out[2] = Math.min(1.0, b * sparkle);
      return out;
    }
    default: // classic (scheme == 0)
      out[0] = t * 0.5;
      out[1] = t;
      out[2] = Math.min(t * 1.5, 1);
      return out;
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
  // Pre-allocate reusable color array to avoid allocations in hot loop
  const colorOut = new Float32Array(3);

  for (let i = 0; i < PALETTE_SIZE; i++) {
    const t = i / (PALETTE_SIZE - 1);
    const color = computeColorForScheme(t, schemeIndex, colorOut);

    const offset = i * 4;
    paletteData[offset + 0] = Math.floor(color[0] * 255); // R
    paletteData[offset + 1] = Math.floor(color[1] * 255); // G
    paletteData[offset + 2] = Math.floor(color[2] * 255); // B
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
    hash = (hash << 5) - hash + char;
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
export function createCachedShaderDrawCommand(
  regl,
  fractalType,
  vertexShader,
  fragmentShader,
  staticConfig
) {
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
  const juliaC =
    options.juliaC !== undefined
      ? [options.juliaC.x, options.juliaC.y]
      : isJuliaType(options.fractalType || '')
        ? [params.juliaC.x, params.juliaC.y]
        : [0, 0];

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
// Note: This function returns an array [r, g, b] instead of an object for performance
export function getColor(iterations, maxIterations, scheme) {
  if (iterations >= maxIterations) {
    const out = new Float32Array(3);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
  }

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
