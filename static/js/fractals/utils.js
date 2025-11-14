// Color schemes (for CPU-side color calculations if needed)
export function getColor(iterations, maxIterations, scheme) {
  if (iterations >= maxIterations) return { r: 0, g: 0, b: 0 };

  const t = iterations / maxIterations;

  switch (scheme) {
    case 'fire':
      return { r: t, g: t * 0.5, b: 0 };
    case 'ocean':
      return { r: 0, g: t * 0.5, b: t };
    case 'rainbow': {
      const hue = (t * 360) % 360;
      const h = hue / 360;
      // Convert HSL to RGB
      const c = 1;
      const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
      const m = 0.5 - c / 2;
      let r, g, b;
      if (h < 1 / 6) {
        r = c;
        g = x;
        b = 0;
      } else if (h < 2 / 6) {
        r = x;
        g = c;
        b = 0;
      } else if (h < 3 / 6) {
        r = 0;
        g = c;
        b = x;
      } else if (h < 4 / 6) {
        r = 0;
        g = x;
        b = c;
      } else if (h < 5 / 6) {
        r = x;
        g = 0;
        b = c;
      } else {
        r = c;
        g = 0;
        b = x;
      }
      return { r: r + m, g: g + m, b: b + m };
    }
    case 'monochrome':
      return { r: t, g: t, b: t };
    default: // classic
      return { r: t * 0.5, g: t, b: t * 1.5 };
  }
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
    uniform int uColorScheme;
    uniform float uXScale;
    uniform float uYScale;
    
    varying vec2 vUv;
    
    vec3 getColorScheme(float t, int scheme) {
        if (scheme == 1) { // fire
            return vec3(t, t * 0.5, 0.0);
        } else if (scheme == 2) { // ocean
            return vec3(0.0, t * 0.5, t);
        } else if (scheme == 3) { // rainbow
            float hue = mod(t * 360.0, 360.0) / 360.0;
            return vec3(0.5 + 0.5 * cos(hue * 6.28 + 0.0),
                       0.5 + 0.5 * cos(hue * 6.28 + 2.09),
                       0.5 + 0.5 * cos(hue * 6.28 + 4.18));
        } else if (scheme == 12) { // rainbow2 - pastel rainbow
            float hue = mod(t * 360.0, 360.0) / 360.0;
            float sat = 0.6; // Lower saturation for pastel
            float light = 0.7; // Higher lightness for pastel
            return vec3(light + sat * cos(hue * 6.28 + 0.0),
                       light + sat * cos(hue * 6.28 + 2.09),
                       light + sat * cos(hue * 6.28 + 4.18));
        } else if (scheme == 13) { // rainbow3 - dark rainbow
            float hue = mod(t * 360.0, 360.0) / 360.0;
            float sat = 1.0;
            float light = 0.3; // Lower lightness for dark
            return vec3(light + sat * cos(hue * 6.28 + 0.0),
                       light + sat * cos(hue * 6.28 + 2.09),
                       light + sat * cos(hue * 6.28 + 4.18));
        } else if (scheme == 14) { // rainbow4 - vibrant rainbow (higher saturation)
            float hue = mod(t * 360.0, 360.0) / 360.0;
            float sat = 1.2; // Over-saturated for vibrant
            float light = 0.4;
            return vec3(clamp(light + sat * cos(hue * 6.28 + 0.0), 0.0, 1.0),
                       clamp(light + sat * cos(hue * 6.28 + 2.09), 0.0, 1.0),
                       clamp(light + sat * cos(hue * 6.28 + 4.18), 0.0, 1.0));
        } else if (scheme == 15) { // rainbow5 - double rainbow (faster hue rotation)
            float hue = mod(t * 720.0, 360.0) / 360.0; // Double speed
            return vec3(0.5 + 0.5 * cos(hue * 6.28 + 0.0),
                       0.5 + 0.5 * cos(hue * 6.28 + 2.09),
                       0.5 + 0.5 * cos(hue * 6.28 + 4.18));
        } else if (scheme == 16) { // rainbow6 - shifted rainbow (offset hue)
            float hue = mod(t * 360.0 + 60.0, 360.0) / 360.0; // 60 degree offset
            return vec3(0.5 + 0.5 * cos(hue * 6.28 + 0.0),
                       0.5 + 0.5 * cos(hue * 6.28 + 2.09),
                       0.5 + 0.5 * cos(hue * 6.28 + 4.18));
        } else if (scheme == 4) { // monochrome
            return vec3(t, t, t);
        } else if (scheme == 5) { // forest
            return vec3(t * 0.3, t * 0.8, t * 0.4);
        } else if (scheme == 6) { // sunset
            return vec3(t, t * 0.4, t * 0.2);
        } else if (scheme == 7) { // purple
            return vec3(t * 0.6, t * 0.3, t);
        } else if (scheme == 8) { // cyan
            return vec3(0.0, t, t);
        } else if (scheme == 9) { // gold
            return vec3(t, t * 0.8, t * 0.2);
        } else if (scheme == 10) { // ice
            return vec3(t * 0.7, t * 0.9, t);
        } else if (scheme == 11) { // neon
            float pulse = sin(t * 3.14159) * 0.5 + 0.5;
            return vec3(t * 0.2 + pulse * 0.8, t * 0.8 + pulse * 0.2, t);
        } else { // classic (scheme == 0)
            return vec3(t * 0.5, t, t * 1.5);
        }
    }
    
    ${fractalFunction}
    
    void main() {
        vec2 uv = vUv;
        float aspect = uResolution.x / uResolution.y;
        float scale = 4.0 / uZoom;
        vec2 c = vec2(
            (uv.x - 0.5) * scale * aspect * uXScale + uOffset.x,
            (uv.y - 0.5) * scale * uYScale + uOffset.y
        );
        
        int iterations = computeFractal(c);
        
        float t = float(iterations) / uIterations;
        vec3 color = getColorScheme(t, uColorScheme);
        
        if (iterations >= int(uIterations)) {
            color = vec3(0.0);
        }
        
        gl_FragColor = vec4(color, 1.0);
    }
`;
}
