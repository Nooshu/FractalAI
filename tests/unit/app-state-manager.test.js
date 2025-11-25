import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppStateManager, appState } from '../../static/js/core/app-state.js';
import { CONFIG } from '../../static/js/core/config.js';

describe('AppStateManager', () => {
  let state;

  beforeEach(() => {
    state = new AppStateManager();
  });

  it('initializes with default config values', () => {
    expect(state.getCurrentFractalType()).toBe(CONFIG.fractal.defaultType);
    const params = state.getParams();
    expect(params.iterations).toBe(CONFIG.rendering.defaultIterations);
    expect(params.colorScheme).toBe(CONFIG.colors.defaultScheme);
    expect(params.zoom).toBe(CONFIG.zoom.defaultZoom);
  });

  it('getters and setters proxy properties correctly', () => {
    state.setCanvas('canvas');
    state.setRegl('regl');
    state.setCurrentFractalType('julia');
    state.setNeedsRender(true);

    expect(state.getCanvas()).toBe('canvas');
    expect(state.getRegl()).toBe('regl');
    expect(state.getCurrentFractalType()).toBe('julia');
    expect(state.getNeedsRender()).toBe(true);
  });

  it('getGetters returns functions bound to instance', () => {
    const getters = state.getGetters();
    state.setCurrentFractalType('multibrot');
    expect(getters.getCurrentFractalType()).toBe('multibrot');
  });

  it('getSetters returns functions bound to instance', () => {
    const setters = state.getSetters();
    setters.setCurrentFractalType('burning-ship');
    expect(state.getCurrentFractalType()).toBe('burning-ship');
  });

  it('reset restores initial state', () => {
    state.setCurrentFractalType('julia');
    state.setNeedsRender(true);
    state.setIsDisplayingCached(true);
    state.setCurrentProgressiveIterations(999);

    state.reset();

    expect(state.getCurrentFractalType()).toBe(CONFIG.fractal.defaultType);
    expect(state.getNeedsRender()).toBe(false);
    expect(state.getIsDisplayingCached()).toBe(false);
    expect(state.getCurrentProgressiveIterations()).toBe(0);
  });

  it('cleanup clears frameCache and calls renderingEngine.cleanup', () => {
    const cleanupSpy = vi.fn();
    state.renderingEngine = { cleanup: cleanupSpy };

    // Fill frame cache
    state.frameCache.cache.set('key', { framebuffer: { destroy: vi.fn() }, timestamp: Date.now() });
    expect(state.frameCache.cache.size).toBe(1);

    state.cleanup();

    expect(state.frameCache.cache.size).toBe(0);
    expect(cleanupSpy).toHaveBeenCalled();
  });
});

describe('appState singleton (new AppStateManager)', () => {
  it('exports a singleton instance', () => {
    expect(appState).toBeInstanceOf(AppStateManager);
  });
});


