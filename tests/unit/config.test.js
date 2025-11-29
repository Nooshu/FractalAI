import { describe, it, expect } from 'vitest';
import { CONFIG } from '../../static/js/core/config.js';

describe('CONFIG', () => {
  it('should have all required top-level properties', () => {
    expect(CONFIG).toHaveProperty('rendering');
    expect(CONFIG).toHaveProperty('canvas');
    expect(CONFIG).toHaveProperty('zoom');
    expect(CONFIG).toHaveProperty('selection');
    expect(CONFIG).toHaveProperty('colors');
    expect(CONFIG).toHaveProperty('julia');
    expect(CONFIG).toHaveProperty('fractal');
    expect(CONFIG).toHaveProperty('performance');
  });

  it('should have correct rendering defaults', () => {
    expect(CONFIG.rendering.defaultIterations).toBe(125);
    expect(CONFIG.rendering.minIterations).toBe(10);
    expect(CONFIG.rendering.maxIterations).toBe(400);
    expect(CONFIG.rendering.cacheSize).toBe(10);
    expect(CONFIG.rendering.progressiveDelayMs).toBe(16);
    expect(CONFIG.rendering.resizeThrottleMs).toBe(100);
  });

  it('should have correct canvas defaults', () => {
    expect(CONFIG.canvas.defaultWidth).toBe(800);
    expect(CONFIG.canvas.defaultHeight).toBe(600);
    expect(CONFIG.canvas.basePixelRatio).toBe(1);
    expect(CONFIG.canvas.maxPixelRatio).toBe(4);
  });

  it('should have correct zoom defaults', () => {
    expect(CONFIG.zoom.defaultZoom).toBe(1);
    expect(CONFIG.zoom.zoomFactor).toBe(2.0);
    expect(CONFIG.zoom.zoomInFactor).toBe(1.1);
    expect(CONFIG.zoom.zoomOutFactor).toBe(0.9);
    expect(CONFIG.zoom.minZoom).toBe(0.1);
    expect(CONFIG.zoom.maxZoom).toBe(1e10);
  });

  it('should have correct color schemes', () => {
    expect(CONFIG.colors.defaultScheme).toBe('classic');
    expect(CONFIG.colors.schemes).toBeInstanceOf(Array);
    expect(CONFIG.colors.schemes.length).toBeGreaterThan(0);
    expect(CONFIG.colors.schemes).toContain('classic');
    expect(CONFIG.colors.schemes).toContain('fire');
    expect(CONFIG.colors.schemes).toContain('rainbow');
  });

  it('should have correct Julia defaults', () => {
    expect(CONFIG.julia.defaultC).toHaveProperty('x');
    expect(CONFIG.julia.defaultC).toHaveProperty('y');
    expect(typeof CONFIG.julia.defaultC.x).toBe('number');
    expect(typeof CONFIG.julia.defaultC.y).toBe('number');
  });

  it('should have correct fractal defaults', () => {
    expect(CONFIG.fractal.defaultType).toBe('mandelbrot');
  });
});
