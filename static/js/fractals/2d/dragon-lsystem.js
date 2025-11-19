import { getColorSchemeIndex } from '../utils.js';

// Buffer cache for reuse
let cachedBuffer = null;
let cachedVertexCount = 0;

/**
 * L-System Dragon Curve Generator
 * Uses L-system rules to generate dragon curves
 * Axiom: FX
 * Rules:
 *   X → X+YF+
 *   Y → -FX-Y
 * @param {number} iterations - The number of fractal iterations (0-12 recommended)
 * @param {number} angle - Turn angle in degrees (default 90)
 * @param {number} stepLength - Length of each segment
 * @returns {Float32Array} - Flat array of vertex coordinates [x, y, x, y, ...]
 */
function generateDragonLSystem(iterations, angle = 90) {
  const angleRad = (angle * Math.PI) / 180;
  
  // L-system rules
  // Axiom: FX
  // X → X+YF+
  // Y → -FX-Y
  let lsystemString = 'FX';
  
  // Iteratively apply the rules
  for (let i = 0; i < iterations; i++) {
    let newString = '';
    for (let j = 0; j < lsystemString.length; j++) {
      const char = lsystemString[j];
      switch (char) {
        case 'X':
          newString += 'X+YF+';
          break;
        case 'Y':
          newString += '-FX-Y';
          break;
        default:
          newString += char;
          break;
      }
    }
    lsystemString = newString;
  }
  
  // Now interpret the L-system string to generate vertices
  const vertices = [];
  let x = 0;
  let y = 0;
  let currentAngle = 0; // Start facing right
  
  // Use a fixed step length - we'll scale the entire curve to fit later
  const stepLength = 1.0;
  
  vertices.push(x, y);
  
  // Process each character in the L-system string
  for (let i = 0; i < lsystemString.length; i++) {
    const char = lsystemString[i];
    
    switch (char) {
      case 'F':
        // Move forward
        x += Math.cos(currentAngle) * stepLength;
        y += Math.sin(currentAngle) * stepLength;
        vertices.push(x, y);
        break;
      case '+':
        // Turn right (clockwise)
        currentAngle += angleRad;
        break;
      case '-':
        // Turn left (counter-clockwise)
        currentAngle -= angleRad;
        break;
      case 'X':
      case 'Y':
        // These are placeholders in the L-system, no action needed
        break;
    }
  }
  
  // Calculate bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < vertices.length; i += 2) {
    minX = Math.min(minX, vertices[i]);
    maxX = Math.max(maxX, vertices[i]);
    minY = Math.min(minY, vertices[i + 1]);
    maxY = Math.max(maxY, vertices[i + 1]);
  }
  
  // Calculate center and size
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;
  const maxSize = Math.max(width, height);
  
  // Scale to fit in a larger range and center at origin
  // Use a much larger scale factor to make it clearly visible
  const scale = maxSize > 0 ? 8.0 / maxSize : 1.0;
  const scaledVertices = new Float32Array(vertices.length);
  for (let i = 0; i < vertices.length; i += 2) {
    scaledVertices[i] = (vertices[i] - centerX) * scale;
    scaledVertices[i + 1] = (vertices[i + 1] - centerY) * scale;
  }
  
  return scaledVertices;
}

export function render(regl, params, canvas) {
  // Generate vertices based on iteration count (clamp to reasonable range)
  const iterations = Math.max(0, Math.min(10, Math.floor(params.iterations / 20)));
  // Use xScale to control turn angle (45-135 degrees)
  const angle = 45 + params.xScale * 90;
  
  const positions = generateDragonLSystem(iterations, angle);
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
      // For line-based fractals, maintain aspect ratio correctly
      vec2 fractalCoord = position;
      vec2 relative = fractalCoord - uOffset;
      
      // Scale uniformly (same factor for x and y) to preserve shape
      vec2 scaled = vec2(
        relative.x / (scale * uXScale),
        relative.y / (scale * uYScale)
      );
      
      // Apply aspect ratio correction to maintain shape across different window sizes
      // Divide x by aspect to compensate for wider screens, preserving the curve's proportions
      scaled.x /= aspect;
      
      // Convert to clip space (-1 to 1) by multiplying by 2.0
      gl_Position = vec4(scaled * 2.0, 0.0, 1.0);
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
      float t = fract(length(vPosition) * 2.0);
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

    primitive: 'line strip',
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

