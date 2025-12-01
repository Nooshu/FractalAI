import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('regl', () => ({
  default: vi.fn(() => ({ _gl: {} })),
}));

vi.mock('../../static/js/rendering/pixel-ratio.js', () => ({
  calculatePixelRatio: vi.fn(() => 1),
  updatePixelRatio: vi.fn(),
}));

import { initCanvasRenderer } from '../../static/js/rendering/canvas-renderer.js';
import { updatePixelRatio } from '../../static/js/rendering/pixel-ratio.js';

describe('initCanvasRenderer', () => {
  let canvas;
  let container;

  beforeEach(() => {
    // Stub ResizeObserver for jsdom environment
    global.ResizeObserver = class {
      constructor() {}
      observe() {}
      disconnect() {}
    };
    document.body.innerHTML = `
      <div id="container">
        <canvas id="fractal-canvas"></canvas>
      </div>
    `;
    canvas = document.getElementById('fractal-canvas');
    container = canvas.parentElement;
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    container.getBoundingClientRect = () => ({ width: 800, height: 600 });
  });

  it('throws if canvas is not found', async () => {
    document.body.innerHTML = '';
    await expect(initCanvasRenderer('missing-id')).rejects.toThrow();
  });

  it('initializes canvas and returns updateRendererSize', async () => {
    // Mock console.log to suppress WebGL capabilities logging during tests
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const getZoom = vi.fn(() => 2);
    const onResize = vi.fn();

    const { canvas: returnedCanvas, updateRendererSize } = await initCanvasRenderer('fractal-canvas', {
      getZoom,
      onResize,
    });

    expect(returnedCanvas).toBe(canvas);
    expect(typeof updateRendererSize).toBe('function');

    // Calling updateRendererSize should call updatePixelRatio with zoom
    updateRendererSize();
    expect(updatePixelRatio).toHaveBeenCalledWith(canvas, 2);

    consoleLogSpy.mockRestore();
  });
});
