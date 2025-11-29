import { describe, it, expect } from 'vitest';
import {
  createTileRequest,
  createCancelRequest,
  isTileRequest,
  isTileResponse,
  isCancelRequest,
} from '../../static/js/workers/tile-protocol.js';

describe('tile-protocol', () => {
  describe('createTileRequest', () => {
    it('should create a valid tile request', () => {
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        juliaC: { x: 0.3, y: 0.5 },
        xScale: 1.0,
        yScale: 1.0,
        colorScheme: 1,
      };

      const request = createTileRequest('tile-1', 0, 0, 256, 256, params, 'mandelbrot');

      expect(request).toEqual({
        type: 'tile-request',
        tileId: 'tile-1',
        x: 0,
        y: 0,
        width: 256,
        height: 256,
        params: {
          zoom: 1.0,
          offset: { x: 0, y: 0 },
          iterations: 100,
          juliaC: { x: 0.3, y: 0.5 },
          xScale: 1.0,
          yScale: 1.0,
          colorScheme: 1,
        },
        fractalType: 'mandelbrot',
      });
    });

    it('should handle null juliaC', () => {
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        juliaC: null,
        xScale: 1.0,
        yScale: 1.0,
        colorScheme: 1,
      };

      const request = createTileRequest('tile-2', 10, 20, 128, 128, params, 'julia');

      expect(request.params.juliaC).toBeNull();
    });

    it('should handle missing juliaC', () => {
      const params = {
        zoom: 1.0,
        offset: { x: 0, y: 0 },
        iterations: 100,
        xScale: 1.0,
        yScale: 1.0,
        colorScheme: 1,
      };

      const request = createTileRequest('tile-3', 0, 0, 256, 256, params, 'mandelbrot');

      expect(request.params.juliaC).toBeUndefined();
    });
  });

  describe('createCancelRequest', () => {
    it('should create a cancel request with tile IDs', () => {
      const request = createCancelRequest(['tile-1', 'tile-2', 'tile-3']);

      expect(request).toEqual({
        type: 'cancel',
        tileIds: ['tile-1', 'tile-2', 'tile-3'],
      });
    });

    it('should handle empty array', () => {
      const request = createCancelRequest([]);

      expect(request).toEqual({
        type: 'cancel',
        tileIds: [],
      });
    });
  });

  describe('isTileRequest', () => {
    it('should return true for valid tile request', () => {
      const request = {
        type: 'tile-request',
        tileId: 'tile-1',
        x: 0,
        y: 0,
        width: 256,
        height: 256,
      };

      expect(isTileRequest(request)).toBe(true);
    });

    it('should return false for invalid request', () => {
      expect(isTileRequest({ type: 'tile-response' })).toBe(false);
      expect(isTileRequest({ type: 'cancel' })).toBe(false);
      expect(isTileRequest(null)).toBe(false);
      expect(isTileRequest(undefined)).toBe(false);
      expect(isTileRequest({})).toBe(false);
    });
  });

  describe('isTileResponse', () => {
    it('should return true for valid tile response', () => {
      const response = {
        type: 'tile-response',
        tileId: 'tile-1',
        data: new Float32Array(10),
        metadata: {},
      };

      expect(isTileResponse(response)).toBe(true);
    });

    it('should return false for invalid response', () => {
      expect(isTileResponse({ type: 'tile-request' })).toBe(false);
      expect(isTileResponse({ type: 'cancel' })).toBe(false);
      expect(isTileResponse(null)).toBe(false);
      expect(isTileResponse(undefined)).toBe(false);
      expect(isTileResponse({})).toBe(false);
    });
  });

  describe('isCancelRequest', () => {
    it('should return true for valid cancel request', () => {
      const request = {
        type: 'cancel',
        tileIds: ['tile-1'],
      };

      expect(isCancelRequest(request)).toBe(true);
    });

    it('should return false for invalid request', () => {
      expect(isCancelRequest({ type: 'tile-request' })).toBe(false);
      expect(isCancelRequest({ type: 'tile-response' })).toBe(false);
      expect(isCancelRequest(null)).toBe(false);
      expect(isCancelRequest(undefined)).toBe(false);
      expect(isCancelRequest({})).toBe(false);
    });
  });
});

