import { describe, it, expect, beforeEach } from 'vitest';
import { AppState, appState } from '../../static/js/core/state.js';
import { CONFIG } from '../../static/js/core/config.js';

describe('AppState', () => {
  let state;

  beforeEach(() => {
    state = new AppState();
  });

  it('should create a new AppState instance', () => {
    expect(state).toBeInstanceOf(AppState);
  });

  it('should initialize with default values', () => {
    expect(state.regl).toBeNull();
    expect(state.canvas).toBeNull();
    expect(state.drawFractal).toBeNull();
    expect(state.currentFractalModule).toBeNull();
    expect(state.isDisplayingCached).toBe(false);
    expect(state.needsRender).toBe(false);
    expect(state.renderScheduled).toBe(false);
    expect(state.isProgressiveRendering).toBe(false);
  });

  it('should initialize params with default values', () => {
    const params = state.getParams();
    expect(params.iterations).toBe(CONFIG.rendering.defaultIterations);
    expect(params.colorScheme).toBe(CONFIG.colors.defaultScheme);
    expect(params.juliaC.x).toBe(CONFIG.julia.defaultC.x);
    expect(params.juliaC.y).toBe(CONFIG.julia.defaultC.y);
    expect(params.zoom).toBe(CONFIG.zoom.defaultZoom);
    expect(params.center.x).toBe(0);
    expect(params.center.y).toBe(0);
    expect(params.offset.x).toBe(0);
    expect(params.offset.y).toBe(0);
    expect(params.xScale).toBe(1.0);
    expect(params.yScale).toBe(1.0);
  });

  it('should initialize with default fractal type', () => {
    expect(state.getFractalType()).toBe(CONFIG.fractal.defaultType);
  });

  it('should get and set fractal type', () => {
    state.setFractalType('julia');
    expect(state.getFractalType()).toBe('julia');
    
    state.setFractalType('mandelbrot');
    expect(state.getFractalType()).toBe('mandelbrot');
  });

  it('should get params', () => {
    const params = state.getParams();
    expect(params).toBeDefined();
    expect(typeof params).toBe('object');
  });

  it('should update params', () => {
    state.updateParams({ iterations: 200, zoom: 2.5 });
    const params = state.getParams();
    expect(params.iterations).toBe(200);
    expect(params.zoom).toBe(2.5);
    // Other params should remain unchanged
    expect(params.colorScheme).toBe(CONFIG.colors.defaultScheme);
  });

  it('should update nested params', () => {
    state.updateParams({ 
      juliaC: { x: 0.5, y: 0.3 },
      offset: { x: 1.0, y: 2.0 }
    });
    const params = state.getParams();
    expect(params.juliaC.x).toBe(0.5);
    expect(params.juliaC.y).toBe(0.3);
    expect(params.offset.x).toBe(1.0);
    expect(params.offset.y).toBe(2.0);
  });
});

describe('appState singleton', () => {
  it('should export a singleton instance', () => {
    expect(appState).toBeInstanceOf(AppState);
  });
});

