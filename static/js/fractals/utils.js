// Palette texture cache
const paletteTextureCache = new Map();
const PALETTE_SIZE = 512; // Number of colors in the palette texture

// Shader compilation cache
// Caches compiled regl draw commands to avoid recompilation
const shaderCache = new Map();
const MAX_SHADER_CACHE_SIZE = 50; // Maximum number of cached shaders

// Shared vertex buffer cache for full-screen quad
// Reused across all fractals to reduce memory allocations and improve GPU cache usage
const vertexBufferCache = new Map();

/**
 * Gets or creates a persistent vertex buffer for the full-screen quad
 * Reuses the same buffer across all fractals for better performance
 * @param {Object} regl - The regl context
 * @returns {Object} regl buffer object for the full-screen quad vertices
 */
export function getFullScreenQuadBuffer(regl) {
  // Use regl context as cache key (each regl instance should have its own buffer)
  const cacheKey = regl._gl || regl;
  
  if (vertexBufferCache.has(cacheKey)) {
    return vertexBufferCache.get(cacheKey);
  }

  // Create persistent vertex buffer for full-screen quad
  // Vertices: [-1, -1, 1, -1, -1, 1, 1, 1] forms a triangle strip covering the entire screen
  const quadBuffer = regl.buffer([-1, -1, 1, -1, -1, 1, 1, 1]);
  vertexBufferCache.set(cacheKey, quadBuffer);
  
  return quadBuffer;
}

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
    case 28: {
      // lava - Molten lava (deep red to bright orange/yellow)
      // Lava: dark red to bright orange to yellow-white
      const phase1 = Math.min(t * 2.0, 1.0);
      const phase2 = Math.max(0.0, (t - 0.5) * 2.0);

      out[0] = 0.2 + phase1 * 0.6 + phase2 * 0.2;
      out[1] = 0.0 + phase1 * 0.4 + phase2 * 0.6;
      out[2] = 0.0 + phase1 * 0.1 + phase2 * 0.9;
      return out;
    }
    case 29: {
      // arctic - Cool arctic blues and whites
      // Arctic: deep blue to cyan to white
      const phase1 = Math.min(t * 2.0, 1.0);
      const phase2 = Math.max(0.0, (t - 0.5) * 2.0);

      out[0] = 0.1 + phase1 * 0.3 + phase2 * 0.6;
      out[1] = 0.2 + phase1 * 0.5 + phase2 * 0.3;
      out[2] = 0.4 + phase1 * 0.4 + phase2 * 0.6;
      return out;
    }
    case 30: {
      // sakura - Cherry blossom pinks
      // Sakura: soft pink to rose to white
      const phase1 = Math.min(t * 2.5, 1.0);
      const phase2 = Math.max(0.0, (t - 0.4) * 1.67);

      out[0] = 0.3 + phase1 * 0.5 + phase2 * 0.2;
      out[1] = 0.2 + phase1 * 0.4 + phase2 * 0.4;
      out[2] = 0.25 + phase1 * 0.35 + phase2 * 0.4;
      return out;
    }
    case 31: {
      // volcanic - Dark volcanic colors (black, dark red, orange)
      // Volcanic: black to dark red to orange
      const darkBase = 0.05;
      const phase1 = Math.min(t * 3.0, 1.0);
      const phase2 = Math.max(0.0, (t - 0.33) * 1.5);

      out[0] = darkBase + phase1 * 0.4 + phase2 * 0.55;
      out[1] = darkBase + phase1 * 0.1 + phase2 * 0.4;
      out[2] = darkBase + phase1 * 0.0 + phase2 * 0.2;
      return out;
    }
    case 32: {
      // mint - Fresh mint greens and teals
      // Mint: dark green to bright mint to cyan
      const phase1 = Math.min(t * 2.0, 1.0);
      const phase2 = Math.max(0.0, (t - 0.5) * 2.0);

      out[0] = 0.1 + phase1 * 0.2 + phase2 * 0.3;
      out[1] = 0.3 + phase1 * 0.5 + phase2 * 0.2;
      out[2] = 0.2 + phase1 * 0.4 + phase2 * 0.4;
      return out;
    }
    case 33: {
      // sunrise - Soft sunrise colors (pink, orange, yellow)
      // Sunrise: soft pink to orange to bright yellow
      const phase1 = Math.min(t * 2.0, 1.0);
      const phase2 = Math.max(0.0, (t - 0.5) * 2.0);

      out[0] = 0.4 + phase1 * 0.4 + phase2 * 0.2;
      out[1] = 0.3 + phase1 * 0.3 + phase2 * 0.4;
      out[2] = 0.35 + phase1 * 0.15 + phase2 * 0.5;
      return out;
    }
    case 34: {
      // steel - Metallic steel grays and blues
      // Steel: dark gray to blue-gray to silver
      const phase1 = Math.min(t * 2.0, 1.0);
      const phase2 = Math.max(0.0, (t - 0.5) * 2.0);

      out[0] = 0.2 + phase1 * 0.3 + phase2 * 0.3;
      out[1] = 0.25 + phase1 * 0.35 + phase2 * 0.25;
      out[2] = 0.3 + phase1 * 0.4 + phase2 * 0.3;
      return out;
    }
    case 35: {
      // prism - Inverted prism (dark base with bright complementary colors)
      // Prism: inverted rainbow - uses complementary colors with inverted brightness
      const hue = ((t * 360 * 1.5 + 180) % 360) / 360; // Shift 180 degrees for complementary colors
      
      // Calculate complementary colors
      const r = 0.5 + 0.5 * Math.cos(hue * 6.28 + 0.0);
      const g = 0.5 + 0.5 * Math.cos(hue * 6.28 + 2.09);
      const b = 0.5 + 0.5 * Math.cos(hue * 6.28 + 4.18);

      // Invert: dark base with bright complementary colors
      // Where rainbow is bright, prism is dark; where rainbow is dark, prism is bright
      out[0] = Math.max(0, Math.min(1, 0.15 + (1.0 - r) * 0.85));
      out[1] = Math.max(0, Math.min(1, 0.15 + (1.0 - g) * 0.85));
      out[2] = Math.max(0, Math.min(1, 0.15 + (1.0 - b) * 0.85));
      return out;
    }
    case 36: {
      // mystic - Deep purples and magentas with sparkles
      // Mystic: deep purple to magenta to bright pink with sparkle
      const phase1 = Math.min(t * 2.0, 1.0);
      const phase2 = Math.max(0.0, (t - 0.5) * 2.0);

      const r = 0.1 + phase1 * 0.5 + phase2 * 0.4;
      const g = 0.05 + phase1 * 0.2 + phase2 * 0.5;
      const b = 0.2 + phase1 * 0.6 + phase2 * 0.2;

      // Add sparkle effect
      const sparkle = Math.sin(t * Math.PI * 10.0) * 0.2 + 0.8;

      out[0] = Math.min(1.0, r * sparkle);
      out[1] = Math.min(1.0, g * sparkle);
      out[2] = Math.min(1.0, b * sparkle);
      return out;
    }
    case 37: {
      // amber - Warm amber, honey, brown tones
      // Amber: dark brown to amber to golden yellow
      const phase1 = Math.min(t * 2.0, 1.0);
      const phase2 = Math.max(0.0, (t - 0.5) * 2.0);

      out[0] = 0.2 + phase1 * 0.5 + phase2 * 0.3;
      out[1] = 0.15 + phase1 * 0.4 + phase2 * 0.45;
      out[2] = 0.1 + phase1 * 0.2 + phase2 * 0.7;
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
 * Uses immutable texture storage for WebGL2 (better memory allocation and performance)
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

  // Check if WebGL2 is available for immutable texture storage
  const gl = regl._gl;
  const isWebGL2 = gl && typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;

  let texture;

  if (isWebGL2) {
    // WebGL2: Use immutable texture storage for better memory allocation and performance
    // Create texture using raw WebGL2 API for immutable storage
    const webglTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, webglTexture);
    
    // Allocate immutable storage (texStorage2D instead of texImage2D)
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, PALETTE_SIZE, 1);
    
    // Upload texture data
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PALETTE_SIZE, 1, gl.RGBA, gl.UNSIGNED_BYTE, paletteData);
    
    // Set texture parameters
    // Use linear filtering for smooth color gradients in palette textures
    // The overhead is minimal for 1D textures (512x1), and the visual quality benefit is significant
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    // Wrap the WebGL texture in a regl texture object
    texture = regl.texture({
      texture: webglTexture,
      width: PALETTE_SIZE,
      height: 1,
    });
  } else {
    // WebGL1: Use standard texture creation
    // Use linear filtering for smooth color gradients in palette textures
    // The overhead is minimal for 1D textures (512x1), and the visual quality benefit is significant
    texture = regl.texture({
      width: PALETTE_SIZE,
      height: 1,
      data: paletteData,
      format: 'rgba',
      type: 'uint8',
      min: 'linear', // Smooth gradients
      mag: 'linear', // Smooth gradients
      wrap: 'clamp',
    });
  }

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
 * Clears the vertex buffer cache
 * Call this when cleaning up resources
 */
