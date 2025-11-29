import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupInputControls } from '../../static/js/input/controls.js';

describe('input controls module', () => {
  let canvas;
  let selectionBox;
  let originalPointerEvent;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="canvas-container">
        <canvas id="fractal-canvas"></canvas>
        <div id="selection-box"></div>
      </div>
    `;
    canvas = document.getElementById('fractal-canvas');
    selectionBox = document.getElementById('selection-box');

    // Store original PointerEvent and ensure it's undefined for mouse event fallback testing
    originalPointerEvent = window.PointerEvent;
    if (window.PointerEvent) {
      delete window.PointerEvent;
    }
  });

  // Restore PointerEvent after each test
  afterEach(() => {
    if (originalPointerEvent) {
      window.PointerEvent = originalPointerEvent;
    }
  });

  it('returns no-op cleanup if selection box missing', () => {
    // Silence expected warning from missing DOM elements in this scenario
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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
    expect(warnSpy).toHaveBeenCalledWith('Canvas or selection box not found');

    warnSpy.mockRestore();
  });

  it('attaches mouse event listeners to canvas (fallback when PointerEvent unavailable)', () => {
    const events = [];
    const originalAdd = canvas.addEventListener.bind(canvas);
    canvas.addEventListener = (type, listener, options) => {
      events.push(type);
      return originalAdd(type, listener, options);
    };

    // Also track window events
    const windowEvents = [];
    const originalWindowAdd = window.addEventListener.bind(window);
    window.addEventListener = (type, listener, options) => {
      windowEvents.push(type);
      return originalWindowAdd(type, listener, options);
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

    // When PointerEvent is unavailable, should use mouse events
    expect(events).toContain('mousedown');
    expect(events).toContain('mousemove');
    expect(events).toContain('mouseleave');
    expect(events).toContain('wheel');
    expect(windowEvents).toContain('mousemove');
    expect(windowEvents).toContain('mouseup');
  });

  it('attaches pointer event listeners when PointerEvent is available', () => {
    // Mock PointerEvent as available
    window.PointerEvent = class PointerEvent {};

    const events = [];
    const originalAdd = canvas.addEventListener.bind(canvas);
    canvas.addEventListener = (type, listener, options) => {
      events.push(type);
      return originalAdd(type, listener, options);
    };

    const windowEvents = [];
    const originalWindowAdd = window.addEventListener.bind(window);
    window.addEventListener = (type, listener, options) => {
      windowEvents.push(type);
      return originalWindowAdd(type, listener, options);
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

    // When PointerEvent is available, should use pointer events
    expect(events).toContain('pointerdown');
    expect(events).toContain('pointermove');
    expect(events).toContain('pointerleave');
    expect(events).toContain('wheel');
    expect(windowEvents).toContain('pointermove');
    expect(windowEvents).toContain('pointerup');

    // Should not use mouse events when pointer events are available
    expect(events).not.toContain('mousedown');
  });
});
