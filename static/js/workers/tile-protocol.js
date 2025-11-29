/**
 * Tile-based protocol for GPU-ready worker communication
 * Designed to work with both CPU workers and future GPU backends
 */

/**
 * Tile request message
 * @typedef {Object} TileRequest
 * @property {string} type - Always "tile-request"
 * @property {string} tileId - Unique identifier for this tile
 * @property {number} x - Tile X coordinate in pixels
 * @property {number} y - Tile Y coordinate in pixels
 * @property {number} width - Tile width in pixels
 * @property {number} height - Tile height in pixels
 * @property {Object} params - Fractal parameters (zoom, offset, iterations, etc.)
 * @property {string} fractalType - Type of fractal to compute
 * @property {number} colorScheme - Color scheme index
 */

/**
 * Tile response message
 * @typedef {Object} TileResponse
 * @property {string} type - Always "tile-response"
 * @property {string} tileId - Unique identifier matching the request
 * @property {Float32Array} data - Scalar field data (width * height values, normalized 0-1)
 * @property {Object} metadata - Additional metadata (computation time, etc.)
 */

/**
 * Cancel request message
 * @typedef {Object} CancelRequest
 * @property {string} type - Always "cancel"
 * @property {string[]} tileIds - Array of tile IDs to cancel
 */

/**
 * Create a tile request message
 * @param {string} tileId - Unique tile identifier
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @param {number} width - Tile width
 * @param {number} height - Tile height
 * @param {Object} params - Fractal parameters
 * @param {string} fractalType - Fractal type
 * @returns {TileRequest}
 */
export function createTileRequest(tileId, x, y, width, height, params, fractalType) {
  return {
    type: 'tile-request',
    tileId,
    x,
    y,
    width,
    height,
    params: {
      zoom: params.zoom,
      offset: { x: params.offset.x, y: params.offset.y },
      iterations: params.iterations,
      juliaC:
        params.juliaC !== undefined && params.juliaC !== null
          ? { x: params.juliaC.x, y: params.juliaC.y }
          : params.juliaC === null
            ? null
            : undefined,
      xScale: params.xScale,
      yScale: params.yScale,
      colorScheme: params.colorScheme,
    },
    fractalType,
  };
}

/**
 * Create a cancel request message
 * @param {string[]} tileIds - Array of tile IDs to cancel
 * @returns {CancelRequest}
 */
export function createCancelRequest(tileIds) {
  return {
    type: 'cancel',
    tileIds,
  };
}

/**
 * Check if a message is a tile request
 * @param {*} message - Message to check
 * @returns {boolean}
 */
export function isTileRequest(message) {
  return !!(message && message.type === 'tile-request');
}

/**
 * Check if a message is a tile response
 * @param {*} message - Message to check
 * @returns {boolean}
 */
export function isTileResponse(message) {
  return !!(message && message.type === 'tile-response');
}

/**
 * Check if a message is a cancel request
 * @param {*} message - Message to check
 * @returns {boolean}
 */
export function isCancelRequest(message) {
  return !!(message && message.type === 'cancel');
}