export function clearVertexBufferCache() {
  for (const buffer of vertexBufferCache.values()) {
    if (buffer && typeof buffer.destroy === 'function') {
      buffer.destroy();
    }
  }
  vertexBufferCache.clear();
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

  // Use persistent vertex buffer for better performance
  const quadBuffer = getFullScreenQuadBuffer(regl);

  return regl({
    vert: vertexShaderSource,
    frag: fragmentShader,
    attributes: {
      position: quadBuffer, // Reuse persistent buffer instead of inline data
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
    'lava',
    'arctic',
    'sakura',
    'volcanic',
    'mint',
    'sunrise',
    'steel',
    'prism',
    'mystic',
    'amber',
  ];
  return schemes.indexOf(scheme);
}

// Vertex shader for 2D fractals (regl uses a full-screen quad)
// Supports both WebGL1 and WebGL2
export function getVertexShader(useUBO = false) {
  if (useUBO) {
    // WebGL2 version
    return `#version 300 es
    in vec2 position;
    out vec2 vUv;
    void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0, 1);
    }`;
  }
  
  // WebGL1 version (default)
  return `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0, 1);
    }
`;
}

// Export default WebGL1 vertex shader for backward compatibility
export const vertexShader = getVertexShader(false);

/**
 * Determines optimal precision level based on zoom level
 * @param {number} zoom - Current zoom level
 * @returns {string} Precision level: 'highp' for deep zooms, 'mediump' for normal, 'lowp' for fast
 */
export function getOptimalPrecision(zoom) {
  // Use highp for deep zooms (> 1e6) to maintain precision
  if (zoom > 1e6) {
    return 'highp';
  }
  // Use mediump for normal zooms (default)
  return 'mediump';
}

/**
 * Generates unrolled loop code for fractal iterations
 * Optimizes performance by reducing loop overhead for common iteration counts
 * @param {number} count - Number of iterations to unroll
 * @param {function} iterationFn - Function that generates code for a single iteration (i) => string
 * @returns {string} Unrolled loop code
 */
export function generateUnrolledLoop(count, iterationFn) {
  let code = '';
  for (let i = 0; i < count; i++) {
    code += iterationFn(i);
  }
  return code;
}

/**
 * Helper to generate adaptive unrolled loop based on iteration count
 * Unrolls more iterations for common cases to improve performance
 * @param {number} maxIterations - Maximum iteration count
 * @param {function} iterationFn - Function that generates code for a single iteration
 * @param {number} unrollCount - Number of iterations to unroll (default: 8)
 * @returns {string} Unrolled loop code followed by regular loop
 */
export function generateAdaptiveUnrolledLoop(maxIterations, iterationFn, unrollCount = 8) {
  // Unroll first N iterations (common case optimization)
  const unrolled = generateUnrolledLoop(unrollCount, iterationFn);
  
  // Continue with regular loop for remaining iterations
  const loopCode = `
    for (int i = ${unrollCount}; i < 200; i++) {
      if (i >= int(uIterations)) break;
      ${iterationFn('i')}
    }
  `;
  
  return unrolled + loopCode;
}

// Base fragment shader template for 2D fractals
// Optimized for performance: adaptive precision, precomputed constants, early exits
// Supports both WebGL1 (regular uniforms) and WebGL2 (UBOs)
// @param {string} fractalFunction - The fractal computation function
// @param {boolean} useUBO - Whether to use WebGL2 UBOs
// @param {string} precision - Precision level: 'highp' (deep zooms), 'mediump' (default), 'lowp' (fast)
export function createFragmentShader(fractalFunction, useUBO = false, precision = 'mediump') {
  // Determine precision qualifiers
  // Use highp for critical calculations, lowp for colors/textures
  const calcPrecision = precision === 'highp' ? 'highp' : precision === 'lowp' ? 'lowp' : 'mediump';
  const colorPrecision = 'lowp'; // Colors don't need high precision
  
  // WebGL2 UBO version
  if (useUBO) {
    return `#version 300 es
    #ifdef GL_ES
    precision ${calcPrecision} float; // For fractal calculations
    precision ${colorPrecision} sampler2D; // For texture lookups
    #endif
    
    layout(std140) uniform FractalParams {
      float uIterations;
      float uZoom;
      vec2 uOffset;
      vec2 uJuliaC;
      vec2 uScale; // xScale, yScale
    };
    
    // Provide aliases for compatibility with fractal functions
    #define uXScale uScale.x
    #define uYScale uScale.y
    
    uniform float uTime;
    uniform vec2 uResolution;
    uniform sampler2D uPalette;
    
    in vec2 vUv;
    out vec4 fragColor;
    
    // Precomputed constants for better performance
    const float LOG2 = 0.6931471805599453; // log(2.0)
    const float INV_LOG2 = 1.4426950408889634; // 1.0 / log(2.0)
    const float ESCAPE_RADIUS_SQ = 4.0; // Escape radius squared (2.0^2)
    const float ESCAPE_RADIUS_SQ_EARLY = 2.0; // Early exit threshold for faster bailout
    
    ${fractalFunction}
    
    void main() {
        vec2 uv = vUv;
        
        // Precompute aspect ratio and scale once
        float aspect = uResolution.x / uResolution.y;
        float scale = 4.0 / uZoom;
        
        // Optimize coordinate calculation using vector operations
        vec2 uvCentered = uv - 0.5;
        vec2 c = vec2(
            uvCentered.x * scale * aspect * uScale.x + uOffset.x,
            uvCentered.y * scale * uScale.y + uOffset.y
        );
        
        float iterations = computeFractal(c);
        
        // Normalized iteration value for color lookup
        // Use multiplication instead of division where possible
        float invIterations = 1.0 / uIterations;
        float t = clamp(iterations * invIterations, 0.0, 1.0);
        
        // Texture-based palette lookup (much faster than computed colors)
        // Use lowp precision for color operations (faster, sufficient precision)
        ${colorPrecision} vec3 color = texture(uPalette, vec2(t, 0.5)).rgb;
        
        // Points in the set are black - use step() to avoid branch
        float isInSet = step(uIterations, iterations);
        color = mix(color, vec3(0.0), isInSet);
        
        fragColor = vec4(color, 1.0);
    }`;
  }

  // WebGL1 regular uniforms version (default)
  return `
    #ifdef GL_ES
    precision ${calcPrecision} float; // For fractal calculations
    precision ${colorPrecision} sampler2D; // For texture lookups
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
    const float ESCAPE_RADIUS_SQ_EARLY = 2.0; // Early exit threshold for faster bailout
    
    ${fractalFunction}
    
    void main() {
        vec2 uv = vUv;
        
        // Precompute aspect ratio and scale once
        float aspect = uResolution.x / uResolution.y;
        float scale = 4.0 / uZoom;
        
        // Optimize coordinate calculation using vector operations
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
        // Use lowp precision for color operations (faster, sufficient precision)
        ${colorPrecision} vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
        
        // Points in the set are black - use step() to avoid branch
        float isInSet = step(uIterations, iterations);
        color = mix(color, vec3(0.0), isInSet);
        
        gl_FragColor = vec4(color, 1.0);
    }
`;
}
