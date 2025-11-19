import { getColorSchemeIndex } from '../utils.js';

// Buffer cache for reuse
let cachedBuffer = null;
let cachedVertexCount = 0;

/**
 * L-System Plant Fractal Generator
 * Uses an L-system to generate plant-like structures
 * @param {number} iterations - The number of fractal iterations (0-6 recommended)
 * @param {number} angle - Branch angle in degrees (default 25)
 * @param {number} lengthRatio - Length reduction ratio per iteration (default 0.7)
 * @returns {Float32Array} - Flat array of vertex coordinates [x, y, x, y, ...]
 */
function generatePlant(iterations, angle = 25, lengthRatio = 0.7) {
  const angleRad = (angle * Math.PI) / 180;
  
  // Collect all vertices
  const vertexList = [];
  
  // Recursive function to generate branches
  function generateBranch(x, y, angle, length, depth) {
    if (depth <= 0 || length < 0.01) return;
    
    // Calculate end point of current branch
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    
    // Add vertices for this branch
    vertexList.push(x, y, endX, endY);
    
    // Create branches
    const newLength = length * lengthRatio;
    
    // Main branch continues
    generateBranch(endX, endY, angle, newLength, depth - 1);
    
    // Left branch
    generateBranch(endX, endY, angle - angleRad, newLength, depth - 1);
    
    // Right branch
    generateBranch(endX, endY, angle + angleRad, newLength, depth - 1);
  }
  
  // Generate the plant starting from the base
  const initialLength = 0.8;
  const initialAngle = Math.PI / 2; // Pointing up
  generateBranch(0, -0.8, initialAngle, initialLength, iterations);
  
  // Convert to Float32Array
  return new Float32Array(vertexList);
}

