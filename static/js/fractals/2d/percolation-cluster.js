import { generatePaletteTexture } from '../utils.js';

// Buffer cache for reuse
let cachedBuffer = null;
let cachedVertexCount = 0;

// Union-Find data structure for cluster identification
class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.size = Array(size).fill(1);
  }
  
  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // Path compression
    }
    return this.parent[x];
  }
  
  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX === rootY) return;
    
    // Union by size
    if (this.size[rootX] < this.size[rootY]) {
      this.parent[rootX] = rootY;
      this.size[rootY] += this.size[rootX];
    } else {
      this.parent[rootY] = rootX;
      this.size[rootX] += this.size[rootY];
    }
  }
  
  getSize(x) {
    return this.size[this.find(x)];
  }
}

// Generate percolation cluster
function generatePercolationCluster(params) {
  const gridSize = Math.floor(50 + params.iterations * 2); // Scale with iterations
  const probability = 0.3 + params.xScale * 0.4; // 0.3 to 0.7 (percolation threshold)
  const grid = [];
  
  // Initialize grid with random filled cells
  for (let y = 0; y < gridSize; y++) {
    grid[y] = [];
    for (let x = 0; x < gridSize; x++) {
      grid[y][x] = Math.random() < probability ? 1 : 0;
    }
  }
  
  // Use Union-Find to identify clusters
  const uf = new UnionFind(gridSize * gridSize);
  const cellSize = 2.0 / gridSize;
  
  // Connect adjacent filled cells
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x] === 0) continue;
      
      const idx = y * gridSize + x;
      
      // Check right neighbor
      if (x < gridSize - 1 && grid[y][x + 1] === 1) {
        uf.union(idx, y * gridSize + (x + 1));
      }
      
      // Check bottom neighbor
      if (y < gridSize - 1 && grid[y + 1][x] === 1) {
        uf.union(idx, (y + 1) * gridSize + x);
      }
    }
  }
  
  // Find the largest cluster
  let largestClusterSize = 0;
  const clusterSizes = new Map();
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x] === 0) continue;
      const idx = y * gridSize + x;
      const root = uf.find(idx);
      const size = uf.getSize(root);
      
      if (!clusterSizes.has(root)) {
        clusterSizes.set(root, size);
      }
      
      if (size > largestClusterSize) {
        largestClusterSize = size;
      }
    }
  }
  
  // Generate vertices for filled cells, colored by cluster
  const vertices = [];
  const colorValues = [];
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x] === 0) continue;
      
      const idx = y * gridSize + x;
      const root = uf.find(idx);
      const clusterSize = uf.getSize(root);
      
      // Convert grid coordinates to world coordinates
      const worldX = (x / gridSize) * 2.0 - 1.0;
      const worldY = (y / gridSize) * 2.0 - 1.0;
      
      // Create a small square for each filled cell
      const halfSize = cellSize * 0.4;
      
      // Top-left
      vertices.push(worldX - halfSize, worldY + halfSize);
      vertices.push(worldX + halfSize, worldY + halfSize);
      vertices.push(worldX - halfSize, worldY - halfSize);
      
      vertices.push(worldX + halfSize, worldY + halfSize);
      vertices.push(worldX + halfSize, worldY - halfSize);
      vertices.push(worldX - halfSize, worldY - halfSize);
      
      // Color based on cluster size (normalized)
      const colorValue = Math.min(clusterSize / largestClusterSize, 1.0);
      for (let i = 0; i < 6; i++) {
        colorValues.push(colorValue);
      }
    }
  }
  
  return { vertices, colorValues };
}

export function render(regl, params, canvas) {
  const paletteTexture = generatePaletteTexture(regl, params.colorScheme);
  
  // Generate percolation cluster
  const { vertices, colorValues } = generatePercolationCluster(params);
  const vertexCount = vertices.length / 2;
  
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
    uniform vec2 uResolution;
    uniform float uXScale;
    uniform float uYScale;
    uniform sampler2D uPalette;
    varying vec4 vColor;

    void main() {
      float aspect = uResolution.x / uResolution.y;
      
      // Transform vertex position
      vec2 pos = position;
      
      // Apply user scale
      pos.x *= uXScale;
      pos.y *= uYScale;
      
      // Apply zoom and offset (inverted offset to match standard fractal panning behavior)
      pos = pos * uZoom - uOffset;
      
      // Apply aspect ratio correction
      pos.x /= aspect;
      
      // Convert to clip space
      gl_Position = vec4(pos, 0, 1);
      
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
  
  const drawPercolationCluster = regl({
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
      uXScale: params.xScale,
      uYScale: params.yScale,
      uResolution: [canvas.width, canvas.height],
      uPalette: paletteTexture,
    },
    primitive: 'triangles',
    count: vertexCount,
    viewport: {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    },
  });
  
  return drawPercolationCluster;
}

export const is2D = true;

