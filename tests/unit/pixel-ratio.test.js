import { describe, it, expect, beforeEach } from 'vitest';
import { calculatePixelRatio, updatePixelRatio } from '../../static/js/rendering/pixel-ratio.js';
import { CONFIG } from '../../static/js/core/config.js';

describe('calculatePixelRatio', () => {
  beforeEach(() => {
    // Mock window.devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: 1,
    });
  });

  it('should calculate pixel ratio based on zoom', () => {
    const ratio = calculatePixelRatio(1.0);
    expect(ratio).toBeDefined();
    expect(typeof ratio).toBe('number');
    expect(ratio).toBeGreaterThan(0);
  });

  it('should use base pixel ratio for zoom 1', () => {
    const ratio = calculatePixelRatio(1.0);
    const expectedRatio =
      CONFIG.canvas.basePixelRatio * Math.min(Math.sqrt(1.0), CONFIG.canvas.maxPixelRatio);
    expect(ratio).toBe(expectedRatio);
  });

  it('should scale with zoom', () => {
    window.devicePixelRatio = 1;
    const ratio1 = calculatePixelRatio(1.0);
    const ratio4 = calculatePixelRatio(4.0);
    expect(ratio4).toBeGreaterThan(ratio1);
  });

  it('should cap at maxPixelRatio', () => {
    window.devicePixelRatio = 1;
    const maxRatio = calculatePixelRatio(1e10); // Very high zoom
    expect(maxRatio).toBeLessThanOrEqual(
      CONFIG.canvas.maxPixelRatio * CONFIG.canvas.basePixelRatio
    );
  });

  it('should use sqrt of zoom for scaling', () => {
    window.devicePixelRatio = 1;
    const ratio1 = calculatePixelRatio(1.0);
    const ratio4 = calculatePixelRatio(4.0);
    // ratio4 should be approximately 2 * ratio1 (sqrt(4) = 2)
    expect(ratio4).toBeCloseTo(ratio1 * 2, 1);
  });
});

describe('updatePixelRatio', () => {
  let mockCanvas;
  let mockContainer;

  beforeEach(() => {
    mockContainer = {
      getBoundingClientRect: () => ({ width: 800, height: 600 }),
      clientWidth: 800,
      clientHeight: 600,
    };
    mockCanvas = {
      parentElement: mockContainer,
      width: 0,
      height: 0,
      style: {
        width: '',
        height: '',
      },
    };

    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: 1,
    });
  });

  it('should update canvas dimensions', () => {
    updatePixelRatio(mockCanvas, 1.0);
    expect(mockCanvas.width).toBeGreaterThan(0);
    expect(mockCanvas.height).toBeGreaterThan(0);
  });

  it('should set canvas style dimensions', () => {
    updatePixelRatio(mockCanvas, 1.0);
    expect(mockCanvas.style.width).toBe('800px');
    expect(mockCanvas.style.height).toBe('600px');
  });

  it('should use container dimensions', () => {
    mockContainer.getBoundingClientRect = () => ({ width: 1200, height: 900 });
    updatePixelRatio(mockCanvas, 1.0);
    expect(mockCanvas.style.width).toBe('1200px');
    expect(mockCanvas.style.height).toBe('900px');
  });

  it('should fallback to clientWidth/clientHeight', () => {
    mockContainer.getBoundingClientRect = () => ({});
    mockContainer.clientWidth = 640;
    mockContainer.clientHeight = 480;
    updatePixelRatio(mockCanvas, 1.0);
    expect(mockCanvas.style.width).toBe('640px');
    expect(mockCanvas.style.height).toBe('480px');
  });

  it('should use default dimensions when container dimensions unavailable', () => {
    mockContainer.getBoundingClientRect = () => ({});
    mockContainer.clientWidth = 0;
    mockContainer.clientHeight = 0;
    updatePixelRatio(mockCanvas, 1.0);
    expect(mockCanvas.style.width).toBe(`${CONFIG.canvas.defaultWidth}px`);
    expect(mockCanvas.style.height).toBe(`${CONFIG.canvas.defaultHeight}px`);
  });

  it('should return early for null canvas', () => {
    expect(() => updatePixelRatio(null, 1.0)).not.toThrow();
  });

  it('should update dimensions based on zoom level', () => {
    window.devicePixelRatio = 1;
    updatePixelRatio(mockCanvas, 1.0);
    const width1 = mockCanvas.width;
    const height1 = mockCanvas.height;

    updatePixelRatio(mockCanvas, 4.0);
    const width4 = mockCanvas.width;
    const height4 = mockCanvas.height;

    // Higher zoom should result in higher pixel ratio, thus larger canvas
    expect(width4).toBeGreaterThan(width1);
    expect(height4).toBeGreaterThan(height1);
  });
});
