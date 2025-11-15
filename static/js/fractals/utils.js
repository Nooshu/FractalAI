// Palette texture cache
const paletteTextureCache = new Map();
const PALETTE_SIZE = 512; // Number of colors in the palette texture

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
    case 12: // rainbow2 - pastel
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
    case 13: // rainbow3 - dark
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
    case 14: // rainbow4 - vibrant
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
    case 15: // rainbow5 - double
      {
        const hue = ((t * 720) % 360) / 360;
        return {
          r: 0.5 + 0.5 * Math.cos(hue * 6.28 + 0.0),
          g: 0.5 + 0.5 * Math.cos(hue * 6.28 + 2.09),
          b: 0.5 + 0.5 * Math.cos(hue * 6.28 + 4.18),
        };
      }
    case 16: // rainbow6 - shifted
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
    'rainbow2',
    'rainbow3',
    'rainbow4',
    'rainbow5',
    'rainbow6',
    'cosmic',
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
export function createFragmentShader(fractalFunction) {
  return `
    #ifdef GL_ES
    precision highp float;
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
        vec2 uv = vUv;
        float aspect = uResolution.x / uResolution.y;
        float scale = 4.0 / uZoom;
        vec2 c = vec2(
            (uv.x - 0.5) * scale * aspect * uXScale + uOffset.x,
            (uv.y - 0.5) * scale * uYScale + uOffset.y
        );
        
        float iterations = computeFractal(c);
        
        // Normalized iteration value for color lookup
        float t = clamp(iterations / uIterations, 0.0, 1.0);
        
        // Texture-based palette lookup (much faster than computed colors)
        vec3 color = texture2D(uPalette, vec2(t, 0.5)).rgb;
        
        // Points in the set are black
        if (iterations >= uIterations) {
            color = vec3(0.0);
        }
        
        gl_FragColor = vec4(color, 1.0);
    }
`;
}
