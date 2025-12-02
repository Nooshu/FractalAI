import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GPUTimer, createGPUTimer } from '../../static/js/rendering/gpu-timer.js';

describe('rendering/gpu-timer', () => {
  let mockGl;
  let mockCapabilities;
  let timer;

  beforeEach(() => {
    mockGl = {
      getParameter: vi.fn(),
      createQuery: vi.fn(() => ({})),
      deleteQuery: vi.fn(),
      getQueryParameter: vi.fn(() => false),
      ANY_SAMPLES_PASSED: 0x8C2F,
      QUERY_RESULT_AVAILABLE: 0x8867,
      QUERY_RESULT: 0x8866,
    };

    mockCapabilities = {
      features: {
        timerQuery: {
          webgl2: false,
          webgl1: false,
        },
      },
    };

    timer = new GPUTimer(mockGl, mockCapabilities);
  });

  describe('GPUTimer', () => {
    it('should initialize without timer extension', () => {
      expect(timer.isAvailable).toBe(false);
    });

    it('should check if GPU timing is available', () => {
      expect(timer.isGPUTimingAvailable()).toBe(false);
      timer.isAvailable = true;
      expect(timer.isGPUTimingAvailable()).toBe(true);
    });

    it('should return -1 for beginQuery when not available', () => {
      const queryId = timer.beginQuery('test');
      expect(queryId).toBe(-1);
    });

    it('should not end query when not available', () => {
      timer.endQuery(1);
      // Should not throw
      expect(true).toBe(true);
    });

    it('should poll queries and return empty array when not available', () => {
      const results = timer.pollQueries();
      expect(results).toEqual([]);
    });

    it('should get latest result', () => {
      const result = timer.getLatestResult();
      expect(result).toBeNull();
    });

    it('should dispose resources', () => {
      timer.dispose();
      expect(timer.isAvailable).toBe(false);
      expect(timer.timerExt).toBeNull();
    });
  });

  describe('createGPUTimer', () => {
    it('should create a timer instance', () => {
      const instance = createGPUTimer(mockGl, mockCapabilities);
      expect(instance).toBeInstanceOf(GPUTimer);
    });
  });
});