export function render(regl, params, canvas) {
  // Generate vertices based on iteration count (clamp to reasonable range)
  const iterations = Math.max(0, Math.min(6, Math.floor(params.iterations / 25)));
  // Use xScale to control branch angle (0-45 degrees)
  const angle = params.xScale * 45;
  // Use yScale to control length ratio (0.5-0.9)
  const lengthRatio = 0.5 + params.yScale * 0.4;
  
  const positions = generatePlant(iterations, angle, lengthRatio);
  const vertexCount = positions.length / 2;

  // Reuse buffer if possible, otherwise create new one
  if (!cachedBuffer || cachedVertexCount !== vertexCount) {
    if (cachedBuffer) {
      cachedBuffer.destroy();
    }
    cachedBuffer = regl.buffer(positions);
    cachedVertexCount = vertexCount;
  } else {
    // Buffer exists with same size, just update the data
    cachedBuffer.subdata(positions);
  }

  // Shaders
  const vertexShader = `
    precision mediump float;
    attribute vec2 position;
    uniform float uZoom;
    uniform vec2 uOffset;
    uniform vec2 uResolution;
    uniform float uXScale;
    uniform float uYScale;
    varying vec2 vPosition;

    void main() {
      float aspect = uResolution.x / uResolution.y;
      float scale = 4.0 / uZoom;
      
      // Transform vertex position to match the standard fractal coordinate system
      vec2 fractalCoord = position;
      vec2 relative = fractalCoord - uOffset;
      
      // Convert to UV space (inverse of fragment shader transformation)
      vec2 uv = vec2(
        relative.x / (scale * aspect * uXScale) + 0.5,
        relative.y / (scale * uYScale) + 0.5
      );
      
      // Convert UV (0-1) to clip space (-1 to 1)
      vec2 clipSpace = (uv - 0.5) * 2.0;
      
      // The fragment shader's aspect is already in the x coordinate,
      // so we need to divide by aspect to get proper clip space
      clipSpace.x /= aspect;
      
      gl_Position = vec4(clipSpace, 0.0, 1.0);
      vPosition = position;
    }
  `;

  const fragmentShader = `
    precision mediump float;
    uniform int uColorScheme;
    varying vec2 vPosition;

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
        } else if (scheme == 12) { // rainbow2 - pastel
            float hue = mod(t * 360.0, 360.0) / 360.0;
            float sat = 0.6;
            float light = 0.7;
            return vec3(light + sat * cos(hue * 6.28 + 0.0),
                       light + sat * cos(hue * 6.28 + 2.09),
                       light + sat * cos(hue * 6.28 + 4.18));
        } else if (scheme == 13) { // rainbow3 - dark
            float hue = mod(t * 360.0, 360.0) / 360.0;
            float sat = 1.0;
            float light = 0.3;
            return vec3(light + sat * cos(hue * 6.28 + 0.0),
                       light + sat * cos(hue * 6.28 + 2.09),
                       light + sat * cos(hue * 6.28 + 4.18));
        } else if (scheme == 14) { // rainbow4 - vibrant
            float hue = mod(t * 360.0, 360.0) / 360.0;
            float sat = 1.2;
            float light = 0.4;
            return vec3(clamp(light + sat * cos(hue * 6.28 + 0.0), 0.0, 1.0),
                       clamp(light + sat * cos(hue * 6.28 + 2.09), 0.0, 1.0),
                       clamp(light + sat * cos(hue * 6.28 + 4.18), 0.0, 1.0));
        } else if (scheme == 15) { // rainbow5 - double
            float hue = mod(t * 720.0, 360.0) / 360.0;
            return vec3(0.5 + 0.5 * cos(hue * 6.28 + 0.0),
                       0.5 + 0.5 * cos(hue * 6.28 + 2.09),
                       0.5 + 0.5 * cos(hue * 6.28 + 4.18));
        } else if (scheme == 16) { // rainbow6 - shifted
            float hue = mod(t * 360.0 + 60.0, 360.0) / 360.0;
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
        } else if (scheme == 17) { // cosmic
            float darkBase = 0.05;
            float brightPeak = 1.0;
            
            float phase1 = min(t * 2.0, 1.0);
            float phase2 = max(0.0, (t - 0.5) * 2.0);
            
            float r = darkBase + (brightPeak - darkBase) * (phase1 * 0.4 + phase2 * 0.6);
            float g = darkBase + (brightPeak - darkBase) * (phase1 * 0.2 + phase2 * 0.8);
            float b = darkBase + (brightPeak - darkBase) * (phase1 * 0.6 + phase2 * 1.0);
            
            float sparkle = sin(t * 3.14159 * 8.0) * 0.1 + 0.9;
            
            return vec3(min(1.0, r * sparkle), min(1.0, g * sparkle), min(1.0, b * sparkle));
        } else if (scheme == 18) { // aurora
            float phase = t * 2.0;
            if (phase < 1.0) {
                float p = phase;
                return vec3(0.1 + p * 0.2, 0.3 + p * 0.5, 0.2 + p * 0.6);
            } else {
                float p = phase - 1.0;
                return vec3(0.3 + p * 0.5, 0.8 - p * 0.3, 0.8 + p * 0.2);
            }
        } else if (scheme == 19) { // coral
            float phase1 = min(t * 3.0, 1.0);
            float phase2 = max(0.0, min((t - 0.33) * 3.0, 1.0));
            float phase3 = max(0.0, (t - 0.66) * 3.0);
            return vec3(phase1 * 0.1 + phase2 * 0.3 + phase3 * 1.0,
                       phase1 * 0.4 + phase2 * 0.8 + phase3 * 0.6,
                       phase1 * 0.8 + phase2 * 0.7 + phase3 * 0.5);
        } else if (scheme == 20) { // autumn
            float phase1 = min(t * 2.0, 1.0);
            float phase2 = max(0.0, (t - 0.5) * 2.0);
            return vec3(0.3 + phase1 * 0.5 + phase2 * 0.2,
                       0.1 + phase1 * 0.3 + phase2 * 0.6,
                       0.0 + phase1 * 0.1 + phase2 * 0.1);
        } else if (scheme == 21) { // midnight
            float phase1 = min(t * 2.0, 1.0);
            float phase2 = max(0.0, (t - 0.5) * 2.0);
            return vec3(0.05 + phase1 * 0.3 + phase2 * 0.65,
                       0.05 + phase1 * 0.2 + phase2 * 0.3,
                       0.2 + phase1 * 0.5 + phase2 * 0.3);
        } else if (scheme == 22) { // emerald
            float phase1 = min(t * 2.0, 1.0);
            float phase2 = max(0.0, (t - 0.5) * 2.0);
            return vec3(0.0 + phase1 * 0.1 + phase2 * 0.8,
                       0.2 + phase1 * 0.7 + phase2 * 0.6,
                       0.1 + phase1 * 0.4 + phase2 * 0.1);
        } else if (scheme == 23) { // rosegold
            float phase1 = min(t * 2.0, 1.0);
            float phase2 = max(0.0, (t - 0.5) * 2.0);
            return vec3(0.3 + phase1 * 0.5 + phase2 * 0.2,
                       0.2 + phase1 * 0.3 + phase2 * 0.5,
                       0.2 + phase1 * 0.2 + phase2 * 0.1);
        } else if (scheme == 24) { // electric
            float hue = mod(t * 360.0 + 180.0, 360.0) / 360.0;
            float sat = 1.0;
            float light = 0.5;
            return vec3(clamp(light + sat * cos(hue * 6.28 + 0.0) * 1.2, 0.0, 1.0),
                       clamp(light + sat * cos(hue * 6.28 + 2.09) * 1.2, 0.0, 1.0),
                       clamp(light + sat * cos(hue * 6.28 + 4.18) * 1.2, 0.0, 1.0));
        } else if (scheme == 25) { // vintage
            float hue = mod(t * 360.0 + 30.0, 360.0) / 360.0;
            float sat = 0.4;
            float light = 0.7;
            return vec3(light + sat * cos(hue * 6.28 + 0.0) * 0.5,
                       light + sat * cos(hue * 6.28 + 2.09) * 0.5,
                       light + sat * cos(hue * 6.28 + 4.18) * 0.5);
        } else if (scheme == 26) { // tropical
            float phase = t * 3.0;
            if (phase < 1.0) {
                float p = phase;
                return vec3(0.0 + p * 1.0, 1.0 - p * 0.3, 1.0 - p * 0.5);
            } else if (phase < 2.0) {
                float p = phase - 1.0;
                return vec3(1.0, 0.7 + p * 0.3, 0.5 - p * 0.5);
            } else {
                float p = phase - 2.0;
                return vec3(1.0 - p * 1.0, 1.0, 0.0 + p * 1.0);
            }
        } else if (scheme == 27) { // galaxy
            float darkBase = 0.02;
            float phase1 = min(t * 2.5, 1.0);
            float phase2 = max(0.0, (t - 0.4) * 1.67);
            float r = darkBase + phase1 * 0.4 + phase2 * 0.6;
            float g = darkBase + phase1 * 0.2 + phase2 * 0.8;
            float b = darkBase + phase1 * 0.6 + phase2 * 1.0;
            float sparkle = sin(t * 3.14159 * 12.0) * 0.15 + 0.85;
            return vec3(min(1.0, r * sparkle), min(1.0, g * sparkle), min(1.0, b * sparkle));
        } else { // classic (scheme == 0)
            return vec3(t * 0.5, t, min(t * 1.5, 1.0));
        }
    }

    void main() {
      // Use position to create variation in color
      float t = length(vPosition) * 0.5 + 0.5;
      vec3 color = getColorScheme(t, uColorScheme);
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // Get color based on color scheme
  const colorSchemeIndex = getColorSchemeIndex(params.colorScheme);

  // Create the draw command
  const drawFractal = regl({
    vert: vertexShader,
    frag: fragmentShader,

    attributes: {
      position: cachedBuffer,
    },

    uniforms: {
      uZoom: params.zoom,
      uOffset: [params.offset.x, params.offset.y],
      uResolution: [canvas.width, canvas.height],
      uXScale: params.xScale,
      uYScale: params.yScale,
      uColorScheme: colorSchemeIndex,
    },

    primitive: 'lines',
    count: vertexCount,

    lineWidth: 1, // WebGL only supports 1 on most systems

    depth: {
      enable: false,
    },

    blend: {
      enable: false,
    },

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

