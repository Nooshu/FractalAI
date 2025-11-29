import { generatePaletteTexture } from '../utils.js';

// Buffer cache for reuse
let cachedBuffer = null;
let cachedVertexCount = 0;

// Generate DLA structure using particle simulation
function generateDLA(params) {
  const cluster = [];
  const maxParticles = Math.floor(params.iterations * 8); // Scale with iterations
  const maxRadius = 1.5;
  const stickRadius = 0.03 + params.xScale * 0.02; // 0.03 to 0.05
  const stepSize = 0.015;

  // Start with a seed particle at the center
  cluster.push({ x: 0, y: 0 });

  // Generate particles
  for (let i = 0; i < maxParticles; i++) {
    // Start particle at random position on a circle
    const angle = Math.random() * Math.PI * 2;
    const radius = maxRadius * (0.9 + Math.random() * 0.2);
    let x = Math.cos(angle) * radius;
    let y = Math.sin(angle) * radius;

    // Random walk until it sticks or goes too far
    let stuck = false;
    let steps = 0;
    const maxSteps = 5000;

    while (!stuck && steps < maxSteps) {
      // Random walk
      const dir = Math.random() * Math.PI * 2;
      x += Math.cos(dir) * stepSize;
      y += Math.sin(dir) * stepSize;

      // Check distance from origin (kill if too far)
      const distFromOrigin = Math.sqrt(x * x + y * y);
      if (distFromOrigin > maxRadius * 2.5) {
        break; // Particle escaped
      }

      // Check if particle is close enough to cluster to stick
      for (const clusterPoint of cluster) {
        const dx = x - clusterPoint.x;
        const dy = y - clusterPoint.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < stickRadius) {
          // Particle sticks
          cluster.push({ x, y });
          stuck = true;
          break;
        }
      }

      steps++;
    }
  }

  return cluster;
}

// Convert cluster to line segments
function clusterToVertices(cluster) {
  const vertices = [];
  const colorValues = [];
  const maxRadius = 1.5;

  // Create connections between nearby particles
  for (let i = 0; i < cluster.length; i++) {
    const p1 = cluster[i];
    let nearestDist = Infinity;
    let nearestIdx = -1;
    const connectionRadius = 0.08;

    // Find nearest neighbor within connection radius
    for (let j = 0; j < cluster.length; j++) {
      if (i === j) continue;
      const p2 = cluster[j];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < connectionRadius && dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = j;
      }
    }

    if (nearestIdx !== -1) {
      const p2 = cluster[nearestIdx];
      // Add line segment (two vertices)
      vertices.push(p1.x, p1.y);
      vertices.push(p2.x, p2.y);

      // Color based on distance from center
      const dist1 = Math.sqrt(p1.x * p1.x + p1.y * p1.y);
      const dist2 = Math.sqrt(p2.x * p2.x + p2.y * p2.y);
      const avgDist = (dist1 + dist2) / 2;
      const colorValue = Math.min(avgDist / maxRadius, 1.0);
      colorValues.push(colorValue);
      colorValues.push(colorValue);
    }
  }

  return { vertices, colorValues };
}

export function render(regl, params, canvas) {
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);

  // Generate DLA structure (cache if parameters haven't changed significantly)
  const cluster = generateDLA(params);
  const { vertices, colorValues } = clusterToVertices(cluster);
  const vertexCount = vertices.length / 2;

  // Calculate bounding box for scaling
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const point of cluster) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Scale to fit viewport
  const scale = Math.min(6.0 / width, 6.0 / height);

  // Convert to Float32Array
  const positions = new Float32Array(vertices);
  const colors = new Float32Array(colorValues);

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

  // Create color buffer
  const colorBuffer = regl.buffer(colors);

  // Vertex shader
  const vertexShader = `
    precision mediump float;
    attribute vec2 position;
    attribute float colorValue;
    uniform float uZoom;
    uniform vec2 uOffset;
    uniform float uScale;
    uniform vec2 uCenter;
    uniform vec2 uResolution;
    uniform float uXScale;
    uniform float uYScale;
    uniform sampler2D uPalette;
    varying vec4 vColor;

    void main() {
      float aspect = uResolution.x / uResolution.y;
      float scale = 4.0 / uZoom;
      
      // Transform vertex position
      vec2 pos = position;
      pos -= uCenter;
      pos *= uScale;
      
      // Apply user scale
      pos.x *= uXScale;
      pos.y *= uYScale;
      
      // Convert to UV space (inverse of fragment shader transformation)
      vec2 uv = vec2(
        (pos.x - uOffset.x) / (scale * aspect) + 0.5,
        (pos.y - uOffset.y) / scale + 0.5
      );
      
      // Convert UV to clip space
      gl_Position = vec4(uv * 2.0 - 1.0, 0, 1);
      
      // Look up color from palette
      float t = clamp(colorValue, 0.0, 1.0);
      vColor = texture2D(uPalette, vec2(t, 0.5));
    }
  `;

  // Fragment shader
  const fragmentShader = `
    precision mediump float;
    varying vec4 vColor;
    
    void main() {
      gl_FragColor = vColor;
    }
  `;

  const drawDLA = regl({
    frag: fragmentShader,
    vert: vertexShader,
    attributes: {
      position: {
        buffer: cachedBuffer,
        stride: 8,
      },
      colorValue: {
        buffer: colorBuffer,
        stride: 4,
      },
    },
    uniforms: {
      uZoom: params.zoom,
      uOffset: [params.offset.x, params.offset.y],
      uScale: scale,
      uCenter: [centerX, centerY],
      uXScale: params.xScale,
      uYScale: params.yScale,
      uResolution: [canvas.width, canvas.height],
      uPalette: paletteTexture,
    },
    primitive: 'lines',
    count: vertexCount,
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    },
  });

  return drawDLA;
}

export const is2D = true;

/**
 * Configuration for Diffusion Limited Aggregation fractal
 */
export const config = {
  initialSettings: {
    colorScheme: 'rainbow',
    iterations: 315,
  },
  initialPosition: {
    zoom: 0.197,
    offset: { x: 1.2026, y: 0.9662 },
  },
  interestingPoints: [],
  fallbackPosition: {
    offset: { x: 0, y: 0 },
    zoom: 1,
  },
};
