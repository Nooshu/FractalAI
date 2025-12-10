import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { decodeFractalState } from '../../static/js/sharing/decoder.js';

describe('sharing/decoder', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // Suppress expected error logs during tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('decodeFractalState', () => {
    it('should decode valid state string', () => {
      // Create a simple test state
      const state = {
        t: 'mandelbrot',
        c: 'classic',
        z: 2.5,
        i: 200,
        ox: 0.5,
        oy: -0.3,
        xs: 1.2,
        ys: 0.8,
      };
      const encoded = btoa(JSON.stringify(state))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const decoded = decodeFractalState(encoded);
      expect(decoded).toBeTruthy();
      expect(decoded.fractalType).toBe('mandelbrot');
      expect(decoded.colorScheme).toBe('classic');
      expect(decoded.zoom).toBe(2.5);
      expect(decoded.iterations).toBe(200);
    });

    it('should use default values for missing fields', () => {
      const state = {};
      const encoded = btoa(JSON.stringify(state))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const decoded = decodeFractalState(encoded);
      expect(decoded.fractalType).toBe('mandelbrot');
      expect(decoded.colorScheme).toBe('classic');
      expect(decoded.zoom).toBe(1);
      expect(decoded.iterations).toBe(125);
    });

    it('should handle URL-safe base64 with padding', () => {
      const state = { t: 'julia', z: 1.5 };
      let encoded = btoa(JSON.stringify(state))
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      const decoded = decodeFractalState(encoded);
      expect(decoded).toBeTruthy();
      expect(decoded.fractalType).toBe('julia');
    });

    it('should return null for invalid encoded string', () => {
      const decoded = decodeFractalState('invalid-base64!!!');
      expect(decoded).toBeNull();
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should return null for invalid JSON', () => {
      const invalidJson = btoa('not json')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      const decoded = decodeFractalState(invalidJson);
      expect(decoded).toBeNull();
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should decode julia parameters', () => {
      const state = {
        t: 'julia',
        jx: 0.5,
        jy: 0.3,
      };
      const encoded = btoa(JSON.stringify(state))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const decoded = decodeFractalState(encoded);
      expect(decoded.juliaCX).toBe(0.5);
      expect(decoded.juliaCY).toBe(0.3);
    });
  });
});

