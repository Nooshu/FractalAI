import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isValidInterestingView } from '../../static/js/fractals/random-view.js';

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
});

