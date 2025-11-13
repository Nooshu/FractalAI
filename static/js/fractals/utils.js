import * as THREE from 'three';

// Color schemes
export function getColor(iterations, maxIterations, scheme) {
  if (iterations >= maxIterations) return new THREE.Color(0, 0, 0);

  const t = iterations / maxIterations;

  switch (scheme) {
    case 'fire':
      return new THREE.Color(t, t * 0.5, 0);
    case 'ocean':
      return new THREE.Color(0, t * 0.5, t);
    case 'rainbow': {
      const hue = (t * 360) % 360;
      return new THREE.Color().setHSL(hue / 360, 1, 0.5);
    }
    case 'monochrome':
      return new THREE.Color(t, t, t);
    default: // classic
      return new THREE.Color(t * 0.5, t, t * 1.5);
  }
}

export function getColorSchemeIndex(scheme) {
  const schemes = ['classic', 'fire', 'ocean', 'rainbow', 'monochrome'];
  return schemes.indexOf(scheme);
}

// Vertex shader for 2D fractals
export const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// Base fragment shader template for 2D fractals
export function createFragmentShader(fractalFunction) {
  return `
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
        } else if (scheme == 4) { // monochrome
            return vec3(t, t, t);
        } else { // classic
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
