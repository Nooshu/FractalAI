import { describe, it, expect } from 'vitest';
import { encodeFractalState } from '../../static/js/sharing/encoder.js';
import { decodeFractalState } from '../../static/js/sharing/decoder.js';

describe('encodeFractalState and decodeFractalState', () => {
  it('should round-trip encode and decode fractal state', () => {
    const testCases = [
      {
        type: 'mandelbrot',
        params: {
          colorScheme: 'classic',
          zoom: 1.0,
          iterations: 125,
          offset: { x: 0, y: 0 },
          xScale: 1.0,
          yScale: 1.0,
          juliaC: { x: 0, y: 0 },
        },
      },
      {
        type: 'julia',
        params: {
          colorScheme: 'fire',
          zoom: 5.5,
          iterations: 200,
          offset: { x: 1.5, y: -2.3 },
          xScale: 1.2,
          yScale: 0.8,
          juliaC: { x: 0.5, y: 0.3 },
        },
      },
      {
        type: 'multibrot-julia',
        params: {
          colorScheme: 'rainbow',
          zoom: 100.0,
          iterations: 500,
          offset: { x: -0.5, y: 0.7 },
          xScale: 0.9,
          yScale: 1.1,
          juliaC: { x: -0.7269, y: 0.1889 },
        },
      },
    ];

    for (const testCase of testCases) {
      const encoded = encodeFractalState(testCase.type, testCase.params);
      const decoded = decodeFractalState(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded.fractalType).toBe(testCase.type);
      expect(decoded.colorScheme).toBe(testCase.params.colorScheme);
      expect(decoded.zoom).toBeCloseTo(testCase.params.zoom, 4);
      expect(decoded.iterations).toBe(testCase.params.iterations);
      expect(decoded.offsetX).toBeCloseTo(testCase.params.offset.x, 5);
      expect(decoded.offsetY).toBeCloseTo(testCase.params.offset.y, 5);
      expect(decoded.xScale).toBeCloseTo(testCase.params.xScale, 2);
      expect(decoded.yScale).toBeCloseTo(testCase.params.yScale, 2);

      // Only check Julia parameters if it's a Julia-type fractal
      if (testCase.type === 'julia' || testCase.type === 'multibrot-julia' || testCase.type.includes('julia')) {
        if (testCase.params.juliaC) {
          expect(decoded.juliaCX).toBeCloseTo(testCase.params.juliaC.x, 5);
          expect(decoded.juliaCY).toBeCloseTo(testCase.params.juliaC.y, 5);
        }
      }
    }
  });

  it('should handle invalid encoded strings', () => {
    const decoded = decodeFractalState('invalid-seed!!!');
    expect(decoded).toBeNull();
  });

  it('should handle empty encoded strings', () => {
    const decoded = decodeFractalState('');
    expect(decoded).toBeNull();
  });

  it('should produce URL-safe strings', () => {
    const params = {
      colorScheme: 'classic',
      zoom: 1.0,
      iterations: 125,
      offset: { x: 0, y: 0 },
      xScale: 1.0,
      yScale: 1.0,
      juliaC: { x: 0, y: 0 },
    };
    const encoded = encodeFractalState('mandelbrot', params);
    // Should not contain +, /, or = characters
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
  });
});

