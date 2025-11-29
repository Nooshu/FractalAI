/**
 * Tile-based renderer using worker pool
 * Can be used alongside GPU rendering for progressive enhancement
 */

import { WorkerPool } from '../workers/pool.js';
import { computeColorForScheme } from '../fractals/utils.js';

/**
 * Tile-based renderer
 */
export class TileRenderer {
  /**
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.workerPool = options.workerPool || new WorkerPool();
    this.tileSize = options.tileSize || 256; // Default tile size
    this.activeTiles = new Map(); // tileId -> { promise, cancelled }
    this.onTileComplete = options.onTileComplete || null; // Callback for tile completion
  }

  /**
   * Render a fractal using tile-based worker computation
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} params - Fractal parameters
   * @param {string} fractalType - Fractal type
   * @returns {Promise<void>} Promise that resolves when rendering is complete
   */
  async render(canvas, params, fractalType) {
    // Cancel any existing tiles
    this.cancelAllTiles();

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const tileSize = this.tileSize;

    // Calculate tile grid
    const tilesX = Math.ceil(canvasWidth / tileSize);
    const tilesY = Math.ceil(canvasHeight / tileSize);

    // Create ImageData for the canvas
    const imageData = new ImageData(canvasWidth, canvasHeight);
    const data = imageData.data;

    // Submit all tile requests
    const tilePromises = [];
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const x = tx * tileSize;
        const y = ty * tileSize;
        const width = Math.min(tileSize, canvasWidth - x);
        const height = Math.min(tileSize, canvasHeight - y);
        const tileId = `tile-${tx}-${ty}`;

        const promise = this.workerPool.computeTile(tileId, x, y, width, height, params, fractalType)
          .then((response) => {
            if (!this.activeTiles.has(tileId) || this.activeTiles.get(tileId).cancelled) {
              return; // Tile was cancelled
            }

            // Convert scalar field to RGBA pixels
            this.renderTileToImageData(data, canvasWidth, canvasHeight, x, y, width, height, response.data, params.colorScheme);

            // Call completion callback if provided
            if (this.onTileComplete) {
              this.onTileComplete(tileId, x, y, width, height, imageData);
            }

            this.activeTiles.delete(tileId);
          })
          .catch((error) => {
            if (error.message !== 'Tile computation cancelled') {
              console.error(`Tile ${tileId} computation error:`, error);
            }
            this.activeTiles.delete(tileId);
          });

        this.activeTiles.set(tileId, { promise, cancelled: false });
        tilePromises.push(promise);
      }
    }

    // Wait for all tiles to complete
    await Promise.all(tilePromises);

    // Draw to canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
    }

    return imageData;
  }

  /**
   * Render a tile's scalar field data to ImageData
   * @param {Uint8ClampedArray} imageData - ImageData data array
   * @param {number} canvasWidth - Canvas width
   * @param {number} canvasHeight - Canvas height
   * @param {number} tileX - Tile X position
   * @param {number} tileY - Tile Y position
   * @param {number} tileWidth - Tile width
   * @param {number} tileHeight - Tile height
   * @param {Float32Array} scalarField - Scalar field data (normalized 0-1)
   * @param {number} colorScheme - Color scheme index
   */
  renderTileToImageData(imageData, canvasWidth, canvasHeight, tileX, tileY, tileWidth, tileHeight, scalarField, colorScheme) {
    const colorOut = new Float32Array(3);

    for (let py = 0; py < tileHeight; py++) {
      for (let px = 0; px < tileWidth; px++) {
        const scalarValue = scalarField[py * tileWidth + px];
        const normalizedValue = Math.max(0, Math.min(1, scalarValue));

        // Compute color
        computeColorForScheme(normalizedValue, colorScheme, colorOut);

        // Convert to 0-255 range
        const r = Math.floor(colorOut[0] * 255);
        const g = Math.floor(colorOut[1] * 255);
        const b = Math.floor(colorOut[2] * 255);

        // Points in the set (value >= 1) are black
        const isInSet = normalizedValue >= 1.0 ? 1 : 0;
        const finalR = isInSet ? 0 : r;
        const finalG = isInSet ? 0 : g;
        const finalB = isInSet ? 0 : b;

        // Calculate pixel index in canvas
        const canvasX = tileX + px;
        const canvasY = tileY + py;
        const pixelIndex = (canvasY * canvasWidth + canvasX) * 4;

        // Set RGBA values
        imageData[pixelIndex] = finalR;
        imageData[pixelIndex + 1] = finalG;
        imageData[pixelIndex + 2] = finalB;
        imageData[pixelIndex + 3] = 255; // Alpha
      }
    }
  }

  /**
   * Cancel all pending tiles
   */
  cancelAllTiles() {
    const tileIds = Array.from(this.activeTiles.keys());
    for (const tileId of tileIds) {
      const tile = this.activeTiles.get(tileId);
      if (tile) {
        tile.cancelled = true;
      }
    }
    this.workerPool.cancelTiles(tileIds);
    this.activeTiles.clear();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.cancelAllTiles();
    // Note: We don't shutdown the worker pool here as it may be shared
  }
}

