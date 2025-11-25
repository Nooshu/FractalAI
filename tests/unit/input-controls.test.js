import { describe, it, expect, beforeEach } from 'vitest';
import { setupInputControls } from '../../static/js/input/controls.js';

describe('input controls module', () => {
  let canvas;
  let selectionBox;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="canvas-container">
        <canvas id="fractal-canvas"></canvas>
        <div id="selection-box"></div>
      </div>
    `;
    canvas = document.getElementById('fractal-canvas');
    selectionBox = document.getElementById('selection-box');
  });

  it('returns no-op cleanup if selection box missing', () => {
    // Remove selection box but keep canvas/container valid
    selectionBox.remove();
    const { cleanup } = setupInputControls(
      {
        getCanvas: () => canvas,
        getParams: () => ({}),
        getUpdateRendererSize: () => null,
      },
      {
        scheduleRender: () => {},
        updateCoordinateDisplay: () => {},
        renderFractalProgressive: () => {},
        zoomToSelection: () => {},
      }
    );
    expect(typeof cleanup).toBe('function');
  });

  it('attaches mouse event listeners to canvas', () => {
    const events = [];
    const originalAdd = canvas.addEventListener.bind(canvas);
    canvas.addEventListener = (type, listener, options) => {
      events.push(type);
      return originalAdd(type, listener, options);
    };

    const getters = {
      getCanvas: () => canvas,
      getParams: () => ({
        iterations: 125,
        zoom: 1,
        offset: { x: 0, y: 0 },
        xScale: 1,
        yScale: 1,
        juliaC: { x: 0, y: 0 },
        colorScheme: 'classic',
      }),
      getUpdateRendererSize: () => null,
    };

    const callbacks = {
      scheduleRender: () => {},
      updateCoordinateDisplay: () => {},
      renderFractalProgressive: () => {},
      zoomToSelection: () => {},
    };

    setupInputControls(getters, callbacks);

    expect(events).toContain('mousedown');
    expect(events).toContain('mousemove');
    expect(events).toContain('mouseleave');
    expect(events).toContain('wheel');
  });
});


