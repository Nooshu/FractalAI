import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isValidInterestingView,
  removeDuplicatePoints,
  generateRandomInterestingPoint,
  getRandomInterestingView,
} from '../../static/js/fractals/random-view.js';

describe('fractals/random-view', () => {
  let mockGetParams, mockGetCanvas;

  beforeEach(() => {
    mockGetParams = vi.fn(() => ({
      iterations: 100,
      xScale: 1.0,
      yScale: 1.0,
      juliaC: { x: 0, y: 0 },
    }));

    mockGetCanvas = vi.fn(() => ({
      width: 800,
      height: 600,
    }));
  });

  describe('isValidInterestingView', () => {
    it('should return true for geometric fractals', () => {
      const result = isValidInterestingView(
        { x: 0, y: 0 },
        1,
        'sierpinski',
        mockGetParams,
        mockGetCanvas
      );
      expect(result).toBe(true);
    });

    it('should return true for dragon curves', () => {
      const result = isValidInterestingView(
        { x: 0, y: 0 },
        1,
        'heighway-dragon',
        mockGetParams,
        mockGetCanvas
      );
      expect(result).toBe(true);
    });

    it('should validate mandelbrot views', () => {
      const result = isValidInterestingView(
        { x: -0.75, y: 0.1 },
        50,
        'mandelbrot',
        mockGetParams,
        mockGetCanvas
      );
      expect(typeof result).toBe('boolean');
    });

    it('should return false for mandelbrot views too far from origin at low zoom', () => {
      const result = isValidInterestingView(
        { x: 3, y: 3 },
        1,
        'mandelbrot',
        mockGetParams,
        mockGetCanvas
      );
      expect(result).toBe(false);
    });
  });

  describe('removeDuplicatePoints', () => {
    it('should remove duplicate points', () => {
      const locations = [
        { x: 0.5, y: 0.5, zoom: 1 },
        { x: 0.5, y: 0.5, zoom: 1 },
        { x: 1.0, y: 1.0, zoom: 2 },
      ];

      const generateRandom = vi.fn(() => ({ x: 0.3, y: 0.3, zoom: 1.5 }));

      const result = removeDuplicatePoints(locations, 'mandelbrot', generateRandom);
      expect(result.length).toBe(3);
      expect(generateRandom).toHaveBeenCalled();
    });

    it('should preserve unique points', () => {
      const locations = [
        { x: 0.5, y: 0.5, zoom: 1 },
        { x: 1.0, y: 1.0, zoom: 2 },
      ];

      const generateRandom = vi.fn(() => ({ x: 0.3, y: 0.3, zoom: 1.5 }));

      const result = removeDuplicatePoints(locations, 'mandelbrot', generateRandom);
      expect(result.length).toBe(2);
      expect(generateRandom).not.toHaveBeenCalled();
    });
  });

  describe('generateRandomInterestingPoint', () => {
    it('should generate point for mandelbrot', () => {
      const point = generateRandomInterestingPoint('mandelbrot', new Set());
      expect(point).toHaveProperty('x');
      expect(point).toHaveProperty('y');
      expect(point).toHaveProperty('zoom');
      expect(point.x).toBeGreaterThanOrEqual(-2);
      expect(point.x).toBeLessThanOrEqual(0.5);
    });

    it('should generate point for julia', () => {
      const point = generateRandomInterestingPoint('julia', new Set());
      expect(point).toHaveProperty('x');
      expect(point).toHaveProperty('y');
      expect(point).toHaveProperty('zoom');
    });

    it('should respect exclude set', () => {
      const excludeSet = new Set(['0.500000,0.500000,1.00']);
      const point = generateRandomInterestingPoint('mandelbrot', excludeSet);
      const key = `${point.x.toFixed(6)},${point.y.toFixed(6)},${point.zoom.toFixed(2)}`;
      expect(excludeSet.has(key)).toBe(false);
    });
  });

  describe('getRandomInterestingView', () => {
    it('should return view for fractal with interesting points', () => {
      const mockModule = {
        config: {
          interestingPoints: [
            { x: 0, y: 0, zoom: 1 },
            { x: 0.5, y: 0.5, zoom: 2 },
          ],
        },
      };

      const getters = {
        getCurrentFractalType: () => 'mandelbrot',
        getCurrentFractalModule: () => mockModule,
        getParams: mockGetParams,
        getCanvas: mockGetCanvas,
      };

      const view = getRandomInterestingView(getters);
      expect(view).toHaveProperty('offset');
      expect(view).toHaveProperty('zoom');
      expect(view.offset).toHaveProperty('x');
      expect(view.offset).toHaveProperty('y');
    });

    it('should handle fractals without config', () => {
      const getters = {
        getCurrentFractalType: () => 'unknown-fractal',
        getCurrentFractalModule: () => null,
        getParams: mockGetParams,
        getCanvas: mockGetCanvas,
      };

      const view = getRandomInterestingView(getters);
      expect(view).toHaveProperty('offset');
      expect(view).toHaveProperty('zoom');
    });
  });
});

