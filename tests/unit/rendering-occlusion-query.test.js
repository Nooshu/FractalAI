import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  OcclusionQueryManager,
  createOcclusionQueryManager,
} from '../../static/js/rendering/occlusion-query.js';

describe('rendering/occlusion-query', () => {
  let mockGl;
  let manager;

  beforeEach(() => {
    // Mock WebGL2RenderingContext class
    global.WebGL2RenderingContext = class WebGL2RenderingContext {};
    
    mockGl = {
      createQuery: vi.fn(() => ({})),
      deleteQuery: vi.fn(),
      beginQuery: vi.fn(),
      endQuery: vi.fn(),
      getQueryParameter: vi.fn(() => false),
      ANY_SAMPLES_PASSED: 0x8C2F,
      QUERY_RESULT_AVAILABLE: 0x8867,
      QUERY_RESULT: 0x8866,
    };

    // Make mockGl an instance of WebGL2RenderingContext
    Object.setPrototypeOf(mockGl, WebGL2RenderingContext.prototype);
    manager = new OcclusionQueryManager(mockGl);
  });

  describe('OcclusionQueryManager', () => {
    it('should initialize with WebGL2 context', () => {
      expect(manager.gl).toBe(mockGl);
      expect(manager.isSupported).toBe(true);
    });

    it('should check if occlusion queries are supported', () => {
      expect(manager.isOcclusionQuerySupported()).toBe(true);
    });

    it('should begin a query for a tile', () => {
      const result = manager.beginQuery('tile-1');
      expect(result).toBe(true);
      expect(mockGl.createQuery).toHaveBeenCalled();
      expect(mockGl.beginQuery).toHaveBeenCalled();
    });

    it('should return false when not supported', () => {
      manager.isSupported = false;
      const result = manager.beginQuery('tile-1');
      expect(result).toBe(false);
    });

    it('should end a query for a tile', () => {
      manager.beginQuery('tile-1');
      manager.endQuery('tile-1');
      expect(mockGl.endQuery).toHaveBeenCalled();
    });

    it('should check query result', () => {
      manager.beginQuery('tile-1');
      manager.endQuery('tile-1');
      mockGl.getQueryParameter = vi.fn((query, param) => {
        if (param === manager.gl.QUERY_RESULT_AVAILABLE) return true;
        if (param === manager.gl.QUERY_RESULT) return 100; // Visible
        return false;
      });

      const result = manager.checkQueryResult('tile-1');
      expect(result).toBe(true);
      expect(manager.isTileVisible('tile-1')).toBe(true);
    });

    it('should return null when result not available', () => {
      manager.beginQuery('tile-1');
      manager.endQuery('tile-1');
      mockGl.getQueryParameter = vi.fn(() => false);

      const result = manager.checkQueryResult('tile-1');
      expect(result).toBeNull();
    });

    it('should mark tile as invisible when result is 0', () => {
      manager.beginQuery('tile-1');
      manager.endQuery('tile-1');
      mockGl.getQueryParameter = vi.fn((query, param) => {
        if (param === manager.gl.QUERY_RESULT_AVAILABLE) return true;
        if (param === manager.gl.QUERY_RESULT) return 0; // Not visible
        return false;
      });

      const result = manager.checkQueryResult('tile-1');
      expect(result).toBe(false);
      expect(manager.isTileVisible('tile-1')).toBe(false);
    });

    it('should check if tile is visible', () => {
      manager.visibleTiles.add('tile-1');
      expect(manager.isTileVisible('tile-1')).toBe(true);
      expect(manager.isTileVisible('tile-2')).toBe(false);
    });

    it('should process all pending queries', () => {
      manager.beginQuery('tile-1');
      manager.endQuery('tile-1');
      manager.beginQuery('tile-2');
      manager.endQuery('tile-2');

      mockGl.getQueryParameter = vi.fn((query, param) => {
        if (param === manager.gl.QUERY_RESULT_AVAILABLE) return true;
        if (param === manager.gl.QUERY_RESULT) return 50;
        return false;
      });

      const results = manager.processPendingQueries();
      expect(results.size).toBeGreaterThan(0);
    });

    it('should clear all queries', () => {
      manager.beginQuery('tile-1');
      manager.endQuery('tile-1');
      manager.visibleTiles.add('tile-1');

      manager.clear();

      expect(manager.queries.size).toBe(0);
      expect(manager.pendingQueries.size).toBe(0);
      expect(manager.visibleTiles.size).toBe(0);
    });

    it('should destroy resources', () => {
      manager.beginQuery('tile-1');
      manager.destroy();
      expect(manager.queries.size).toBe(0);
    });
  });

  describe('createOcclusionQueryManager', () => {
    it('should create manager for WebGL2 context', () => {
      const instance = createOcclusionQueryManager(mockGl);
      expect(instance).toBeInstanceOf(OcclusionQueryManager);
    });

    it('should return null for non-WebGL2 context', () => {
      // Mock WebGLRenderingContext class
      global.WebGLRenderingContext = class WebGLRenderingContext {};
      const webgl1Context = {};
      Object.setPrototypeOf(webgl1Context, WebGLRenderingContext.prototype);
      const instance = createOcclusionQueryManager(webgl1Context);
      expect(instance).toBeNull();
    });
  });
});

