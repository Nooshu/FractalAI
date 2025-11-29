import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../static/js/ui/loading-bar.js', () => ({
  showLoadingBar: vi.fn(),
  hideLoadingBar: vi.fn(),
}));

vi.mock('../../static/js/rendering/pixel-ratio.js', () => ({
  updatePixelRatio: vi.fn(),
}));

vi.mock('../../static/js/performance/fps-tracker.js', () => ({
  incrementFrameCount: vi.fn(),
}));

vi.mock('../../static/js/fractals/utils.js', () => ({
  isLineBasedFractal: vi.fn(() => false),
}));

import { RenderingEngine } from '../../static/js/rendering/engine.js';
import { ProgressiveRenderer } from '../../static/js/rendering/progressive.js';
import { Renderer } from '../../static/js/rendering/renderer.js';
import { isLineBasedFractal } from '../../static/js/fractals/utils.js';

describe('Renderer', () => {
  let frameCache;
  let state;
  let regl;
  let canvas;

  beforeEach(() => {
    frameCache = {
      getCachedFrame: vi.fn(() => null),
      cacheFrame: vi.fn(),
    };

    state = {
      getFractalType: () => 'mandelbrot',
      getParams: () => ({ zoom: 1 }),
      drawFractal: null,
      needsRender: false,
      isDisplayingCached: false,
      cachedDrawCommand: null,
    };

    regl = {
      clear: vi.fn(),
      framebuffer: vi.fn(() => ({
        use: (fn) => fn(),
      })),
      texture: vi.fn(() => ({})),
    };

    canvas = { width: 800, height: 600 };

    global.requestAnimationFrame = (_cb) => {
      // Do not invoke cb here to avoid deep recursion in the animation loop
      return 1;
    };
  });

  it('calls fractal render and caches frame', () => {
    const renderer = new Renderer(state, frameCache);

    const drawFn = vi.fn();
    const fractalModule = {
      render: vi.fn(() => drawFn),
    };

    renderer.render(regl, canvas, fractalModule, { zoom: 1 });

    expect(fractalModule.render).toHaveBeenCalled();
    expect(drawFn).toHaveBeenCalled();
  });
});

describe('ProgressiveRenderer', () => {
  let state;
  let frameCache;
  let renderer;
  let regl;
  let canvas;
  let fractalModule;
  let params;

  beforeEach(() => {
    state = {
      getFractalType: () => 'mandelbrot',
      currentProgressiveIterations: 0,
      targetIterations: 0,
      isProgressiveRendering: false,
      isDisplayingCached: false,
      cachedDrawCommand: null,
      drawFractal: null,
      needsRender: false,
    };
    frameCache = {
      getCachedFrame: vi.fn(() => null),
    };
    renderer = {
      render: vi.fn(),
      displayCachedFrame: vi.fn(),
      cacheCurrentFrame: vi.fn(),
    };
    regl = {
      clear: vi.fn(),
    };
    canvas = { width: 800, height: 600 };
    fractalModule = {
      render: vi.fn(() => vi.fn()),
    };
    params = {
      iterations: 100,
      zoom: 1,
      offset: { x: 0, y: 0 },
      xScale: 1,
      yScale: 1,
      juliaC: { x: 0, y: 0 },
      colorScheme: 'classic',
    };

    global.requestAnimationFrame = (cb) => {
      cb();
      return 1;
    };
    global.cancelAnimationFrame = vi.fn();
  });

  it('falls back to standard renderer for line-based fractals', () => {
    isLineBasedFractal.mockReturnValue(true);
    const progressive = new ProgressiveRenderer(state, frameCache, renderer);

    progressive.render(regl, canvas, fractalModule, params);

    expect(renderer.render).toHaveBeenCalled();
  });

  it('creates progressive draw command when not cached', () => {
    isLineBasedFractal.mockReturnValue(false);
    const progressive = new ProgressiveRenderer(state, frameCache, renderer);

    progressive.render(regl, canvas, fractalModule, params, 20);

    expect(fractalModule.render).toHaveBeenCalled();
  });
});

describe('RenderingEngine', () => {
  let getters;
  let setters;
  let frameCache;
  let engine;

  beforeEach(() => {
    getters = {
      getCurrentFractalModule: vi.fn(() => ({})),
      getCurrentFractalType: vi.fn(() => 'mandelbrot'),
      getParams: vi.fn(() => ({
        iterations: 100,
        zoom: 1,
        offset: { x: 0, y: 0 },
        xScale: 1,
        yScale: 1,
        juliaC: { x: 0, y: 0 },
        colorScheme: 'classic',
      })),
      getRegl: vi.fn(() => ({ clear: vi.fn(), framebuffer: vi.fn(), texture: vi.fn() })),
      getCanvas: vi.fn(() => ({ width: 800, height: 600 })),
      getDrawFractal: vi.fn(() => null),
      getNeedsRender: vi.fn(() => false),
      getIsProgressiveRendering: vi.fn(() => false),
      getIsDisplayingCached: vi.fn(() => false),
      getCachedDrawCommand: vi.fn(() => null),
      getCurrentProgressiveIterations: vi.fn(() => 0),
      getTargetIterations: vi.fn(() => 100),
      getIsLoading: vi.fn(() => false),
    };

    setters = {
      setDrawFractal: vi.fn(),
      setNeedsRender: vi.fn(),
      setIsProgressiveRendering: vi.fn(),
      setIsDisplayingCached: vi.fn(),
      setCachedDrawCommand: vi.fn(),
      setCurrentProgressiveIterations: vi.fn(),
      setTargetIterations: vi.fn(),
    };

    frameCache = {
      getCachedFrame: vi.fn(() => null),
      cacheFrame: vi.fn(),
    };

    global.requestAnimationFrame = (_cb) => {
      // For engine animation loop tests, just return an id without invoking cb
      return 1;
    };
    global.cancelAnimationFrame = vi.fn();

    engine = new RenderingEngine(getters, setters, frameCache);
  });

  it('schedules a render via scheduleRender()', () => {
    const renderSpy = vi.spyOn(engine, 'renderFractalProgressive').mockImplementation(() => {});

    // For this test, invoke the scheduled callback immediately
    const originalRaf = global.requestAnimationFrame;
    global.requestAnimationFrame = (cb) => {
      cb();
      return 1;
    };

    engine.scheduleRender();

    expect(renderSpy).toHaveBeenCalled();

    global.requestAnimationFrame = originalRaf;
  });

  it('can start and stop animation loop', () => {
    engine.startAnimation();
    expect(engine.animationFrameId).not.toBeNull();

    engine.stopAnimation();
    expect(engine.animationFrameId).toBeNull();
  });
});
